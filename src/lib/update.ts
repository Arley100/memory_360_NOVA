// Update engine guardrails (SPEC.md section 18): applied in code AFTER the LLM, so the model
// can never invent an approval, close another condition, or miss a contract-end issue.
import type { ChangeSet, Cite, Item, Segment } from "./types";
import { indexSegments, resolveCite } from "./cite";

const OWNER: Record<number, RegExp> = { 1: /sophie|s[ée]curit[ée]/i, 2: /m[ée]lissa/i, 3: /olivier|exploitation/i };
const CLOSING = /ferm|valid|accept|approuv|clos|re-?test ok|\bok\b|go exploitation/i;
const APPROVAL = /approuv|d[ée]cid|approv|ent[ée]rin|adopt/i;
const LATE_DATE = /(\d{1,2})(?:er)?\s+(novembre|d[ée]cembre|november|december)|(november|december|novembre|d[ée]cembre)\s+\d{1,2}|2026-1[12]-\d{2}/i;

export function emptyChangeSet(filename: string): ChangeSet {
  return {
    id: "draft", filename, summary: "", problemStatus: [], priorDecisions: [], newProposals: [], newDecisions: [],
    conditionChanges: [], affected: { answers: [], conditions: [], actions: [] }, newActions: [],
    guardrails: { approvalInvented: false, otherConditionsClosed: false, beyondContractEnd: false, notes: [] },
  };
}

export function applyGuardrails(cs: ChangeSet, baseline: Segment[], fresh: Segment[]): ChangeSet {
  const idx = indexSegments([...baseline, ...fresh]);
  const notes: string[] = [];
  let dropped = 0;
  const clean = (cites: Cite[] = []) => {
    const ok = cites.map((c) => resolveCite(c, idx)).filter((c) => c.verified).map(({ src, quote, loc }) => ({ src, quote, loc }));
    dropped += cites.length - ok.length;
    return ok;
  };
  const items = (xs: Item[] = []) => xs.map((x) => ({ ...x, citations: clean(x.citations) }));
  const fromNew = (c: Cite) => c.src.startsWith("NEW");
  const segText = (c: Cite) => (idx.get(c.src) ?? []).map((s) => s.text).join(" ");
  const newHeaders = fresh.filter((s) => s.loc === "header:From").map((s) => s.text).join(" ");

  const out: ChangeSet = { ...emptyChangeSet(cs.filename), ...cs };
  out.problemStatus = items(cs.problemStatus);
  out.priorDecisions = items(cs.priorDecisions);
  out.newProposals = items(cs.newProposals);
  out.newActions = (cs.newActions ?? []).map((a) => ({ ...a, due: a.due?.trim() ? a.due : "TBC", citations: clean(a.citations) }));

  // 1. A "decision" needs a quoted approval in the new file; otherwise it is only a proposal.
  out.newDecisions = [];
  for (const d of items(cs.newDecisions)) {
    if (d.citations.some((c) => fromNew(c) && APPROVAL.test(c.quote))) out.newDecisions.push(d);
    else { out.newProposals.push({ ...d, proposer: d.authority ?? "unknown" }); notes.push(`Moved to proposals (no quoted approval by the proper authority): "${d.text}"`); }
  }

  // 2. A go-live condition closes only if its validating owner is quoted closing it in the new file.
  out.conditionChanges = [];
  for (const ch of cs.conditionChanges ?? []) {
    const cites = clean(ch.citations);
    if (ch.status !== "met") { out.conditionChanges.push({ ...ch, citations: cites }); continue; }
    const ok = cites.some((c) => fromNew(c) && CLOSING.test(c.quote) && (OWNER[ch.id]?.test(c.quote) || OWNER[ch.id]?.test(segText(c)) || OWNER[ch.id]?.test(newHeaders)));
    if (ok) out.conditionChanges.push({ ...ch, citations: cites });
    else notes.push(`Condition ${ch.id} NOT closed: the new file does not quote its validating owner closing it.`);
  }

  // 3. A new date proposal never replaces the approved Oct 22 decision by itself.
  if (out.newProposals.length && !out.priorDecisions.some((p) => /22/.test(p.text))) {
    out.priorDecisions.push({
      text: "Oct 22, 2026, approved by the steering committee on Sept 10, remains the official target until governance decides otherwise.",
      citations: [{ src: "M04", quote: "Donc approuvé. Le 22 devient la date officielle", loc: "L23" }],
    });
  }

  // 4. Contract end check (Oct 31, 2026).
  const text = [...out.newProposals, ...out.newDecisions].map((x) => x.text).join(" ") + " " + fresh.map((s) => s.text).join(" ");
  const late = LATE_DATE.test(text);
  if (late) notes.push("A date after Oct 31, 2026 appears: outside the contract period, a contractual amendment would be needed.");
  if (dropped) notes.push(`${dropped} citation(s) removed because the quote was not found in the cited file.`);

  out.affected = {
    answers: cs.affected?.answers ?? [],
    conditions: Array.from(new Set([...(cs.affected?.conditions ?? []), ...out.conditionChanges.map((c) => c.id)])),
    actions: cs.affected?.actions ?? [],
  };
  out.guardrails = { approvalInvented: false, otherConditionsClosed: false, beyondContractEnd: late, notes: [...(cs.guardrails?.notes ?? []), ...notes] };
  return out;
}
