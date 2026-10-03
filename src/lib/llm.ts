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
  if (start < 0 || end < 0) throw new Error("The model did not return JSON");
  return JSON.parse(t.slice(start, end + 1));
}

export interface LlmRequest {
  task: Task;
  system: string;    // task instructions (small, changes per task)
  context?: string;  // large shared context (corpus + knowledge base): cached by the provider
  user: string;      // the question or the new file
  images?: Img[];
  maxTokens?: number;
}

export async function llmJSON(req: LlmRequest): Promise<unknown> {
  const provider = llmProvider();
  if (!provider) throw new Error("No LLM key configured");
  const model = modelFor(req.task);
  const started = Date.now();
  const ctrl = new AbortController();
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
      const res = await fetchRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 16000, // thinking counts toward this limit
          output_config: { effort: effortFor(req.task) },
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
      if (data.stop_reason === "max_tokens") throw new Error("The answer was cut off (max_tokens). Lower the effort level or raise maxTokens.");
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
    if ((e as Error).name === "AbortError") throw new Error(`The model took longer than ${TIMEOUT_MS[req.task] / 1000}s (${req.task}). Try again or switch to manual mode.`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function visionTranscribe(buf: Buffer, mime: string): Promise<Transcription | null> {
  if (!llmProvider()) return null;
  const out = (await llmJSON({
    task: "vision",
    system: "You transcribe screenshots from project NOVA exactly. Never infer anything that is not visible. Keep French text verbatim with accents.",
    user: `Return JSON only: {"header": string (app header line, e.g. version/build/environment), "title": string,
"rows": [string] (each visible row or list item in order; for tables use "a | b | c"; for label/value use "label : value"),
"notes": [string] (annotations, red notes, QA observations, verbatim), "description": string (1-2 neutral sentences in English)}`,
    images: [{ data: buf, mime }],
    maxTokens: 8000,
  })) as Transcription;
  return { header: out.header, title: out.title, rows: out.rows ?? [], notes: out.notes ?? [], description: out.description };
}
