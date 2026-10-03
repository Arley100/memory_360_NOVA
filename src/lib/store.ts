// Server-side data access. The baseline is read-only (files in the repo); updates come from the update store
// (local files or Redis when hosted). The current state = baseline + published updates.
import fs from "fs";
import path from "path";
import { indexSegments, resolveCite } from "./cite";
import { updateStore, type Update } from "./updateStore";
import type { Cite, ResolvedCite, Segment, Source } from "./types";

export type { Update } from "./updateStore";
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

// Baseline: read once per server instance (it never changes at runtime).
let baselineCache: { kb: KB; sources: Source[]; segments: Segment[] } | null = null;
function baseline() {
  if (!baselineCache) baselineCache = { kb: readJSON<KB>("baseline/kb.json"), sources: readJSON<Source[]>("registry.json"), segments: readJSON<Segment[]>("segments.json") };
  return baselineCache;
}
export const kb = () => baseline().kb;
export const baselineSources = () => baseline().sources;
export const baselineSegments = () => baseline().segments;

export const updates = (): Promise<Update[]> => updateStore().list();

export async function allSources(ups?: Update[]): Promise<Source[]> { return [...baselineSources(), ...(ups ?? (await updates())).flatMap((u) => u.sources)]; }
export async function allSegments(ups?: Update[]): Promise<Segment[]> { return [...baselineSegments(), ...(ups ?? (await updates())).flatMap((u) => u.segments)]; }

export async function resolver(extra: Segment[] = [], ups?: Update[]): Promise<(c: Cite) => ResolvedCite> {
  const idx = indexSegments([...(await allSegments(ups)), ...extra]);
  return (c: Cite) => resolveCite(c, idx);
}

type CurrentCondition = Condition & { changedIn?: string; changeText?: string; changeCites?: Cite[] };
export async function currentConditions(ups?: Update[]): Promise<CurrentCondition[]> {
  const conds = kb().conditions.map((c) => ({ ...c })) as CurrentCondition[];
  for (const u of ups ?? (await updates())) {
    for (const ch of u.cs.conditionChanges ?? []) {
      const c = conds.find((x) => x.id === ch.id);
      if (c) Object.assign(c, { status: ch.status, changedIn: u.cs.id, changeText: ch.text, changeCites: ch.citations });
    }
  }
  return conds;
}

export interface Revised<T> { item: T; current?: { text: string; citations: Cite[]; changedIn: string } }

export async function currentAnswers(ups?: Update[]): Promise<Revised<Answer>[]> {
  const list = ups ?? (await updates());
  return kb().answers.map((a) => {
    let current: Revised<Answer>["current"];
    for (const u of list) {
      const r = u.cs.revisedAnswers?.find((x) => x.id === a.id);
      if (r) current = { text: r.text, citations: r.citations, changedIn: u.cs.id };
    }
    return { item: a, current };
  });
}

export async function currentBrief(ups?: Update[]): Promise<Revised<KB["brief"]["sections"][number]>[]> {
  const list = ups ?? (await updates());
  return kb().brief.sections.map((sec) => {
    let current: Revised<KB["brief"]["sections"][number]>["current"];
    for (const u of list) {
      const r = u.cs.revisedBrief?.find((x) => x.theme.toLowerCase() === sec.theme.toLowerCase());
      if (r) current = { text: r.text, citations: r.citations, changedIn: u.cs.id };
    }
    return { item: sec, current };
  });
}
