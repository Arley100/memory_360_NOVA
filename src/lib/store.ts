// Server-side data access. Baseline files are read-only; updates are additive (data/updates/U00n/).
import fs from "fs";
import path from "path";
import { indexSegments, resolveCite } from "./cite";
import type { ChangeSet, Cite, ResolvedCite, Segment, Source } from "./types";

export const ROOT = process.cwd();
// Paths are relative to data/ (keeps file tracing scoped to that folder).
const readJSON = <T,>(rel: string): T => JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", rel), "utf8")) as T;

export interface Answer { id: string; question_fr: string; question_en: string; answer_en: string; answer_fr: string; citations: Cite[]; traps: string[] }
export interface Condition { id: number; title: string; owner: string; status: "open" | "met"; state: string; citations: Cite[] }
export interface Action { id: string; title: string; condition?: number; owner: string; ownerStatus: string; type: string; due: string; citations: Cite[] }
export interface Contradiction { id: string; topic: string; a: string; aCit: Cite[]; b: string; bCit: Cite[]; resolution: string; rule: string; planOrRegister: boolean }
export interface TimelineEvent { date: string; tag: string; title: string; citations: Cite[] }
export interface Decision { id: string; subject: string; proposed: string; decided: string; delivered: string; validated: string; status: string }
export interface KB {
  version: string; asOf: string;
  goLive: { date: string; approvedOn: string; contractEnd: string };
  answers: Answer[]; conditions: Condition[]; actions: Action[]; contradictions: Contradiction[];
  timeline: TimelineEvent[]; decisions: Decision[];
  budget: { authorized: number; base: number; cr01: number; paid: number; invoicedReceived: number; invoicedValid: number; unapproved: number; remaining: number;
    invoices: { id: string; date: string; amount: number; status: string }[] };
  brief: { asOf: string; sections: { theme: string; text: string; citations: Cite[] }[] };
  people: { name: string; role: string; since: string; owns: string }[];
}

export interface Update { cs: ChangeSet; sources: Source[]; segments: Segment[] }

export const kb = () => readJSON<KB>("baseline/kb.json");
export const baselineSources = () => readJSON<Source[]>("registry.json");
export const baselineSegments = () => readJSON<Segment[]>("segments.json");

export function updates(): Update[] {
  const dir = path.join(process.cwd(), "data", "updates");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((d) => /^U\d{3}$/.test(d)).sort().map((d) => ({
    cs: readJSON<ChangeSet>(`updates/${d}/changeset.json`),
    sources: readJSON<Source[]>(`updates/${d}/sources.json`),
    segments: readJSON<Segment[]>(`updates/${d}/segments.json`),
  }));
}

export function allSources(): Source[] { return [...baselineSources(), ...updates().flatMap((u) => u.sources)]; }
export function allSegments(): Segment[] { return [...baselineSegments(), ...updates().flatMap((u) => u.segments)]; }

export function resolver(extra: Segment[] = []): (c: Cite) => ResolvedCite {
  const idx = indexSegments([...allSegments(), ...extra]);
  return (c: Cite) => resolveCite(c, idx);
}

// Current view = baseline + published ChangeSets (baseline itself is never modified).
export function currentConditions(): (Condition & { changedIn?: string; changeText?: string; changeCites?: Cite[] })[] {
  const conds = kb().conditions.map((c) => ({ ...c })) as (Condition & { changedIn?: string; changeText?: string; changeCites?: Cite[] })[];
  for (const u of updates()) {
    for (const ch of u.cs.conditionChanges ?? []) {
      const c = conds.find((x) => x.id === ch.id);
      if (c) Object.assign(c, { status: ch.status, changedIn: u.cs.id, changeText: ch.text, changeCites: ch.citations });
    }
  }
  return conds;
}
