import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createFileQuestionStore, createRedisQuestionStore } from "../src/lib/questionComputationStore";
import { getQuestionFreshness, snapshotSources, snapshotUpdates } from "../src/lib/questionFreshness";
import { getQuestionViews, recomputeQuestions, validateQuestionIds } from "../src/lib/questionComputations";
import { curatedKB, baselineSources, type Update } from "../src/lib/store";
import type { QuestionComputation } from "../src/lib/questionTypes";
import type { Source, Cite } from "../src/lib/types";
import type { AskResult } from "../src/lib/ask";

const source = (update: string, name = "security.eml", hash = "abc"): Source => ({ id: `${update}-S1`, path: `data/updates/${update}/${name}`, kind: "eml", title: name, authority: "NEW", role: "CORE", sha256: hash, version: update });
const update = (id: string, affected = ["Q08"], name?: string, hash?: string): Update => ({ cs: { id, publishedAt: "2026-10-03T21:01:00Z", filename: name ?? "security.eml", summary: "Test update", affected: { answers: affected, conditions: [], actions: [] }, problemStatus: [], priorDecisions: [], newProposals: [], newDecisions: [], conditionChanges: [], newActions: [], guardrails: { approvalInvented: false, otherConditionsClosed: false, beyondContractEnd: false, notes: [] } }, sources: [source(id, name, hash)], segments: [] });
const computation = (ups: Update[] = []): QuestionComputation => ({ questionId: "Q08", computedAt: "2026-10-03T20:00:00Z", answer: "Previous answer", citations: [], includedUpdateIds: ups.map((u) => u.cs.id), includedUpdateVersions: snapshotUpdates(ups), sourceSnapshot: snapshotSources(ups.flatMap((u) => u.sources), ups) });
const resolved = (c: Cite) => ({ ...c, loc: c.loc ?? "L1", label: c.src, verified: true });
const answer = (text: string): AskResult => ({ answer: text, citations: [{ src: "SEC-210", loc: "L1", quote: "verified quote", label: "SEC-210", verified: true }, { src: "BAD", loc: "L1", quote: "unverified quote", label: "BAD", verified: false }], missing: [], recommendations: [], status: "full", dropped: 0, usage: null });

async function tempStore(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nova-question-tests-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("nova-question-tests-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, store: createFileQuestionStore(root) };
}

test("freshness uses relevant IDs, not clocks; unrelated additions stay fresh", () => {
  const initial = computation();
  assert.equal(getQuestionFreshness("Q08", initial, []).status, "fresh");
  const irrelevant = update("U001", ["Q01"]);
  assert.equal(getQuestionFreshness("Q08", initial, [irrelevant]).status, "fresh");
  const relevant = update("U002"); relevant.cs.publishedAt = "2020-01-01T00:00:00Z";
  const stale = getQuestionFreshness("Q08", initial, [irrelevant, relevant]);
  assert.equal(stale.status, "stale"); assert.deepEqual(stale.changedUpdates, ["U002"]);
  assert.equal(stale.changedSources[0].filename, "security.eml"); assert.equal(stale.changedSources[0].changeType, "added");
  assert.equal(getQuestionFreshness("Q08", computation([irrelevant, relevant]), [irrelevant, relevant]).status, "fresh");
});

test("reset and reused IDs invalidate the old corpus; actual files are deduplicated", () => {
  const original = update("U001"); const cached = computation([original]);
  const reset = getQuestionFreshness("Q08", cached, []);
  assert.equal(reset.status, "stale"); assert.equal(reset.changedSources[0].changeType, "removed");
  const replacement = update("U001", ["Q01"], "different.eml", "different");
  const changed = getQuestionFreshness("Q08", cached, [replacement]);
  assert.equal(changed.status, "stale");
  assert.ok(changed.changedSources.some((s) => s.filename === "security.eml" && s.changeType === "removed"));
  const modified = update("U002", ["Q08"], "security.eml", "xyz");
  const newer = update("U003", ["Q08"], "security.eml", "xyz");
  const files = getQuestionFreshness("Q08", cached, [original, modified, newer]).changedSources;
  assert.equal(files.length, 1); assert.equal(files[0].changeType, "modified");
  const unknown = update("U002", ["Q08"], "security.eml", "");
  assert.equal(getQuestionFreshness("Q08", cached, [original, unknown]).changedSources[0].changeType, "changed");
});

test("filesystem caches and history survive new store instances; initialization cannot overwrite", async (t) => {
  const { root, store } = await tempStore(t);
  const first = computation(); await store.save(first, true);
  const next = { ...first, answer: "New answer", computedAt: "2026-10-03T22:00:00Z" };
  await store.save(next); await store.save(first, true);
  await store.save({ ...first, answer: "Older computation finishing its persistence late" });
  const restarted = createFileQuestionStore(root);
  assert.deepEqual(await restarted.get("Q08"), next);
  assert.equal((await restarted.history("Q08")).length, 3);
  assert.equal((await restarted.getAll()).length, 1);
  await assert.rejects(() => restarted.get("../../baseline/kb"));
});

test("initial page imports existing resolved answers once, with no LLM call; publication does not replace them", async (t) => {
  const { store } = await tempStore(t); const k = curatedKB(); let ups = [update("U001")];
  ups[0].cs.revisedAnswers = [{ id: "Q08", text: "Existing resolved update answer", citations: [] }];
  let calls = 0;
  const deps = { store, listUpdates: async () => ups, loadAnswers: async () => k.answers.map((item) => ({ item, current: ups[0]?.cs.revisedAnswers?.find((a) => a.id === item.id) ? { text: "Existing resolved update answer", citations: [], changedIn: "U001" } : undefined })), loadSources: async (u: Update[]) => [...baselineSources(), ...u.flatMap((x) => x.sources)], resolve: async () => resolved, ask: async () => { calls++; return answer("Should never be called"); } };
  const first = await getQuestionViews(deps);
  assert.equal(first.length, 10); assert.ok(first.every((q) => q.computation.computedAt && q.freshness.status === "fresh"));
  const cached = first.find((q) => q.id === "Q08")!.computation;
  assert.equal(cached.answer, "Existing resolved update answer");
  ups = [...ups, update("U002")]; ups[1].cs.revisedAnswers = [{ id: "Q08", text: "Silently revised answer", citations: [] }];
  const second = await getQuestionViews(deps);
  assert.equal(second.find((q) => q.id === "Q08")!.freshness.status, "stale");
  assert.deepEqual(second.find((q) => q.id === "Q08")!.computation, cached);
  assert.equal(second.find((q) => q.id === "Q01")!.freshness.status, "fresh"); assert.equal(calls, 0);
});

test("batch concurrency is two, partial failure preserves old answer, citations are verified, baseline unchanged", async (t) => {
  const { store } = await tempStore(t); const k = curatedKB();
  const baselinePath = path.join(process.cwd(), "data/baseline/kb.json");
  const hash = async () => createHash("sha256").update(await fs.readFile(baselinePath)).digest("hex");
  const before = await hash(); let active = 0, max = 0, calls = 0;
  const deps = { store, loadKB: async () => k, listUpdates: async () => [], loadAnswers: async () => k.answers.map((item) => ({ item })), loadSources: async () => baselineSources(), resolve: async () => resolved, model: () => "test-model", ask: async (q: string) => { calls++; active++; max = Math.max(max, active); await new Promise((r) => setTimeout(r, 10)); active--; if (q === k.answers.find((a) => a.id === "Q03")!.question_en) throw new Error("Injected LLM failure"); return answer("Recomputed answer"); } };
  await getQuestionViews(deps); const previous = await store.get("Q03");
  const events: string[] = [];
  const results = await recomputeQuestions(k.answers.map((a) => a.id), (r) => events.push(r.id), deps);
  assert.equal(calls, 10); assert.equal(max, 2); assert.equal(events.length, 10);
  assert.equal(results.filter((r) => r.ok).length, 9); assert.deepEqual(await store.get("Q03"), previous);
  const q08 = await store.get("Q08"); assert.equal(q08!.citations.length, 1); assert.equal(q08!.citations[0].src, "SEC-210");
  assert.equal(q08!.previousAnswerChanged, true); assert.equal((await store.history("Q08")).length, 2);
  assert.equal(await hash(), before);
});

test("publication during recomputation is not silently recorded as included", async (t) => {
  const { store } = await tempStore(t); const k = curatedKB(); let ups = [update("U001")];
  const results = await recomputeQuestions(["Q08"], undefined, { store, loadKB: async () => k, listUpdates: async () => ups, loadAnswers: async () => k.answers.map((item) => ({ item })), loadSources: async (u) => u.flatMap((x) => x.sources), resolve: async () => resolved, model: () => "test", ask: async (_, opts) => { assert.deepEqual(opts.updates.map((u) => u.cs.id), ["U001"]); ups = [...ups, update("U002")]; return answer("Pinned result"); } });
  assert.ok(results[0].ok);
  if (results[0].ok) { assert.deepEqual(results[0].computation.includedUpdateIds, ["U001"]); assert.equal(results[0].question.freshness.status, "stale"); }
});

test("manual recomputation acknowledges relevant updates and persists an unchanged answer", async (t) => {
  const { root, store } = await tempStore(t); const k = curatedKB(); let ups: Update[] = [];
  const deps = { store, loadKB: async () => k, listUpdates: async () => ups, loadAnswers: async () => k.answers.map((item) => ({ item })), loadSources: async (u: Update[]) => u.flatMap((x) => x.sources), resolve: async () => resolved, model: () => "test", ask: async () => answer(k.answers.find((q) => q.id === "Q08")!.answer_en) };
  await getQuestionViews(deps);
  const original = await store.get("Q08");
  ups = [update("U001")];
  assert.equal((await getQuestionViews(deps)).find((q) => q.id === "Q08")!.freshness.status, "stale");
  const result = (await recomputeQuestions(["Q08"], undefined, deps))[0];
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.question.freshness.status, "fresh");
    assert.deepEqual(result.question.freshness.changedSources, []);
    assert.equal(result.computation.previousAnswerChanged, false);
    assert.deepEqual(result.computation.includedUpdateIds, ["U001"]);
    assert.notEqual(result.computation.computedAt, original!.computedAt);
    assert.deepEqual(await createFileQuestionStore(root).get("Q08"), result.computation);
  }
});

test("API input validation deduplicates official IDs and rejects invalid/empty/oversized lists", () => {
  assert.deepEqual(validateQuestionIds(["Q08", "Q08", "Q01"]), ["Q08", "Q01"]);
  for (const value of [[], null, "Q08", ["Q11"], ["Q01", 2], Array(11).fill("Q01")]) assert.throws(() => validateQuestionIds(value));
});

test("Redis adapter persists arrays and history without cjson changing empty arrays to objects", async () => {
  const originalFetch = global.fetch; const values = new Map<string, string>();
  global.fetch = (async (_, init) => {
    const args = JSON.parse(String(init!.body)); let result: string | null = null;
    if (args[0] === "GET") result = values.get(args[1]) ?? null;
    if (args[0] === "EVAL") {
      assert.ok(args[1].includes("state.current = ARGV[1]"));
      const [, , , key, record, ifAbsent] = args;
      const state = JSON.parse(values.get(key) ?? '{"history":[]}');
      if (ifAbsent === "1" && state.current) result = state.current;
      else { state.current = record; state.history.push(record); values.set(key, JSON.stringify(state)); result = record; }
    }
    return Response.json({ result });
  }) as typeof fetch;
  try {
    const store = createRedisQuestionStore("https://test.invalid", "test-only", "isolated");
    const first = computation(); await store.save(first, true);
    await store.save({ ...first, answer: "Redis recomputed" }); await store.save(first, true);
    const restarted = createRedisQuestionStore("https://test.invalid", "test-only", "isolated");
    assert.equal((await restarted.get("Q08"))!.answer, "Redis recomputed");
    assert.deepEqual((await restarted.get("Q08"))!.citations, []);
    assert.equal((await restarted.history("Q08")).length, 2);
  } finally { global.fetch = originalFetch; }
});
