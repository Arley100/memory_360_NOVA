import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { POST as analyze } from "../src/app/api/update/analyze/route";
import { POST as publish } from "../src/app/api/update/publish/route";
import { publishedSources } from "../src/lib/updateSources";
import { createFileUpdateStore, createRedisUpdateStore, updateStore, type Draft, type Update } from "../src/lib/updateStore";
import { createFileQuestionStore } from "../src/lib/questionComputationStore";
import { getQuestionContextDelta, getQuestionFreshness, snapshotSources, snapshotUpdates } from "../src/lib/questionFreshness";
import { recomputeQuestions } from "../src/lib/questionComputations";
import { baselineSources, baselineSegments, curatedKB } from "../src/lib/store";
import { emptyChangeSet } from "../src/lib/update";
import type { QuestionComputation } from "../src/lib/questionTypes";
import type { Source } from "../src/lib/types";

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const fileDraft = (name: string): Draft => ({ filename: name, files: [name], segments: [{ src: "NEW", loc: "L1", text: "Retest failed." }] });
const update = (id: string, sources: Source[]): Update => {
  const cs = emptyChangeSet(sources[0].path); cs.id = id; cs.affected.answers = ["Q08"];
  return { cs, sources, segments: sources.map((s) => ({ src: s.id, loc: "L1", text: "Retest failed." })) };
};
const computation = (sources: Source[], ups: Update[] = []): QuestionComputation => ({ questionId: "Q08", computedAt: "2026-10-01T00:00:00Z", answer: "Previous answer", citations: [], sourceSnapshot: snapshotSources(sources, ups), includedUpdateIds: ups.map((u) => u.cs.id), includedUpdateVersions: snapshotUpdates(ups) });
async function temp(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nova-fingerprints-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("nova-fingerprints-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

test("real analyze/publish hashes email and attachment bytes, empty files, and preserves baseline", async (t) => {
  const baseline = structuredClone(baselineSources()); baselineSegments(); curatedKB();
  const registry = path.join(process.cwd(), "data/registry.json"); const before = await fs.readFile(registry);
  const root = await temp(t); const originalCwd = process.cwd();
  const keys = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DEMO_CODE", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
  const env = keys.map((key) => [key, process.env[key]] as const);
  try {
    for (const key of keys) delete process.env[key];
    process.chdir(root);
    const attachment = Buffer.from("Retest failed.\r\n");
    const email = Buffer.from([
      "Subject: Security retest", "From: security@example.com", "MIME-Version: 1.0",
      'Content-Type: multipart/mixed; boundary="test"', "", "--test", "Content-Type: text/plain", "", "Retest failed.",
      "--test", 'Content-Type: text/plain; name="SEC-210.txt"', 'Content-Disposition: attachment; filename="SEC-210.txt"',
      "Content-Transfer-Encoding: base64", "", attachment.toString("base64"), "--test--", "",
    ].join("\r\n"));
    const form = new FormData();
    form.append("file", new File([email], "security_retest.eml"));
    form.append("file", new File([], "empty.txt"));
    const response = await analyze(new Request("http://localhost/api/update/analyze", { method: "POST", body: form }));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    const result = events.find((e) => e.type === "result"); assert.ok(result, JSON.stringify(events));
    const loaded = await updateStore().loadDraft(result.draftId); assert.ok(loaded);
    assert.equal(loaded.draft.sourceHashes?.NEW, hash(email));
    assert.equal(loaded.draft.sourceHashes?.["NEW>SEC-210.txt"], hash(attachment));
    const cs = result.changeset; cs.affected.answers = ["Q08"];
    const published = await publish(new Request("http://localhost/api/update/publish", { method: "POST", body: JSON.stringify({ draftId: result.draftId, changeset: cs }) }));
    assert.equal(published.status, 200);
    const [u] = await updateStore().list(); assert.equal(u.sources.length, 3);
    assert.equal(u.sources.find((s) => s.id === "U001-S1")?.sha256, hash(email));
    assert.equal(u.sources.find((s) => s.parent)?.sha256, hash(attachment));
    assert.equal(u.sources.find((s) => s.path.endsWith("empty.txt"))?.sha256, hash(Buffer.alloc(0)));
    assert.ok(u.sources.every((s) => /^[a-f0-9]{64}$/.test(s.sha256) && s.version === "U001"));
    assert.deepEqual(baselineSources(), baseline);
    assert.deepEqual(await fs.readFile(registry), before);
  } finally {
    process.chdir(originalCwd);
    for (const [key, value] of env) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("baseline replacement and added source form an exact relevant incremental delta", async (t) => {
  const sources = baselineSources(); const before = structuredClone(sources);
  const ticket = sources.find((s) => s.id === "SEC-210")!;
  const bytes = Buffer.from("Retest failed.");
  const modified = publishedSources("U003", fileDraft("SEC-210.txt"), [{ name: "SEC-210.txt", data: bytes }], sources);
  assert.equal(modified[0].logicalPath, ticket.path);
  assert.notEqual(modified[0].sha256, ticket.sha256);
  assert.equal(modified[0].version, "U003");
  const added = publishedSources("U003", fileDraft("security_retest.eml"), [{ name: "security_retest.eml", data: bytes }], sources);
  // Model a multi-file publication, with distinct source IDs as assigned by ingestion.
  added[0].id = "U003-S1>security_retest.eml";
  const u = update("U003", [...modified, ...added]);
  const initial = computation(sources); const all = [...sources, ...u.sources];
  const delta = getQuestionContextDelta("Q08", initial, [u], all);
  assert.equal(delta.uncertainReason, undefined);
  assert.deepEqual(delta.modifiedSources.map((s) => [s.filename, s.updateId]), [["SEC-210.txt", "U003"]]);
  assert.deepEqual(delta.addedSources.map((s) => [s.filename, s.updateId]), [["security_retest.eml", "U003"]]);
  assert.equal(getQuestionFreshness("Q01", initial, [u], all).status, "fresh");
  assert.equal(getQuestionFreshness("Q08", initial, [u], all).status, "stale");
  const k = curatedKB(); const store = createFileQuestionStore(await temp(t));
  const excerpt = baselineSegments().find((s) => s.src === ticket.id)!;
  initial.citations = [{ src: ticket.id, loc: excerpt.loc, quote: excerpt.text }]; await store.save(initial);
  const result = (await recomputeQuestions(["Q08"], undefined, {
    store, loadKB: async () => k, listUpdates: async () => [u], loadSources: async () => all,
    loadAnswers: async () => k.answers.map((item) => ({ item })), loadSegments: async () => [...baselineSegments(), ...u.segments],
    model: () => "test", ask: async () => { throw new Error("Clean delta must stay incremental"); },
    incremental: async (input) => {
      assert.equal(input.delta.modifiedSources[0].filename, "SEC-210.txt"); assert.equal(input.delta.uncertainReason, undefined);
      assert.ok(input.changedSegments.some((s) => s.src === modified[0].id));
      return { result: "changed", answer: "Retest failed.", citations: [{ src: modified[0].id, loc: "L1", quote: "Retest failed." }], changeSummary: "Retest failed.", consideredSourceIds: [modified[0].id] };
    },
  }))[0];
  assert.ok(result.ok, JSON.stringify(result));
  if (result.ok) { assert.equal(result.computation.mode, "incremental"); assert.equal(result.question.freshness.status, "fresh"); }
  assert.deepEqual(sources, before);
});

test("same bytes at the same logical path are unchanged across publication versions", () => {
  const bytes = Buffer.from("Retest failed."); const draft = fileDraft("SEC-210.txt");
  const first = update("U001", publishedSources("U001", draft, [{ name: draft.filename, data: bytes }], []));
  const second = update("U002", publishedSources("U002", draft, [{ name: draft.filename, data: bytes }], first.sources));
  const previous = computation(first.sources, [first]); previous.citations = [{ src: first.sources[0].id, loc: "L1", quote: "Retest failed." }];
  assert.equal(first.sources[0].sha256, second.sources[0].sha256);
  assert.notEqual(first.sources[0].version, second.sources[0].version);
  const delta = getQuestionContextDelta("Q08", previous, [first, second], [...first.sources, ...second.sources]);
  assert.deepEqual(delta.addedSources, []); assert.deepEqual(delta.modifiedSources, []);
  // Relevant ChangeSet still needs acknowledgement, even when content is identical.
  assert.match(delta.uncertainReason!, /aucun changement de source identifiable/);
  assert.equal(getQuestionContextDelta("Q08", previous, [], []).removedSources[0].filename, "SEC-210.txt");
});

test("legacy missing fingerprints fall back safely; ambiguous baseline names do not merge", () => {
  const bytes = Buffer.from("Retest failed."); const draft = fileDraft("SEC-210.txt");
  const current = update("U002", publishedSources("U002", draft, [{ name: draft.filename, data: bytes }], []));
  const legacy = update("U001", [{ ...current.sources[0], id: "U001-S1", path: "data/updates/U001/SEC-210.txt", sha256: "", version: "U001" }]);
  const delta = getQuestionContextDelta("Q08", computation(legacy.sources, [legacy]), [legacy, current], [...legacy.sources, ...current.sources]);
  assert.equal(delta.modifiedSources[0].changeType, "changed"); assert.match(delta.uncertainReason!, /Empreintes.*incomplètes/);
  const missing = update("U003", [{ ...current.sources[0], sha256: "", version: "U003" }]);
  assert.match(getQuestionContextDelta("Q08", computation([]), [missing], missing.sources).uncertainReason!, /Empreintes.*incomplètes/);
  const baseline = baselineSources().find((s) => s.id === "SEC-210")!;
  const ambiguous = [baseline, { ...baseline, id: "OTHER", path: "corpus/other/SEC-210.txt" }];
  assert.equal(publishedSources("U001", draft, [{ name: draft.filename, data: bytes }], ambiguous)[0].logicalPath, "data/updates/SEC-210.txt");
  assert.throws(() => publishedSources("U001", draft, [], []), /Téléversez à nouveau le fichier/);
});

test("local and Redis draft/publish round trips preserve the same original fingerprint, including oversized hosted files", async (t) => {
  const originalFetch = global.fetch; const values = new Map<string, string>();
  global.fetch = (async (_, init) => {
    const [op, key, value] = JSON.parse(String(init?.body)); let result: string | null = null;
    if (op === "SET") { values.set(key, value); result = "OK"; }
    else if (op === "GET") result = values.get(key) ?? null;
    else if (op === "DEL") values.delete(key);
    else throw new Error(`Unexpected storage operation ${op}`);
    return Response.json({ result });
  }) as typeof fetch;
  try {
    const local = createFileUpdateStore(await temp(t)); const redis = createRedisUpdateStore("https://test.invalid", "test-only");
    for (const bytes of [Buffer.from("Retest failed.\r\n"), Buffer.alloc(4 * 1024 * 1024 + 1, 0x61)]) {
      const id = bytes.length > 100 ? "U002" : "U001";
      const draft = { ...fileDraft("SEC-210.txt"), sourceHashes: { NEW: hash(bytes) } };
      const stored = [{ name: draft.filename, data: bytes }];
      for (const store of [local, redis]) {
        await store.saveDraft(id, draft, stored); const loaded = await store.loadDraft(id); assert.ok(loaded);
        const sources = publishedSources(id, loaded.draft, loaded.files, []);
        assert.equal(sources[0].sha256, hash(bytes));
        await store.publish(id, update(id, sources), loaded.files);
        const published = (await store.list()).find((u) => u.cs.id === id)!;
        assert.equal(published.sources[0].sha256, hash(bytes));
        if (store.kind === "file" || bytes.length < 100) assert.deepEqual(await store.readFile(id, draft.filename), bytes);
        else { assert.equal(loaded.files.length, 0); assert.equal(await store.readFile(id, draft.filename), null); }
      }
    }
  } finally { global.fetch = originalFetch; }
});
