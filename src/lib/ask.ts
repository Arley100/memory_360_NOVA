// The single "ask the project" pipeline, shared by the web app (/api/ask) and the evaluation (npm run eval),
// so the evaluation measures exactly what the jury sees.
import { lastUsage, llmJSON, type LlmUsage } from "./llm";
import { CITATION_FORMAT, corpusContext, kbContext, RULES } from "./prompts";
import { resolver, updates } from "./store";
import type { Cite, ResolvedCite } from "./types";

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
Answer ONLY from the knowledge base and corpus segments provided above. Each segment starts with [[SOURCE_ID#locator]].
${CITATION_FORMAT}
Reply in the language of the question; keep quotes in French. Be precise and nuanced: name dates, amounts, owners,
and whether something is a proposal, a decision, a delivery or a validation.
If the corpus does not contain the answer, say so plainly and put what is missing in "missing".
Return JSON only: {"answer": string, "citations": [{"src": string, "loc": string, "quote": string}], "missing": [string], "recommendations": [string]}`;

export async function askContext(): Promise<string> {
  const ups = await updates();
  return `KNOWLEDGE BASE (curated, verified):\n${await kbContext(ups)}\n\nCORPUS SEGMENTS:\n${await corpusContext(ups)}`;
}

export async function askProject(question: string, opts: { model?: string; effort?: string } = {}): Promise<AskResult> {
  const out = (await llmJSON({ task: "ask", system: ASK_SYSTEM, context: await askContext(), user: `QUESTION: ${question}`, ...opts })) as {
    answer?: string; citations?: Cite[]; missing?: string[]; recommendations?: string[];
  };
  const usage = lastUsage;
  const r = await resolver();
  const cites = (out.citations ?? []).map(r);
  const verified = cites.filter((c) => c.verified);
  return {
    answer: out.answer ?? "",
    citations: verified,
    dropped: cites.length - verified.length,
    missing: out.missing ?? [],
    recommendations: out.recommendations ?? [],
    status: verified.length === 0 ? "none" : verified.length === cites.length ? "full" : "partial",
    usage,
  };
}
