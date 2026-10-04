import { frenchAppContent } from "./frenchContent";
import { randomUUID } from "node:crypto";
import { indexSegments, resolveCite } from "./cite";
import { recomputeIncrementally, supportingEvidence, incrementalRequest, INCREMENTAL_PROMPT_VERSION, type IncrementalInput, type IncrementalAnswer } from "./questionIncremental";
import { stripQ } from "./text";
import { askProject, type AskResult } from "./ask";
import { modelFor } from "./llm";
import { allSegments, allSources, currentAnswers, getKB, resolver, updates, type Answer, type KB, type Revised, type Update } from "./store";
import { questionComputationStore, type QuestionComputationStore } from "./questionComputationStore";
import { getQuestionContextDelta, getQuestionFreshness, snapshotSources, snapshotUpdates } from "./questionFreshness";
import { OFFICIAL_QUESTION_IDS, type QuestionComputation, type QuestionRecomputeResult, type QuestionView } from "./questionTypes";
import type { Cite, ResolvedCite, Source, Segment } from "./types";

interface Dependencies {
  store: QuestionComputationStore;
  loadKB: () => Promise<KB>;
  listUpdates: () => Promise<Update[]>;
  loadAnswers: (updates: Update[]) => Promise<Revised<Answer>[]>;
  loadSources: (updates: Update[]) => Promise<Source[]>;
  resolve: (updates: Update[]) => Promise<(cite: Cite) => ResolvedCite>;
  ask: (question: string, options: { updates: Update[] }) => Promise<AskResult>;
  loadSegments: (updates: Update[]) => Promise<Segment[]>;
  incremental: (input: IncrementalInput) => Promise<IncrementalAnswer>;
  model: () => string;
}
function dependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  return { store: questionComputationStore(), loadKB: getKB, listUpdates: updates, loadAnswers: currentAnswers, loadSources: allSources, resolve: (ups) => resolver([], ups), ask: askProject, loadSegments: allSegments, incremental: recomputeIncrementally, model: () => modelFor("ask"), ...overrides };
}

export function validateQuestionIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || !ids.length || ids.length > 10 || ids.some((id) => typeof id !== "string" || !OFFICIAL_QUESTION_IDS.includes(id))) {
    throw new Error("Indiquez de 1 à 10 identifiants de questions officielles (Q01–Q10).");
  }
  return [...new Set(ids as string[])];
}

function view(answer: Answer, computation: QuestionComputation, ups: Update[], resolve: (c: Cite) => ResolvedCite, sources: Source[]): QuestionView {
  const currentSourceIds = new Set(sources.map((s) => s.id));
  const unavailableCitationSources = [...new Set([...Object.values(computation.sourceSnapshot).map((s) => s.id), ...(computation.consideredSources ?? []).map((s) => s.id)].filter((id) => !currentSourceIds.has(id)))];
  const freshness = getQuestionFreshness(answer.id, computation, ups, sources);
  const delta = getQuestionContextDelta(answer.id, computation, ups, sources);
  freshness.changedSources = [...delta.addedSources, ...delta.modifiedSources, ...delta.removedSources];
  if (freshness.changedSources.length) freshness.status = "stale";
  return { id: answer.id, question: stripQ(answer.question_en), questionFr: answer.question_fr, traps: answer.traps, baseline: { answer: answer.answer_en, answerFr: answer.answer_fr, citations: answer.citations.map(resolve) }, computation: frenchAppContent(computation), citations: computation.citations.map(resolve), unavailableCitationSources, freshness };
}

async function initialize(row: Revised<Answer>, ups: Update[], sources: Source[], store: QuestionComputationStore, segments: Segment[]): Promise<QuestionComputation> {
  const existing = await store.get(row.item.id);
  if (existing) return existing;
  // Import the existing resolved answer exactly once. This makes no LLM call and never changes the baseline.
  const record: QuestionComputation = { id: randomUUID(), questionId: row.item.id, question: stripQ(row.item.question_en), computedAt: new Date().toISOString(), origin: "existing-state", answer: row.current?.text ?? row.item.answer_en,
    citations: row.current?.citations ?? row.item.citations, includedUpdateIds: ups.map((u) => u.cs.id), includedUpdateVersions: snapshotUpdates(ups), sourceSnapshot: snapshotSources(sources, ups) };
  record.evidence = supportingEvidence(record, sources, segments) ?? undefined;
  return store.save(JSON.parse(JSON.stringify(record)), true);
}

export async function getQuestionViews(overrides: Partial<Dependencies> = {}): Promise<QuestionView[]> {
  const deps = dependencies(overrides);
  const ups = await deps.listUpdates();
  const [rows, sources, resolve, segments] = await Promise.all([deps.loadAnswers(ups), deps.loadSources(ups), deps.resolve(ups), deps.loadSegments(ups)]);
  return Promise.all(rows.filter((row) => OFFICIAL_QUESTION_IDS.includes(row.item.id)).map(async (row) => view(row.item, await initialize(row, ups, sources, deps.store, segments), ups, resolve, sources)));
}

export async function recomputeQuestions(ids: string[], onResult: (result: QuestionRecomputeResult) => void = () => {}, overrides: Partial<Dependencies> = {}, requestedMode: "incremental" | "full" = "incremental"): Promise<QuestionRecomputeResult[]> {
  const requested = validateQuestionIds(ids);
  const deps = dependencies(overrides);
  // Pin the corpus before invoking the LLM. Updates published while it runs must not be recorded as included.
  const snapshot = structuredClone(await deps.listUpdates());
  const [k, sources, rows, segments] = await Promise.all([deps.loadKB(), deps.loadSources(snapshot), deps.loadAnswers(snapshot), deps.loadSegments(snapshot)]);
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
        if (!question || !row) throw new Error("Question officielle absente de la base de connaissances.");
        const existing = await deps.store.get(id);
        const previous = existing ?? await initialize(row, snapshot, sources, deps.store, segments);
        const delta = getQuestionContextDelta(id, previous, snapshot, sources);
        const consideredSources = [...delta.addedSources, ...delta.modifiedSources, ...delta.removedSources];
        const evidence = supportingEvidence(previous, sources, segments);
        const changedIds = new Set([...delta.addedSources, ...delta.modifiedSources].map((s) => s.id));
        const changedSegments = segments.filter((s) => changedIds.has(s.src));
        const currentEvidence = (evidence ?? []).filter((e) => Object.values(sourceSnapshot).some((s) => s.id === e.src && s.sha256 === e.sha256) && segments.some((s) => s.src === e.src && s.loc === e.loc && s.text === e.text));
        let reason = !existing ? "Aucun calcul antérieur." : !evidence ? "Preuves antérieures indisponibles ou corrompues." : delta.uncertainReason;
        if (!reason && [...changedIds].some((src) => !changedSegments.some((s) => s.src === src))) reason = "Un fichier modifié n’a aucun extrait lisible.";
        if (!reason && delta.removedSources.some((s) => previous.citations.some((c) => c.src === s.id)) && !currentEvidence.length) reason = "Une source citée a été retirée et aucune preuve justificative ne subsiste.";
        const mode: "incremental" | "full" = requestedMode === "full" || reason ? "full" : "incremental";
        const audit = { id: randomUUID(), questionId: id, question: stripQ(question.question_en), computedAt: new Date().toISOString(), origin: "manual" as const,
          mode, priorComputationId: previous.id ?? `${id}:${previous.computedAt}`, consideredUpdateIds: mode === "full" ? snapshot.map((u) => u.cs.id) : delta.relevantUpdateIds,
          consideredSources, consideredSourceIds: [...new Set(consideredSources.map((s) => s.id))], model: deps.model(), fullRecomputeReason: requestedMode === "incremental" && mode === "full" ? reason : undefined };
        let computation: QuestionComputation;
        if (mode === "full") {
          const answer = await deps.ask(question.question_en, { updates: snapshot });
          if (!answer.answer.trim()) throw new Error("Aucune réponse reçue ; réponse précédente conservée.");
          const resolveSnapshot = await deps.resolve(snapshot);
          const citations = answer.citations.filter((c) => c.verified).map(resolveSnapshot).filter((c) => c.verified).map(({ src, loc, quote }) => ({ src, loc, quote }));
          computation = { ...audit, computedAt: new Date().toISOString(), answer: answer.answer, citations, includedUpdateIds: snapshot.map((u) => u.cs.id), includedUpdateVersions, sourceSnapshot,
            result: previous.answer === answer.answer ? "unchanged" : "changed", previousAnswerChanged: previous.answer !== answer.answer, missing: answer.missing, recommendations: answer.recommendations,
            changeSummary: previous.answer === answer.answer ? "Réponse inchangée après vérification complète." : "Réponse mise à jour à partir de toutes les sources actuelles." };
          computation.evidence = supportingEvidence(computation, sources, segments) ?? undefined;
          if (!citations.length) {
            computation = { ...previous, ...audit, computedAt: new Date().toISOString(), result: "uncertain", previousAnswerChanged: false,
              changeSummary: "Le recalcul complet n’a fourni aucune citation vérifiable ; réponse précédente conservée.",
              fullRecomputeReason: "À vérifier : les sources actuelles n’ont pas permis de vérifier la réponse." };
          }
        } else {
          const input: IncrementalInput = { question: stripQ(question.question_en), previous, evidence: evidence!, delta, changedSegments };
          const answer = await deps.incremental(input);
          const allowed = indexSegments([...currentEvidence, ...changedSegments]);
          // Verify only evidence the incremental model actually saw, never unrelated corpus files.
          const rawCitations = answer.result === "unchanged" && !answer.citations.length ? previous.citations : answer.citations;
          const resolved = rawCitations.map((c) => resolveCite(c, allowed));
          const uncertain = answer.result === "uncertain" || resolved.some((c) => !c.verified) || !resolved.length || (answer.result === "changed" && !answer.answer.trim());
          computation = { ...previous, ...audit, computedAt: new Date().toISOString(), promptVersion: INCREMENTAL_PROMPT_VERSION, requestHash: incrementalRequest(input).requestHash,
            result: uncertain ? "uncertain" : answer.result, changeSummary: uncertain ? answer.changeSummary || "Preuves insuffisantes pour vérifier la réponse de façon fiable." : answer.changeSummary,
            fullRecomputeReason: uncertain ? "La vérification incrémentale nécessite une révision. Recalculez depuis toutes les sources." : undefined, previousAnswerChanged: !uncertain && answer.result === "changed" && answer.answer !== previous.answer,
            evidence: evidence! };
          if (!uncertain) {
            computation.answer = answer.result === "unchanged" ? previous.answer : answer.answer;
            computation.citations = resolved.map(({ src, loc, quote }) => ({ src, loc, quote }));
            computation.includedUpdateIds = snapshot.map((u) => u.cs.id);
            computation.includedUpdateVersions = includedUpdateVersions;
            computation.sourceSnapshot = sourceSnapshot;
            computation.evidence = supportingEvidence({ ...computation, evidence: undefined }, sources, segments) ?? undefined;
          }
        }
        // Re-evaluate against the state NOW: publication/reset during a computation may already make it stale.
        const current = await deps.listUpdates();
        const [resolve, currentSources] = await Promise.all([deps.resolve(current), deps.loadSources(current)]);
        const saved = await deps.store.save(JSON.parse(JSON.stringify(computation)));
        result = { id, ok: true, computation: saved, question: view(question, saved, current, resolve, currentSources) };
      } catch (error) { result = { id, ok: false, error: (error as Error).message }; }
      results.push(result);
      onResult(result);
    }
  }));
  return requested.map((id) => results.find((r) => r.id === id)!);
}
