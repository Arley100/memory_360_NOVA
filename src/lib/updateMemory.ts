import { frenchLabel } from "./locale";
import type { Decision, KB, TimelineEvent } from "./store";
import type { Update } from "./updateStore";
import type { Cite, Item } from "./types";
import { fold, norm, PROJECT_TZ } from "./text";

export interface MemoryStep extends Item {
  id: string;
  updateId: string;
  date: string;
  stage: "PROPOSED" | "DECIDED" | "CONTINUITY";
}
export interface DecisionLineage {
  id: string;
  baseline?: Decision;
  subject: string;
  steps: MemoryStep[];
  current: string;
}
export interface UpdateEvent extends TimelineEvent {
  id: string;
  updateId: string;
  context: Item[];
}

// Projection only: never writes to the KB or stores derived records. Reset and refresh
// therefore cannot leave stale layers or accumulate duplicate events.
function ordered(ups: Update[]) {
  return [...ups].sort((a, b) => a.cs.id.localeCompare(b.cs.id, undefined, { numeric: true }));
}
function updateDay(u: Update) {
  if (u.cs.publishedAt && !Number.isNaN(Date.parse(u.cs.publishedAt))) {
    const parts = new Intl.DateTimeFormat("fr-CA", { timeZone: PROJECT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(u.cs.publishedAt));
    const part = (type: string) => parts.find((p) => p.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  return u.sources.find((s) => s.contentDate)?.contentDate?.slice(0, 10) ?? "Date inconnue";
}
function mergeCites(a: Cite[], b: Cite[]) {
  return [...new Map([...a, ...b].map((c) => [JSON.stringify([c.src, c.loc, c.quote]), c])).values()];
}

export function updateTimeline(ups: Update[]): UpdateEvent[] {
  const events = new Map<string, UpdateEvent>();
  for (const u of ordered(ups)) {
    const { cs } = u;
    const add = (tag: string, item: Item, detail?: string, identity = norm(item.text)) => {
      if (!item.text.trim()) return;
      const key = `${cs.id}:${tag}:${identity}`;
      const old = events.get(key);
      if (old) { old.citations = mergeCites(old.citations, item.citations); return; }
      events.set(key, { id: key, updateId: cs.id, date: updateDay(u), tag,
        title: detail ? `${detail}: ${item.text}` : item.text, citations: [...item.citations],
        context: tag === "PROPOSAL" ? cs.priorDecisions : [],
      });
    };
    // Prefer the precise condition change over a repeated problem-status sentence.
    for (const ch of cs.conditionChanges ?? []) add("VALIDATION", ch, `Condition nº${ch.id} · ${frenchLabel(ch.status)}`, `${ch.id}:${ch.status}:${norm(ch.text)}`);
    for (const item of cs.problemStatus ?? []) {
      const ch = cs.conditionChanges.find((c) => norm(c.text) === norm(item.text));
      const same = ch && events.get(`${cs.id}:VALIDATION:${ch.id}:${ch.status}:${norm(ch.text)}`);
      if (same) same.citations = mergeCites(same.citations, item.citations);
      else add("STATUS", item, "Nouvelles informations reçues");
    }
    for (const item of cs.newProposals ?? []) add("PROPOSAL", item);
    for (const item of cs.newDecisions ?? []) add("DECISION", item);
    for (const action of cs.newActions ?? []) add("ACTION", { text: `${action.title} · ${action.owner} (${frenchLabel(action.ownerStatus)}) · échéance ${frenchLabel(action.due)} · ${action.type === "COMMITMENT" ? "Engagement documenté" : "Recommandation"}`, citations: action.citations }, "Nouvelle action créée");
    // A receipt is useful when the update has no structured consequences. Cite
    // the actual received passage, rather than inventing evidence for its summary.
    if (![...events.values()].some((e) => e.updateId === cs.id)) {
      const passage = u.segments.find((s) => s.text.trim() && !s.loc.startsWith("header:")) ?? u.segments.find((s) => s.text.trim());
      if (passage) add("REPORT", { text: cs.filename, citations: [{ src: passage.src, loc: passage.loc, quote: passage.text }] }, "Nouvelles informations reçues");
    }
  }
  return [...events.values()];
}

// Deliberately conservative: no similarity score or date-only matching. A date
// change can only match the unique go-live DATE lineage, not go-live conditions.
function topic(text: string): string | undefined {
  const t = fold(text);
  const codes = [...new Set(t.match(/\b(?:adr|cr|sec|acc|ops|int|data)-\d+\b/g))];
  if (codes.length === 1) return codes[0];
  if (codes.length > 1) return undefined;
  const launchDate = /\blaunch\b/.test(t) && /\bdate\b|\btarget\b|\b\d{1,2}\b|\b20\d{2}-/.test(t);
  if ((/go[ -]?live|mise en production/.test(t) || launchDate) && !/condition|validation|runbook|guide d.exploitation/.test(t)) return "go-live-date";
  return undefined;
}
export function decisionLineages(kb: Pick<KB, "decisions" | "goLive">, ups: Update[]): DecisionLineage[] {
  const groups: DecisionLineage[] = kb.decisions.map((d) => ({ id: d.id, baseline: d, subject: d.subject, steps: [],
    current: topic(d.subject) === "go-live-date" ? `${kb.goLive.date} reste approuvée (${frenchLabel(kb.goLive.status ?? "conditional")})` : `${d.status} · ${d.decided}`,
  }));
  const seen = new Set<string>();
  for (const u of ordered(ups)) {
    for (const [stage, items] of [["PROPOSED", u.cs.newProposals], ["DECIDED", u.cs.newDecisions], ["CONTINUITY", u.cs.priorDecisions]] as const) {
      for (const item of items ?? []) {
        if (!item.text.trim()) continue;
        const id = `${u.cs.id}:${stage}:${norm(item.text)}`;
        const explicit = kb.decisions.filter((d) => new RegExp(`\\b${d.id}\\b`, "i").test(item.text));
        const key = topic(item.text);
        const matches = explicit.length ? groups.filter((g) => explicit.some((d) => d.id === g.id)) : key ? groups.filter((g) => topic(g.subject) === key) : [];
        let group = matches.length === 1 ? matches[0] : undefined;
        if (seen.has(id)) {
          const old = groups.flatMap((g) => g.steps).find((s) => s.id === id);
          if (old) old.citations = mergeCites(old.citations, item.citations);
          continue;
        }
        seen.add(id);
        if (!group) {
          group = { id, subject: item.text, steps: [], current: "Aucune décision formelle enregistrée dans cet historique." };
          groups.push(group);
        }
        group.steps.push({ ...item, citations: [...item.citations], id, updateId: u.cs.id, date: updateDay(u), stage });
        // Continuity and proposals never replace the last formal decision.
        if (stage === "DECIDED") group.current = `${item.text} · DÉCIDÉ · ${u.cs.id}`;
      }
    }
  }
  return groups;
}
