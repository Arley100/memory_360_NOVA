import { askProject, type AskResult } from "./ask";
import { modelFor } from "./llm";
import { allSources, currentAnswers, getKB, resolver, updates, type Answer, type KB, type Revised, type Update } from "./store";
import { questionComputationStore, type QuestionComputationStore } from "./questionComputationStore";
import { getQuestionFreshness, snapshotSources, snapshotUpdates } from "./questionFreshness";
import { OFFICIAL_QUESTION_IDS, type QuestionComputation, type QuestionRecomputeResult, type QuestionView } from "./questionTypes";
import type { Cite, ResolvedCite, Source } from "./types";

interface Dependencies {
  store: QuestionComputationStore;
  loadKB: () => Promise<KB>;
  listUpdates: () => Promise<Update[]>;
  loadAnswers: (updates: Update[]) => Promise<Revised<Answer>[]>;
  loadSources: (updates: Update[]) => Promise<Source[]>;
  resolve: (updates: Update[]) => Promise<(cite: Cite) => ResolvedCite>;
  ask: (question: string, options: { updates: Update[] }) => Promise<AskResult>;
  model: () => string;
}
function dependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  return { store: questionComputationStore(), loadKB: getKB, listUpdates: updates, loadAnswers: currentAnswers, loadSources: allSources, resolve: (ups) => resolver([], ups), ask: askProject, model: () => modelFor("ask"), ...overrides };
}

export function validateQuestionIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || !ids.length || ids.length > 10 || ids.some((id) => typeof id !== "string" || !OFFICIAL_QUESTION_IDS.includes(id))) {
    throw new Error("Provide 1 to 10 official question IDs (Q01–Q10).");
  }
  return [...new Set(ids as string[])];
}

function view(answer: Answer, computation: QuestionComputation, ups: Update[], resolve: (c: Cite) => ResolvedCite): QuestionView {
  const currentSourceIds = new Set(ups.flatMap((u) => u.sources.map((s) => s.id)));
  const unavailableCitationSources = Object.values(computation.sourceSnapshot).filter((s) => s.updateId && !currentSourceIds.has(s.id)).map((s) => s.id);
  return { id: answer.id, question: answer.question_en, questionFr: answer.question_fr, traps: answer.traps, baseline: { answer: answer.answer_en, answerFr: answer.answer_fr, citations: answer.citations.map(resolve) }, computation, citations: computation.citations.map(resolve), unavailableCitationSources, freshness: getQuestionFreshness(answer.id, computation, ups) };
}

async function initialize(row: Revised<Answer>, ups: Update[], sources: Source[], store: QuestionComputationStore): Promise<QuestionComputation> {
  const existing = await store.get(row.item.id);
  if (existing) return existing;
  // Import the existing resolved answer exactly once. This makes no LLM call and never changes the baseline.
  return store.save({ questionId: row.item.id, computedAt: new Date().toISOString(), origin: "existing-state", answer: row.current?.text ?? row.item.answer_en,
    citations: row.current?.citations ?? row.item.citations, includedUpdateIds: ups.map((u) => u.cs.id), includedUpdateVersions: snapshotUpdates(ups), sourceSnapshot: snapshotSources(sources, ups) }, true);
}

export async function getQuestionViews(overrides: Partial<Dependencies> = {}): Promise<QuestionView[]> {
  const deps = dependencies(overrides);
  const ups = await deps.listUpdates();
  const [rows, sources, resolve] = await Promise.all([deps.loadAnswers(ups), deps.loadSources(ups), deps.resolve(ups)]);
  return Promise.all(rows.filter((row) => OFFICIAL_QUESTION_IDS.includes(row.item.id)).map(async (row) => view(row.item, await initialize(row, ups, sources, deps.store), ups, resolve)));
}

export async function recomputeQuestions(ids: string[], onResult: (result: QuestionRecomputeResult) => void = () => {}, overrides: Partial<Dependencies> = {}): Promise<QuestionRecomputeResult[]> {
  const requested = validateQuestionIds(ids);
  const deps = dependencies(overrides);
  // Pin the corpus before invoking the LLM. Updates published while it runs must not be recorded as included.
  const snapshot = await deps.listUpdates();
  const [k, sources, rows] = await Promise.all([deps.loadKB(), deps.loadSources(snapshot), deps.loadAnswers(snapshot)]);
  const includedUpdateVersions = snapshotUpdates(snapshot);
  const sourceSnapshot = snapshotSources(sources, snapshot);
  const results: QuestionRecomputeResult[] = [];
  const queue = [...requested];
  await Promise.all(Array.from({ length: Math.min(2, queue.length) }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      let result: QuestionRecomputeResult;
      try {
        const question = k.answers.find((a) => a.id === id);
        const row = rows.find((a) => a.item.id === id);
        if (!question || !row) throw new Error("Official question not found in the knowledge base.");
        const previous = await initialize(row, snapshot, sources, deps.store);
        const answer = await deps.ask(question.question_en, { updates: snapshot });
        if (!answer.answer.trim()) throw new Error("No answer returned; previous answer preserved.");
        const computation: QuestionComputation = { questionId: id, computedAt: new Date().toISOString(), origin: "manual", answer: answer.answer,
          citations: answer.citations.filter((c) => c.verified).map(({ src, loc, quote }) => ({ src, loc, quote })),
          includedUpdateIds: snapshot.map((u) => u.cs.id), includedUpdateVersions, sourceSnapshot, model: deps.model(),
          previousAnswerChanged: previous.answer !== answer.answer, missing: answer.missing, recommendations: answer.recommendations };
        // Re-evaluate against the state NOW: publication/reset during a computation may already make it stale.
        const current = await deps.listUpdates();
        const resolve = await deps.resolve(current);
        const saved = await deps.store.save(computation);
        result = { id, ok: true, computation: saved, question: view(question, saved, current, resolve) };
      } catch (error) { result = { id, ok: false, error: (error as Error).message }; }
      results.push(result);
      onResult(result);
    }
  }));
  return requested.map((id) => results.find((r) => r.id === id)!);
}
