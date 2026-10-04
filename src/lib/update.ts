// Update engine guardrails (SPEC.md section 18): applied in code AFTER the LLM, so the model
// can never invent an approval, close another condition, or miss a contract-end issue.
import type { ChangeSet, Cite, Item, Segment } from "./types";
import { indexSegments, resolveCite } from "./cite";
import { plain } from "./text";

export interface ProjectFacts {
  conditions: { id: number; title: string; owner: string }[];
  goLive: { date: string; headline?: string; citations?: Cite[] };
  contractEnd?: string; // YYYY-MM-DD
}
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// Validating owner's names, from the knowledge base: "Mélissa Gagnon (fix: Boréal)" -> ["melissa", "gagnon"].
function ownerNames(owner: string): string[] {
  return fold(owner.split(/[(,;/]| and | et /)[0]).split(/[^a-z-]+/).filter((w) => w.length >= 3);
}
const MONTHS: Record<string, number> = { janvier: 1, january: 1, fevrier: 2, february: 2, mars: 3, march: 3, avril: 4, april: 4, mai: 5, may: 5, juin: 6, june: 6,
  juillet: 7, july: 7, aout: 8, august: 8, septembre: 9, september: 9, octobre: 10, october: 10, novembre: 11, november: 11, decembre: 12, december: 12 };
// All dates mentioned in a text, as YYYY-MM-DD (year defaults to the given one).
export function datesIn(text: string, year: number): string[] {
  const t = fold(text), out: string[] = [];
  const pad = (n: number) => String(n).padStart(2, "0");
  for (const m of t.matchAll(/(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|january|february|march|april|may|june|july|august|september|october|november|december)/g)) out.push(`${year}-${pad(MONTHS[m[2]])}-${pad(+m[1])}`);
  for (const m of t.matchAll(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/g)) out.push(`${year}-${pad(MONTHS[m[1]])}-${pad(+m[2])}`);
  for (const m of t.matchAll(/\b(20\d\d)-(\d{2})-(\d{2})\b/g)) out.push(`${m[1]}-${m[2]}-${m[3]}`);
  return out;
}
const CLOSING = /ferm|valid|accept|approuv|clos|re-?test ok|\bok\b|go exploitation/i;
const APPROVAL = /approuv|d[ée]cid|approv|ent[ée]rin|adopt/i;

export function emptyChangeSet(filename: string): ChangeSet {
  return {
    id: "draft", filename, summary: "", problemStatus: [], priorDecisions: [], newProposals: [], newDecisions: [],
    conditionChanges: [], affected: { answers: [], conditions: [], actions: [] }, newActions: [], revisedAnswers: [], revisedBrief: [],
    guardrails: { approvalInvented: false, otherConditionsClosed: false, beyondContractEnd: false, notes: [] },
  };
}

export function applyGuardrails(cs: ChangeSet, baseline: Segment[], fresh: Segment[], facts: ProjectFacts): ChangeSet {
  const idx = indexSegments([...baseline, ...fresh]);
  const notes: string[] = [];
  let dropped = 0;
  const clean = (cites: Cite[] = []) => {
    const ok = cites.map((c) => resolveCite(c, idx)).filter((c) => c.verified).map(({ src, quote, loc }) => ({ src, quote, loc }));
    dropped += cites.length - ok.length;
    return ok;
  };
  const items = (xs: Item[] = []) => xs.map((x) => ({ ...x, text: plain(x.text), citations: clean(x.citations) }));
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
    const cond = facts.conditions.find((x) => x.id === ch.id);
    const names = cond ? ownerNames(cond.owner) : [];
    const byOwner = (t: string) => names.some((n) => fold(t).includes(n));
    const ok = cites.some((c) => fromNew(c) && CLOSING.test(c.quote) && (byOwner(c.quote) || byOwner(segText(c)) || byOwner(newHeaders)));
    if (ok) out.conditionChanges.push({ ...ch, citations: cites });
    else notes.push(`Condition ${ch.id} NOT closed: the new file does not quote its validating owner closing it.`);
  }

  // 3. A new date proposal never replaces the approved go-live decision by itself.
  const year = +(facts.goLive.date?.slice(0, 4) || 2026);
  const approvedDay = facts.goLive.date;
  const mentionsApproved = (t: string) => datesIn(t, year).includes(approvedDay);
  if (out.newProposals.length && approvedDay && !out.priorDecisions.some((p) => mentionsApproved(p.text))) {
    out.priorDecisions.push({
      text: `Go-live ${approvedDay}${facts.goLive.headline ? `: ${facts.goLive.headline}` : "."} This remains the official target until the proper authority decides otherwise.`,
      citations: (facts.goLive.citations ?? []).slice(0, 1),
    });
  }

  // 4. Revised answers and brief: verified citations only, known ids/themes only, and a check that a proposed
  //    date is never presented as approved when no approval was quoted.
  const validIds = new Set(["Q01","Q02","Q03","Q04","Q05","Q06","Q07","Q08","Q09","Q10"]);
  out.revisedAnswers = (cs.revisedAnswers ?? []).filter((a) => validIds.has(a.id) && a.text?.trim()).map((a) => ({ ...a, text: plain(a.text), citations: clean(a.citations) }));
  out.revisedBrief = (cs.revisedBrief ?? []).filter((b) => b.text?.trim()).map((b) => ({ ...b, text: plain(b.text), citations: clean(b.citations) }));
  out.summary = plain(cs.summary);
  for (const x of [...out.revisedAnswers.map((a) => ({ label: a.id, ...a })), ...out.revisedBrief.map((b) => ({ label: `brief "${b.theme}"`, ...b }))]) {
    if (!x.citations.length) notes.push(`${x.label}: revised text has no verified citation. Review it before publishing.`);
  }
  if (out.newDecisions.length === 0) {
    const DATE = /(\d{1,2})(?:er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)|(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi;
    const proposed = new Set(out.newProposals.flatMap((p) => p.text.match(DATE) ?? []).map((d) => d.toLowerCase()).filter((d) => !datesIn(d, year).includes(approvedDay)));
    for (const x of [...out.revisedAnswers.map((a) => ({ label: a.id, text: a.text })), ...out.revisedBrief.map((b) => ({ label: `brief "${b.theme}"`, text: b.text }))]) {
      for (const d of proposed) {
        const i = x.text.toLowerCase().indexOf(d);
        if (i >= 0 && /approuv|approved|officiel|official|confirm[ée]|d[ée]cid/i.test(x.text.slice(Math.max(0, i - 80), i + 80))
            && !/non approuv|pas approuv|not approved|not yet approved|unapproved|proposal|proposition|propos/i.test(x.text.slice(Math.max(0, i - 80), i + 80))) {
          notes.push(`${x.label}: may present the proposed date (${d}) as approved, but no approval was quoted. Review before publishing.`);
        }
      }
    }
  }

  // 5. Contract end check (date from the knowledge base).
  const text = [...out.newProposals, ...out.newDecisions].map((x) => x.text).join(" ") + " " + fresh.map((s) => s.text).join(" ");
  const end = facts.contractEnd && /^\d{4}-\d{2}-\d{2}$/.test(facts.contractEnd) ? facts.contractEnd : null;
  const lateDates = end ? datesIn(text, year).filter((d) => d > end) : [];
  const late = lateDates.length > 0;
  if (late) notes.push(`A date after the contract end (${end}) appears (${Array.from(new Set(lateDates)).join(", ")}): outside the contract period, a contractual amendment would be needed.`);
  if (dropped) notes.push(`${dropped} citation(s) removed because the quote was not found in the cited file.`);

  out.affected = {
    answers: cs.affected?.answers ?? [],
    conditions: Array.from(new Set([...(cs.affected?.conditions ?? []), ...out.conditionChanges.map((c) => c.id)])),
    actions: cs.affected?.actions ?? [],
  };
  out.guardrails = { approvalInvented: false, otherConditionsClosed: false, beyondContractEnd: late, notes: [...(cs.guardrails?.notes ?? []), ...notes] };
  return out;
}
