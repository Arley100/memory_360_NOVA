// The single "ask the project" pipeline, shared by the web app (/api/ask) and the evaluation (npm run eval),
// so the evaluation measures exactly what the jury sees.
import { lastUsage, llmJSON, type LlmUsage } from "./llm";
import { CITATION_FORMAT, corpusContext, kbContext, RULES } from "./prompts";
import { resolver, updates } from "./store";
import type { Cite, ResolvedCite } from "./types";
import { plain } from "./text";

export interface AskResult {
  answer: string;
  citations: ResolvedCite[];
  dropped: number;
  missing: string[];
  recommendations: string[];
  status: "full" | "partial" | "none";
  usage: LlmUsage | null;
}

export const ASK_SYSTEM = `You are Mémoire 360, the operational memory of project NOVA (fictional).\n${RULES}\n
Answer ONLY from the material provided above (corpus segments, and the knowledge base when present). Each segment starts with [[SOURCE_ID#locator]].
${CITATION_FORMAT}
Reply in the language of the question; keep quotes in French. Plain text only: no Markdown, no asterisks, no bullet symbols. Be precise and nuanced: name dates, amounts, owners,
and whether something is a proposal, a decision, a delivery or a validation.
If the corpus does not contain the answer, say so plainly and put what is missing in "missing".
Return JSON only: {"answer": string, "citations": [{"src": string, "loc": string, "quote": string}], "missing": [string], "recommendations": [string]}`;

export type ContextMode = "full" | "corpus";
// Default: raw corpus only (the model's own analysis). ASK_CONTEXT=full adds the active knowledge base.
export const contextMode = (m?: string): ContextMode => ((m ?? process.env.ASK_CONTEXT) === "full" ? "full" : "corpus");

// "full": curated knowledge base + corpus. "corpus": raw files only, so every answer is the model's own analysis.
export async function askContext(mode: ContextMode = contextMode()): Promise<string> {
  const ups = await updates();
  if (mode === "corpus") {
    const changes = ups.length ? `\n\nPUBLISHED UPDATES (newer information):\n${JSON.stringify(ups.map((u) => u.cs))}` : "";
    return `CORPUS SEGMENTS (all project files, reference date 2026-09-30 09:00):\n${await corpusContext(ups)}${changes}`;
  }
  return `KNOWLEDGE BASE (curated, verified):\n${await kbContext(ups)}\n\nCORPUS SEGMENTS:\n${await corpusContext(ups)}`;
}

export type AskStage = { stage: "read" | "think" | "verify"; detail?: string };

export async function askProject(question: string, opts: { model?: string; effort?: string; context?: string; onStage?: (s: AskStage) => void } = {}): Promise<AskResult> {
  const context = await askContext(contextMode(opts.context));
  opts.onStage?.({ stage: "think" });
  const out = (await llmJSON({ task: "ask", system: ASK_SYSTEM, context, user: `QUESTION: ${question}`, model: opts.model, effort: opts.effort })) as {
    answer?: string; citations?: Cite[]; missing?: string[]; recommendations?: string[];
  };
  const usage = lastUsage;
  opts.onStage?.({ stage: "verify", detail: `${(out.citations ?? []).length} quotes` });
  const r = await resolver();
  const cites = (out.citations ?? []).map(r);
  const verified = cites.filter((c) => c.verified);
  return {
    answer: plain(out.answer),
    citations: verified,
    dropped: cites.length - verified.length,
    missing: (out.missing ?? []).map(plain),
    recommendations: (out.recommendations ?? []).map(plain),
    status: verified.length === 0 ? "none" : verified.length === cites.length ? "full" : "partial",
    usage,
  };
}
