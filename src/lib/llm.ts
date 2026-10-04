// Provider-agnostic LLM adapter. Server-side only; the key never reaches the browser.
//
// Anthropic (recommended):  ANTHROPIC_API_KEY
//   Per-task models/effort (optional): LLM_MODEL_ASK, LLM_MODEL_UPDATE, LLM_MODEL_VISION,
//   LLM_EFFORT_ASK, LLM_EFFORT_UPDATE, LLM_EFFORT_VISION (low | medium | high), LLM_CACHE_TTL (5m | 1h)
// OpenAI-compatible:        OPENAI_API_KEY + LLM_MODEL (+ OPENAI_BASE_URL)
//
// Notes for current Claude models (5.x): temperature/top_p/top_k are rejected (400), thinking is
// adaptive and controlled with output_config.effort, and thinking counts toward max_tokens.
import type { Transcription } from "./ingest";

export type Task = "ask" | "update" | "vision";
type Img = { data: Buffer; mime: string };

const DEFAULT_MODEL: Record<Task, string> = { ask: "claude-sonnet-5-5", update: "claude-opus-5-5", vision: "claude-sonnet-5-5" };
const DEFAULT_EFFORT: Record<Task, string> = { ask: "medium", update: "medium", vision: "low" };
const TIMEOUT_MS: Record<Task, number> = { ask: 90_000, update: 180_000, vision: 60_000 };

export function llmProvider(): "anthropic" | "openai" | null {
  const forced = process.env.LLM_PROVIDER;
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function modelFor(task: Task): string {
  const env = process.env[`LLM_MODEL_${task.toUpperCase()}`];
  if (env) return env;
  if (llmProvider() === "openai") return process.env.LLM_MODEL ?? "";
  return process.env.LLM_MODEL || DEFAULT_MODEL[task];
}

export function effortFor(task: Task): string {
  return process.env[`LLM_EFFORT_${task.toUpperCase()}`] || DEFAULT_EFFORT[task];
}

// Retry transient failures (network blip, rate limit, overload) so one hiccup never breaks a live answer.
async function fetchRetry(url: string, init: RequestInit, tries = 3): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      if (![429, 500, 502, 503, 504, 529].includes(res.status) || i === tries - 1) return res;
      last = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      last = e;
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw last;
}

export interface LlmUsage { task: Task; model: string; ms: number; input: number; cacheWrite: number; cacheRead: number; output: number }
export let lastUsage: LlmUsage | null = null;

function extractJSON(text: string): unknown {
  const t = text.replace(/```json|```/g, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Le modèle n’a pas renvoyé de JSON");
  return JSON.parse(t.slice(start, end + 1));
}

export interface LlmRequest {
  task: Task;
  system: string;    // task instructions (small, changes per task)
  context?: string;  // large shared context (corpus + knowledge base): cached by the provider
  user: string;      // the question or the new file
  images?: Img[];
  maxTokens?: number;
  model?: string;   // override the per-task model (evaluation)
  effort?: string;  // override the per-task effort (evaluation)
  signal?: AbortSignal;
}

export async function llmJSON(req: LlmRequest): Promise<unknown> {
  const provider = llmProvider();
  if (!provider) throw new Error("Aucun fournisseur d’IA configuré");
  const model = req.model || modelFor(req.task);
  const started = Date.now();
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  req.signal?.addEventListener("abort", abort, { once: true });
  if (req.signal?.aborted) ctrl.abort();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS[req.task]);
  try {
    if (provider === "anthropic") {
      const cache: Record<string, string> = { type: "ephemeral" };
      if (process.env.LLM_CACHE_TTL === "1h") cache.ttl = "1h";
      // Shared context first (cached prefix, identical for every task), then task instructions.
      const system = [
        ...(req.context ? [{ type: "text", text: req.context, cache_control: cache }] : []),
        { type: "text", text: req.system },
      ];
      const res = await fetchRetry(`${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 16000, // thinking counts toward this limit
          output_config: { effort: req.effort || effortFor(req.task) },
          system,
          messages: [{
            role: "user",
            content: [
              ...(req.images ?? []).map((i) => ({ type: "image", source: { type: "base64", media_type: i.mime, data: i.data.toString("base64") } })),
              { type: "text", text: req.user },
            ],
          }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      const u = data.usage ?? {};
      lastUsage = { task: req.task, model, ms: Date.now() - started, input: u.input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0 };
      console.log(`[llm] ${req.task} ${model} ${lastUsage.ms}ms in=${lastUsage.input} cacheWrite=${lastUsage.cacheWrite} cacheRead=${lastUsage.cacheRead} out=${lastUsage.output}`);
      if (data.stop_reason === "max_tokens") throw new Error("Réponse interrompue (max_tokens). Réduisez l’effort ou augmentez maxTokens.");
      const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
      return extractJSON(text);
    }

    // OpenAI-compatible providers. No temperature: many current reasoning models reject it.
    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const res = await fetchRetry(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${req.context ?? ""}\n\n${req.system}` },
          {
            role: "user",
            content: [
              { type: "text", text: req.user },
              ...(req.images ?? []).map((i) => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.data.toString("base64")}` } })),
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM API ${res.status}: ${(await res.text()).slice(0, 400)}`);
    const data = await res.json();
    const u = data.usage ?? {};
    lastUsage = { task: req.task, model, ms: Date.now() - started, input: u.prompt_tokens ?? 0, cacheWrite: 0, cacheRead: u.prompt_tokens_details?.cached_tokens ?? 0, output: u.completion_tokens ?? 0 };
    console.log(`[llm] ${req.task} ${model} ${lastUsage.ms}ms in=${lastUsage.input} out=${lastUsage.output}`);
    return extractJSON(data.choices?.[0]?.message?.content ?? "");
  } catch (e) {
    if (req.signal?.aborted) throw new DOMException("Génération arrêtée.", "AbortError");
    if ((e as Error).name === "AbortError") throw new Error(`Le modèle a dépassé ${TIMEOUT_MS[req.task] / 1000}s (${req.task}). Réessayez ou passez en mode manuel.`);
    throw e;
  } finally {
    clearTimeout(timer);
    req.signal?.removeEventListener("abort", abort);
  }
}

export async function visionTranscribe(buf: Buffer, mime: string): Promise<Transcription | null> {
  if (!llmProvider()) return null;
  const out = (await llmJSON({
    task: "vision",
    system: "Transcris exactement les captures du projet NOVA. Ne déduis jamais ce qui n’est pas visible. Conserve chaque texte source mot pour mot dans sa langue d’origine, avec ses accents. Rédige uniquement la description ajoutée en français.",
    user: `Renvoie uniquement du JSON en conservant ces clés : {"header": texte (en-tête de l’application, par exemple version/compilation/environnement), "title": texte,
"rows": [texte] (chaque ligne ou élément visible, dans l’ordre ; pour les tableaux : "a | b | c" ; pour les paires : "libellé : valeur"),
"notes": [texte] (annotations, notes rouges, observations qualité, mot pour mot), "description": texte (1 à 2 phrases neutres en français)}`,
    images: [{ data: buf, mime }],
    maxTokens: 8000,
  })) as Transcription;
  return { header: out.header, title: out.title, rows: out.rows ?? [], notes: out.notes ?? [], description: out.description };
}
