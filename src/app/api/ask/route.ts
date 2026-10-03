import { llmJSON, llmProvider } from "@/lib/llm";
import { corpusContext, kbContext, RULES } from "@/lib/prompts";
import { resolver } from "@/lib/store";
import type { Cite } from "@/lib/types";

export async function POST(req: Request) {
  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) return Response.json({ error: "Empty question" }, { status: 400 });
  if (!llmProvider()) {
    return Response.json({ error: "No LLM key configured. Add ANTHROPIC_API_KEY (or OPENAI_API_KEY + LLM_MODEL) to .env.local. All other pages and evidence work without it." }, { status: 503 });
  }
  const system = `You are Mémoire 360, the operational memory of project NOVA (fictional).\n${RULES}\n
Answer ONLY from the knowledge base and corpus segments below. Each segment starts with [[SOURCE_ID#locator]].
Every factual sentence needs a citation {"src": SOURCE_ID, "quote": exact verbatim French text copied from that segment (short, 3-20 words)}.
Reply in the language of the question; keep quotes in French.
Return JSON only: {"answer": string, "citations": [{"src": string, "quote": string}], "missing": [string], "recommendations": [string]}`;
  const user = `KNOWLEDGE BASE (curated, verified):\n${kbContext()}\n\nCORPUS SEGMENTS:\n${corpusContext()}\n\nQUESTION: ${question}`;
  try {
    const out = (await llmJSON(system, user)) as { answer: string; citations?: Cite[]; missing?: string[]; recommendations?: string[] };
    const r = resolver();
    const cites = (out.citations ?? []).map(r);
    const verified = cites.filter((c) => c.verified);
    return Response.json({
      answer: out.answer, citations: verified, dropped: cites.length - verified.length,
      missing: out.missing ?? [], recommendations: out.recommendations ?? [],
      status: verified.length === 0 ? "none" : verified.length === cites.length ? "full" : "partial",
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
