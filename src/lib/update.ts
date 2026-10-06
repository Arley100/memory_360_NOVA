// Update engine guardrails (docs/SPEC-hackathon.md section 18): applied in code AFTER the LLM, so the model
// can never invent an approval, close another condition, or miss a contract-end issue.
import type { ChangeSet, Cite, Item, Segment } from "./types";
import { indexSegments, resolveCite } from "./cite";
import { plain } from "./text";

export interface ProjectFacts {
  conditions: { id: number; title: string; owner: string; status?: "open" | "met" }[];
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
  const t = fold(text).replace(/\b(jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\b/g,
    (m) => ({ jan: "january", feb: "february", mar: "march", apr: "april", jun: "june", jul: "july", aug: "august", sep: "september", sept: "september", oct: "october", nov: "november", dec: "december" }[m.replace(".", "")] ?? m)), out: string[] = [];
  const pad = (n: number) => String(n).padStart(2, "0");
  for (const m of t.matchAll(/(?<!\d)(\d{1,2})(?:er|st|nd|rd|th)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|january|february|march|april|may|june|july|august|september|october|november|december)/g)) out.push(`${year}-${pad(MONTHS[m[2]])}-${pad(+m[1])}`);
  for (const m of t.matchAll(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?!\d)/g)) out.push(`${year}-${pad(MONTHS[m[1]])}-${pad(+m[2])}`);
  for (const m of t.matchAll(/\b(20\d\d)-(\d{2})-(\d{2})\b/g)) out.push(`${m[1]}-${m[2]}-${m[3]}`);
  return out;
}
const CLOSING = /ferm|valid|accept|approuv|clos|re-?test ok|\bok\b|go exploitation/i;
const APPROVAL = /approuv|d[ée]cid|approv|ent[ée]rin|adopt/i;
const quotedApproval = (quote: string) => APPROVAL.test(quote) && !/not (?:yet )?approved|unapproved|non approuv|pas approuv|sans approbation/i.test(quote);

export function dedupeWarnings(notes: string[]): string[] {
  return Array.from(new Map(notes.map((n) => [fold(n).replace(/\s+/g, " ").trim(), n])).values());
}

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
  const reviewWarnings: string[] = [];
  const review = (note: string) => { notes.push(note); reviewWarnings.push(note); };
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
  const ownerCloses = (id: number, cites: Cite[]) => {
    const cond = facts.conditions.find((x) => x.id === id);
    const names = cond ? ownerNames(cond.owner) : [];
    const byOwner = (t: string) => names.some((n) => fold(t).includes(n));
    return cites.some((c) => fromNew(c) && CLOSING.test(c.quote)
      && !/not (?:yet )?(?:validated|accepted|closed)|not close|do not close|pas valid|pas ferm|ne pas ferm/i.test(c.quote)
      && (byOwner(c.quote) || byOwner(segText(c)) || byOwner(newHeaders)));
  };

  const out: ChangeSet = { ...emptyChangeSet(cs.filename), ...cs };
  out.problemStatus = items(cs.problemStatus);
  out.priorDecisions = items(cs.priorDecisions);
  out.newProposals = items(cs.newProposals);
  out.newActions = (cs.newActions ?? []).map((a) => ({ ...a, due: a.due?.trim() ? a.due : "À confirmer", citations: clean(a.citations) }));

  // 1. A "decision" needs a quoted approval in the new file; otherwise it is only a proposal.
  out.newDecisions = [];
  for (const d of items(cs.newDecisions)) {
    if (d.citations.some((c) => fromNew(c) && quotedApproval(c.quote))) out.newDecisions.push(d);
    else { out.newProposals.push({ ...d, proposer: d.authority ?? "inconnue" }); review(`Déplacée vers les propositions (aucune approbation citée de l’autorité compétente) : «${d.text}»`); }
  }

  // 2. A go-live condition closes only if its validating owner is quoted closing it in the new file.
  out.conditionChanges = [];
  for (const ch of cs.conditionChanges ?? []) {
    const cites = clean(ch.citations);
    if (ch.status !== "met") { out.conditionChanges.push({ ...ch, citations: cites }); continue; }
    const ok = ownerCloses(ch.id, cites);
    if (ok) out.conditionChanges.push({ ...ch, citations: cites });
    else review(`Condition ${ch.id} NON fermée : le nouveau fichier ne cite pas sa fermeture par le responsable de validation.`);
  }

  // 3. A new date proposal never replaces the approved go-live decision by itself.
  const year = +(facts.goLive.date?.slice(0, 4) || 2026);
  const approvedDay = facts.goLive.date;
  const mentionsApproved = (t: string) => datesIn(t, year).includes(approvedDay);
  if (out.newProposals.length && approvedDay && !out.priorDecisions.some((p) => mentionsApproved(p.text))) {
    out.priorDecisions.push({
      text: `Mise en production ${approvedDay}${facts.goLive.headline ? `: ${facts.goLive.headline}` : "."} Cette cible reste officielle jusqu’à une décision contraire de l’autorité compétente.`,
      citations: (facts.goLive.citations ?? []).slice(0, 1),
    });
  }

  // 4. Revised answers and brief: verified citations only, known ids/themes only, and a check that a proposed
  //    date is never presented as approved when no approval was quoted.
  const validIds = new Set(["Q01","Q02","Q03","Q04","Q05","Q06","Q07","Q08","Q09","Q10"]);
  out.revisedAnswers = (cs.revisedAnswers ?? []).filter((a) => validIds.has(a.id) && a.text?.trim()).map((a) => ({ ...a, text: plain(a.text), citations: clean(a.citations) }));
  out.revisedBrief = (cs.revisedBrief ?? []).filter((b) => b.text?.trim()).map((b) => ({ ...b, text: plain(b.text), citations: clean(b.citations) }));
  out.summary = plain(cs.summary);
  for (const x of [...out.revisedAnswers.map((a) => ({ label: a.id, ...a })), ...out.revisedBrief.map((b) => ({ label: `fiche «${b.theme}»`, ...b }))]) {
    if (!x.citations.length) review(`${x.label} : texte révisé sans citation vérifiée. Vérifiez avant publication.`);
  }
  {
    // Compare calendar days (any order, French or English): "5 November", "November 5", "5 novembre", "2026-11-05".
    const proposed = new Set([...out.newProposals.flatMap((p) => datesIn(p.text, year)), ...fresh.flatMap((s) => datesIn(s.text, year))].filter((d) => d !== approvedDay));
    const approvedDates = new Set(out.newDecisions.filter((d) => /go-live|go live|mise en production/i.test(d.text)).flatMap((d) =>
      d.citations.filter((c) => fromNew(c) && quotedApproval(c.quote)).flatMap((c) => datesIn(c.quote, year))));
    const DATE_AT = /(?<!\d)\d{1,2}(?:er|st|nd|rd|th)?\s+(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre|january|february|march|april|may|june|july|august|september|october|november|december)|(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+\d{1,2}(?!\d)|\b20\d\d-\d{2}-\d{2}\b/gi;
    for (const x of [...out.revisedAnswers.map((a) => ({ label: a.id, text: a.text })), ...out.revisedBrief.map((b) => ({ label: `fiche «${b.theme}"`, text: b.text })),
      ...out.priorDecisions.map((p) => ({ label: "Décision antérieure", text: p.text })),
      ...out.newProposals.map((p) => ({ label: "Nouvelle proposition", text: p.text })),
      ...out.newDecisions.map((p) => ({ label: "Nouvelle décision", text: p.text })),
      ...out.problemStatus.map((p) => ({ label: "État du problème", text: p.text })), { label: "Résumé", text: out.summary }]) {
      const flagged = new Set<string>();
      for (const m of x.text.matchAll(DATE_AT)) {
        const iso = datesIn(m[0], year)[0];
        if (!iso || (!proposed.has(iso) && !/go-live|go live|mise en production/i.test(x.text) && x.label !== "Q01") || iso === approvedDay || approvedDates.has(iso) || flagged.has(iso)) continue;
        const i = m.index ?? 0;
        const around = x.text.slice(Math.max(0, i - 80), i + m[0].length + 80);
        if (/approuv|approved|officiel|official|confirm[ée]|d[ée]cid/i.test(around)
            && !/non approuv|pas approuv|not approved|not yet approved|unapproved|proposal|proposition|propos|suggest/i.test(around)) {
          flagged.add(iso);
          review(`${x.label} : peut présenter la date proposée (${m[0]}) comme approuvée, sans approbation citée. Vérifiez avant publication.`);
        }
      }
    }
  }

  // The same validating-owner rule applies to narrative edits, not just status badges.
  const narrative = [...out.problemStatus.map((x) => ({ ...x, label: "État du problème" })),
    ...out.priorDecisions.map((x) => ({ ...x, label: "Décision antérieure" })),
    ...out.newProposals.map((x) => ({ ...x, label: "Nouvelle proposition" })),
    ...out.newDecisions.map((x) => ({ ...x, label: "Nouvelle décision" })),
    ...out.revisedAnswers.map((x) => ({ ...x, label: x.id })),
    ...out.revisedBrief.map((x) => ({ ...x, label: `fiche «${x.theme}»` })),
    { label: "Résumé", text: out.summary, citations: [...out.problemStatus, ...out.newDecisions, ...(out.revisedAnswers ?? [])].flatMap((x) => x.citations) }];
  for (const x of narrative) {
    for (const cond of facts.conditions) {
      const tickets = cond.title.match(/\b[A-Z]+-\d+\b/g) ?? [];
      const assertsClosure = x.text.split(/[.!?;\n]/).some((sentence) =>
        (tickets.some((ticket) => sentence.includes(ticket))
          || (cond.id === 1 && x.label === "Q08") || (cond.id === 3 && /runbook|guide d.exploitation/i.test(sentence))) &&
        /\b(validated|accepted|closed|approved|met|validee?s?|acceptee?s?|fermee?s?|approuvee?s?|satisfait[es]*)\b/i.test(fold(sentence))
        && !/\b(not|no|pending|unvalidated|unaccepted|unapproved|until|requires?|must|needs?|remains open|en validation|non|pas|aucun|aucune|sans|attente|avant|requiert|n[ée]cessite|doit|reste ouvert)\b/i.test(sentence));
      if (assertsClosure && cond.status !== "met" && !ownerCloses(cond.id, x.citations)) {
        review(`${x.label} : Condition ${cond.id} NON fermée : une livraison ou déclaration du fournisseur ne prouve pas la validation par ${cond.owner}.`);
      }
    }
  }

  // 5. Contract end check (date from the knowledge base).
  const text = [...out.newProposals, ...out.newDecisions].map((x) => x.text).join(" ") + " " + fresh.map((s) => s.text).join(" ");
  const end = facts.contractEnd && /^\d{4}-\d{2}-\d{2}$/.test(facts.contractEnd) ? facts.contractEnd : null;
  const lateDates = end ? datesIn(text, year).filter((d) => d > end) : [];
  const late = lateDates.length > 0;
  if (late) notes.push(`Une date après la fin du contrat (${end}) apparaît (${Array.from(new Set(lateDates)).join(", ")}) : hors période contractuelle ; un avenant serait nécessaire.`);
  if (dropped) review(`${dropped} citation(s) retirée(s), car introuvable(s) dans le fichier cité.`);

  out.affected = {
    answers: cs.affected?.answers ?? [],
    conditions: Array.from(new Set([...(cs.affected?.conditions ?? []), ...out.conditionChanges.map((c) => c.id)])),
    actions: cs.affected?.actions ?? [],
  };
  out.guardrails = { approvalInvented: false, otherConditionsClosed: false, beyondContractEnd: late,
    notes: dedupeWarnings([...(cs.guardrails?.notes ?? []), ...notes]), reviewWarnings: dedupeWarnings(reviewWarnings) };
  return out;
}
