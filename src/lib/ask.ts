// The single "ask the project" pipeline, shared by the web app (/api/ask) and the evaluation (npm run eval),
// so the evaluation measures exactly what the jury sees.
import { lastUsage, llmJSON, type LlmUsage } from "./llm";
import { CITATION_FORMAT, corpusContext, kbContext, RULES } from "./prompts";
import { resolver, updates, type Update } from "./store";
import type { Cite, ResolvedCite } from "./types";
import { plain } from "./text";

export type AskStage = { stage: "think" | "verify"; detail?: string };

export interface AskResult {
  answer: string;
  citations: ResolvedCite[];
  dropped: number;
  missing: string[];
  recommendations: string[];
  status: "full" | "partial" | "none";
  usage: LlmUsage | null;
}

export const ASK_SYSTEM = `Tu es Mémoire 360, la mémoire opérationnelle du projet fictif NOVA.\n${RULES}\n
Réponds UNIQUEMENT à partir des documents fournis ci-dessus (passages du corpus et base de connaissances lorsqu’elle est présente). Chaque passage commence par [[SOURCE_ID#locator]].
${CITATION_FORMAT}
Rédige toujours la réponse, les éléments manquants et les recommandations en français, quelle que soit la langue de la question. Conserve les citations mot pour mot dans leur langue d’origine. Texte brut uniquement : sans Markdown, astérisques ni puces. Sois précis et nuancé : indique les dates, montants, responsables
et la distinction entre proposition, décision, livraison et validation.
Si le corpus ne contient pas la réponse, dis-le clairement et indique ce qui manque dans "missing".
Renvoie uniquement du JSON en conservant ces clés : {"answer": string, "citations": [{"src": string, "loc": string, "quote": string}], "missing": [string], "recommendations": [string]}`;

export type ContextMode = "full" | "corpus";
// Default: raw corpus only (the model's own analysis). ASK_CONTEXT=full adds the active knowledge base.
export const contextMode = (m?: string): ContextMode => ((m ?? process.env.ASK_CONTEXT) === "full" ? "full" : "corpus");

// "full": curated knowledge base + corpus. "corpus": raw files only, so every answer is the model's own analysis.
export async function askContext(mode: ContextMode = contextMode(), snapshot?: Update[]): Promise<string> {
  const ups = snapshot ?? await updates();
  if (mode === "corpus") {
    const changes = ups.length ? `\n\nMISES À JOUR PUBLIÉES (informations plus récentes) :\n${JSON.stringify(ups.map((u) => u.cs))}` : "";
    return `PASSAGES DU CORPUS (tous les fichiers du projet, date de référence 2026-09-30 09:00) :\n${await corpusContext(ups)}${changes}`;
  }
  return `BASE DE CONNAISSANCES (préparée et vérifiée) :\n${await kbContext(ups)}\n\nPASSAGES DU CORPUS :\n${await corpusContext(ups)}`;
}

export async function askProject(question: string, opts: { model?: string; effort?: string; context?: string; updates?: Update[]; onStage?: (stage: AskStage) => void } = {}): Promise<AskResult> {
  const snapshot = opts.updates ?? await updates();
  const context = await askContext(contextMode(opts.context), snapshot);
  opts.onStage?.({ stage: "think" });
  const out = (await llmJSON({ task: "ask", system: ASK_SYSTEM, context, user: `QUESTION: ${question}`, model: opts.model, effort: opts.effort })) as {
    answer?: string; citations?: Cite[]; missing?: string[]; recommendations?: string[];
  };
  const usage = lastUsage;
  opts.onStage?.({ stage: "verify" });
  const r = await resolver([], snapshot);
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
