// Builds the whole knowledge base from the raw corpus with an LLM: answers to the README questions, go-live state,
// conditions, budget, people, timeline, decisions, contradictions, actions and the one-page brief.
// Every citation is checked by the same verifier as the rest of the app; unverifiable ones are dropped.
// The hand-curated knowledge base is only used afterwards, as an answer key, to score the generated answers.
import { askContext } from "./ask";
import { llmJSON, modelFor } from "./llm";
import { CITATION_FORMAT, RULES } from "./prompts";
import { readmeQuestions } from "./readme";
import { scoreAgainstKey } from "./answerKey";
import { allSegments, allSources, resolver, type KB } from "./store";
import type { Cite } from "./types";
import { plain, stripQ } from "./text";

export type Progress = { stage: string; status: "start" | "done" | "error"; label: string; detail?: string; done?: number; total?: number };

const ANALYST = `You are the analysis engine of Mémoire 360. You read every file of a project dossier and build its operational
memory for someone taking the project over. Reference date: the dossier's baseline (2026-09-30 09:00, Montréal, UTC-04:00).\n${RULES}
${CITATION_FORMAT}
Every item you produce must carry citations. Write every text field in English (the dossier is in French: translate, but keep each citation quote verbatim in French). Only "answer_fr" is in French. Plain text only in every text field (no Markdown, no asterisks, no bullet symbols). Never invent a decision, a date, an amount, an owner or an approval; write "TBC" or
"not documented" when the files don't say. Distinguish proposal / decision / delivery / validation everywhere.
Return JSON only.`;

const model = () => process.env.LLM_MODEL_ANALYSIS || modelFor("ask");

async function call<T>(task: string, context: string, maxTokens = 16000): Promise<T> {
  return (await llmJSON({ task: "ask", system: ANALYST, context, user: task, model: model(), maxTokens })) as T;
}

export async function runAnalysis(onProgress: (p: Progress) => void = () => {}): Promise<KB> {
  const started = Date.now();
  const step = async <T,>(stage: string, label: string, fn: () => Promise<T>, detail?: (r: T) => string): Promise<T> => {
    onProgress({ stage, status: "start", label });
    try { const r = await fn(); onProgress({ stage, status: "done", label, detail: detail?.(r) }); return r; }
    catch (e) { onProgress({ stage, status: "error", label, detail: (e as Error).message }); throw e; }
  };

  const sources = await allSources([]);
  const segments = await allSegments([]);
  onProgress({ stage: "read", status: "done", label: "Read the dossier", detail: `${sources.filter((s) => !s.parent).length} files, ${segments.length} passages` });
  const context = await askContext("corpus");
  const questions = readmeQuestions(sources, segments);
  onProgress({ stage: "questions", status: "done", label: "Found the questions to answer", detail: `${questions.length} questions in README` });

  // 1. Answers to the README questions (parallel, 4 at a time) + state + history.
  let answered = 0;
  const answerOne = async (q: { id: string; fr: string }) => {
    const out = await call<{ question_en: string; answer_en: string; answer_fr: string; citations: Cite[]; traps: string[] }>(
      `Answer this question from the dossier's README for the person taking over: "${q.id}. ${q.fr}"
Be precise and nuanced like an expert reviewer: dates, owners, amounts, and whether each fact is a proposal, a decision, a delivery or a validation.
Use at least two distinct sources when possible. List the traps a careless reader would fall into (stale documents, duplicates, vendor claims...).
JSON: {"question_en": string, "answer_en": string (3-6 sentences), "answer_fr": string (1-2 sentences, French), "citations": [{"src","loc","quote"}], "traps": [string]}`, context, 8000);
    answered++;
    onProgress({ stage: "answers", status: "start", label: "Answering the README questions", done: answered, total: questions.length });
    return { id: q.id, question_fr: q.fr, ...out };
  };
  const answersP = (async () => {
    onProgress({ stage: "answers", status: "start", label: "Answering the README questions", done: 0, total: questions.length });
    const out: Awaited<ReturnType<typeof answerOne>>[] = [];
    const queue = [...questions];
    await Promise.all(Array.from({ length: 4 }, async () => { for (let q = queue.shift(); q; q = queue.shift()) out.push(await answerOne(q)); }));
    out.sort((a, b) => a.id.localeCompare(b.id));
    onProgress({ stage: "answers", status: "done", label: "Answering the README questions", detail: `${out.length} answers` });
    return out;
  })();

  const stateP = step("state", "Working out the current state, conditions, budget and people", () => call<{
    goLive: KB["goLive"]; conditions: KB["conditions"]; budget: KB["budget"]; people: KB["people"];
  }>(`Determine the project's current state at the reference date.
JSON: {
 "goLive": {"date": "YYYY-MM-DD (currently approved target)", "approvedOn": "YYYY-MM-DD", "status": "conditional|confirmed|at risk|unknown",
   "headline": "one sentence: the approved date, who approved it and when, who proposed it, and the main reservation", "citations": [...],
   "contractEnd": "YYYY-MM-DD or TBC", "contractEndNote": "one sentence on the risk if the date slips", "contractEndCitations": [...]},
 "conditions": [{"id": 1, "title": "short", "owner": "validating owner (and who must deliver)", "status": "open|met", "state": "one line: where it stands", "citations": [...]}],
 "budget": {"authorized": number, "components": [{"label": "e.g. initial contract / approved change request", "amount": number, "citations": [...]}],
   "invoices": [{"id","date","amount": number,"status"}], "paid": number, "invoicedReceived": number, "invoicedValid": number,
   "unapproved": number, "unapprovedLabel": "what is billed without approval, or empty", "unapprovedCitations": [...], "remaining": number},
 "people": [{"name","role","since","owns"}]
}
Amounts in CAD before tax, as plain numbers. Distinguish authorized, invoiced and paid. Exclude documents about other projects.`, context),
    (r) => `${r.conditions?.length ?? 0} go-live conditions · ${r.people?.length ?? 0} people · budget ${r.budget?.authorized ?? "?"} $`);

  const historyP = step("history", "Rebuilding the timeline and the decisions", () => call<{ timeline: KB["timeline"]; decisions: KB["decisions"] }>(
    `Rebuild the project's history up to the reference date.
JSON: {"timeline": [{"date": "YYYY-MM-DD", "tag": "PROPOSAL|DECISION|DELIVERY|VALIDATION|ISSUE|FINANCE|ORG|REPORT|STATUS", "title": "short", "citations": [...]}] (25-35 key events, chronological),
"decisions": [{"id": "D1", "subject", "proposed": "who, when", "decided": "who, when", "delivered": "who, when or —", "validated": "who, when or —", "status": "short"}] (6-9 decisions)}`, context),
    (r) => `${r.timeline?.length ?? 0} events · ${r.decisions?.length ?? 0} decisions`);

  const [answers, state, history] = await Promise.all([answersP, stateP, historyP]);

  // 2. Contradictions and actions (need the conditions found above).
  const issues = await step("issues", "Resolving contradictions and planning actions", () => call<{ contradictions: KB["contradictions"]; actions: KB["actions"] }>(
    `Go-live conditions found: ${JSON.stringify(state.conditions.map((c) => ({ id: c.id, title: c.title, owner: c.owner })))}.
1) Find the contradictions between sources and resolve each by the authority of the source or the date of the facts
   (include stale plans, risk registers and status reports, vendor claims vs validations, duplicates are not confirmations).
2) List the actions to take: link each to a condition id when relevant; owner "confirmed" only if named in the files, else "proposed";
   type "COMMITMENT" if documented, "RECOMMENDATION" if it is yours; due date only if stated, else "TBC".
JSON: {"contradictions": [{"id": "C1", "topic", "a": "what one side says", "aCit": [...], "b": "what the other side says", "bCit": [...],
 "resolution", "rule": "authority|date|authority+date", "planOrRegister": boolean}] (4-8),
 "actions": [{"id": "A1", "title", "condition": number or null, "owner", "ownerStatus": "confirmed|proposed", "type": "COMMITMENT|RECOMMENDATION", "due", "citations": [...]}] (8-12)}`, context),
    (r) => `${r.contradictions?.length ?? 0} contradictions · ${r.actions?.length ?? 0} actions`);

  // 3. The one-page brief, from everything above.
  const brief = await step("brief", "Writing the one-page handover brief", () => call<{ sections: KB["brief"]["sections"] }>(
    `Write the one-page handover brief requested by the README, from the dossier and this analysis:
${JSON.stringify({ goLive: state.goLive, conditions: state.conditions, budget: state.budget, actions: issues.actions.slice(0, 8) })}
JSON: {"sections": [{"theme": "Owner|Approved date and conditions|Scope|Budget|Invoices|Priorities", "text": "1-3 sentences", "citations": [...]}]}
Label your own recommendations as recommendations.`, context, 8000),
    (r) => `${r.sections?.length ?? 0} sections`);

  // 4. Verify every citation (drop the ones whose quote is not in the cited file).
  onProgress({ stage: "verify", status: "start", label: "Checking every citation against the files" });
  const r = await resolver([], []);
  let verified = 0, dropped = 0;
  const clean = (cs: Cite[] = []) => cs.map(r).filter((c) => { if (c.verified) verified++; else dropped++; return c.verified; })
    .map(({ src, loc, quote }) => ({ src, loc, quote }));
  const kb: KB = {
    version: "generated",
    asOf: "2026-09-30T09:00:00-04:00",
    goLive: { ...state.goLive, headline: plain(state.goLive.headline), contractEndNote: plain(state.goLive.contractEndNote), citations: clean(state.goLive.citations), contractEndCitations: clean(state.goLive.contractEndCitations) },
    answers: answers.map((a) => ({ id: a.id, question_fr: a.question_fr, question_en: stripQ(plain(a.question_en)), answer_en: plain(a.answer_en), answer_fr: plain(a.answer_fr), citations: clean(a.citations), traps: (a.traps ?? []).map(plain) })),
    conditions: state.conditions.map((c) => ({ ...c, title: plain(c.title), state: plain(c.state), citations: clean(c.citations) })),
    actions: issues.actions.map((a) => ({ ...a, title: plain(a.title), condition: a.condition ?? undefined, citations: clean(a.citations) })),
    contradictions: issues.contradictions.map((c) => ({ ...c, a: plain(c.a), b: plain(c.b), resolution: plain(c.resolution), aCit: clean(c.aCit), bCit: clean(c.bCit) })),
    timeline: history.timeline.map((e) => ({ ...e, title: plain(e.title), citations: clean(e.citations) })).sort((a, b) => a.date.localeCompare(b.date)),
    decisions: history.decisions,
    budget: { ...state.budget, components: (state.budget.components ?? []).map((x) => ({ ...x, citations: clean(x.citations) })), unapprovedCitations: clean(state.budget.unapprovedCitations) },
    brief: { asOf: "Sept 30, 2026, 09:00 (Montréal)", sections: brief.sections.map((s) => ({ ...s, text: plain(s.text), citations: clean(s.citations) })) },
    people: state.people,
  };
  onProgress({ stage: "verify", status: "done", label: "Checking every citation against the files", detail: `${verified} verified · ${dropped} removed` });

  const answerKey = scoreAgainstKey(kb.answers);
  if (answerKey) onProgress({ stage: "key", status: "done", label: "Comparing with the curated answer key", detail: `${answerKey.score} answers contain every key fact` });
  kb.meta = { source: "ai", generatedAt: new Date().toISOString(), model: model(), durationMs: Date.now() - started, citations: { verified, dropped }, answerKey };
  return kb;
}
