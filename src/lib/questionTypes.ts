import type { Cite, ResolvedCite } from "./types";

export const OFFICIAL_QUESTION_IDS = Array.from({ length: 10 }, (_, i) => `Q${String(i + 1).padStart(2, "0")}`);
export interface QuestionSourceSnapshot {
  sha256: string; version: string; id: string; path: string;
  updateId?: string; publishedAt?: string;
}
export interface QuestionComputation {
  questionId: string;
  computedAt: string;
  answer: string;
  citations: Cite[];
  includedUpdateIds: string[];
  includedUpdateVersions?: Record<string, string>;
  sourceSnapshot: Record<string, QuestionSourceSnapshot>;
  model?: string;
  previousAnswerChanged?: boolean;
  origin?: "existing-state" | "manual";
  missing?: string[];
  recommendations?: string[];
}
export interface QuestionContextChange {
  id: string; path: string; filename: string;
  changeType: "added" | "modified" | "removed" | "changed";
  updateId: string; publishedAt?: string;
}
export interface QuestionFreshness {
  status: "fresh" | "stale";
  changedUpdates: string[];
  removedUpdates: string[];
  changedSources: QuestionContextChange[];
}
export interface QuestionView {
  id: string; question: string; questionFr: string; traps: string[];
  baseline: { answer: string; answerFr: string; citations: ResolvedCite[] };
  computation: QuestionComputation;
  citations: ResolvedCite[];
  unavailableCitationSources: string[];
  freshness: QuestionFreshness;
}
export type QuestionRecomputeResult = { id: string; ok: true; computation: QuestionComputation; question: QuestionView } | { id: string; ok: false; error: string };
