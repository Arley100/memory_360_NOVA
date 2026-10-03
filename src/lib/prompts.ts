// Shared grounding context and rules (see SPEC.md section 21).
import { allSegments, allSources, kb, updates } from "./store";

export const RULES = `Rules of reading (from the challenge README):
1. Reference date: baseline = 2026-09-30 09:00 Montréal (UTC-04:00). Later facts only come from published updates (U001...).
2. NOVA facts come ONLY from the provided segments. Never use outside knowledge for project facts.
3. Distinguish PROPOSAL vs DECISION and DELIVERY vs VALIDATION. A vendor saying "fixed" is a delivery, not a validation.
4. A historical screenshot does not prove a defect is still open; the ticket status prevails.
5. Duplicated files count as one source. Ignore NOISE and UNRELATED sources (e.g. ORION invoice).
6. Assess authority and the date of the facts; a recent file date does not make content current (plan v3 and risk register R-01 are stale).
7. Money: CAD before tax; distinguish authorized, invoiced, paid. No tax computation.
8. If information is missing, say it is not documented. Never invent a decision, deadline, approval or owner.
9. Label your own suggestions as recommendations, separate from documented commitments.`;

export const CITATION_FORMAT = `Citation format (strict):
- "src" is ONLY the source id before "#" in the segment marker. For [[M04#L23]] use "src": "M04", "loc": "L23".
- "quote" is copied character for character from that one segment, in French, 3 to 20 words. No paraphrase,
  no translation, no ellipsis, no added quotation marks.
- Every factual sentence needs at least one citation. Prefer the most authoritative source (decision > validation > report).`;

export function corpusContext(): string {
  const src = new Map(allSources().map((s) => [s.id, s]));
  return allSegments()
    .filter((s) => { const x = src.get(s.src); return x && x.role !== "NOISE" && !x.duplicateOf; })
    .map((s) => `[[${s.src}#${s.loc}]] ${s.text.replace(/\s+/g, " ")}`)
    .join("\n");
}

export function kbContext(): string {
  const k = kb();
  const slim = {
    goLive: k.goLive, conditions: k.conditions.map(({ citations, ...c }) => c),
    answers: k.answers.map((a) => ({ id: a.id, q: a.question_en, a: a.answer_en })),
    actions: k.actions.map(({ citations, ...a }) => a),
    contradictions: k.contradictions.map((c) => ({ id: c.id, topic: c.topic, resolution: c.resolution })),
    decisions: k.decisions, budget: k.budget,
    updates: updates().map((u) => u.cs),
  };
  return JSON.stringify(slim);
}
