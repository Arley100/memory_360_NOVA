import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { chatMeta, chatProject } from "../src/lib/chat";
import { chatContext, type ChatMessage } from "../src/lib/chatTypes";
import { initialChatState, restoreChatState } from "../src/lib/chatState";
import { snapshotUpdates } from "../src/lib/questionFreshness";
import { updateFingerprint } from "../src/lib/updateFingerprint";
import { updateStore, type Update } from "../src/lib/updateStore";
import { GET } from "../src/app/api/chat/meta/route";

const update = (id = "U001", text = "Event A"): Update => ({
  cs: { id, publishedAt: "2026-10-03T21:01:00Z", filename: "event.eml", summary: text,
    affected: { answers: [], conditions: [], actions: [] }, problemStatus: [], priorDecisions: [], newProposals: [], newDecisions: [], conditionChanges: [], newActions: [],
    guardrails: { approvalInvented: false, otherConditionsClosed: false, beyondContractEnd: false, notes: [] } },
  sources: [{ id: `${id}-S1`, path: `data/updates/${id}/event.eml`, kind: "eml", title: "Event", authority: "NEW", role: "CORE", sha256: "", version: id }],
  segments: [{ src: `${id}-S1`, loc: "L1", text }],
});

test("chat reuses the existing full persisted-update fingerprint and is stable across serialization", async () => {
  const original = update();
  const expected = createHash("sha256").update(JSON.stringify({ cs: original.cs, sources: original.sources, segments: original.segments })).digest("hex");
  assert.equal(updateFingerprint(original), expected);
  assert.equal(snapshotUpdates([original]).U001, expected);
  const meta = await chatMeta([original]);
  assert.deepEqual(meta.updates, [{ id: "U001", fingerprint: expected }]);
  assert.equal(meta.contextKey, `current|U001:${expected}`);
  assert.deepEqual(await chatMeta(JSON.parse(JSON.stringify([original]))), meta);
  for (const change of [
    (u: Update) => { u.cs.summary = "Changed decision"; },
    (u: Update) => { u.sources[0].sha256 = "different SHA"; },
    (u: Update) => { u.sources[0].path = "different/path.eml"; },
    (u: Update) => { u.sources[0].version = "v2"; },
    (u: Update) => { u.segments[0].text = "Different evidence with the same timestamp and empty SHA"; },
  ]) {
    const modified = structuredClone(original); change(modified);
    assert.notEqual((await chatMeta([modified])).contextKey, meta.contextKey);
  }
});

test("context keys preserve supplied published order and baseline/empty-current identities", async () => {
  const meta = await chatMeta([update("U002"), update("U001")]);
  assert.deepEqual(meta.updateIds, ["U002", "U001"]);
  assert.equal(meta.latestUpdateId, "U001");
  assert.equal(meta.contextKey, chatContext("current", meta.updates).contextKey);
  assert.deepEqual(chatContext("baseline", meta.updates), { mode: "baseline", updateIds: [], contextKey: "baseline" });
  assert.equal((await chatMeta([])).contextKey, "current");
});

test("published A, reset, reused U001 B, and recheck preserve historical answers across reload", async () => {
  const originalCwd = process.cwd();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nova-chat-context-"));
  const originalFetch = global.fetch;
  const envKeys = ["LLM_PROVIDER", "OPENAI_API_KEY", "LLM_MODEL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"] as const;
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  let latest: Update[] = [];
  try {
    for (const key of envKeys) delete process.env[key];
    process.env.LLM_PROVIDER = "openai"; process.env.OPENAI_API_KEY = "test-only"; process.env.LLM_MODEL = "test-model";
    // No real provider requests. Simulate newer metadata during generation to test snapshot pinning.
    global.fetch = (async () => {
      latest = [update("U001", "Event B")];
      return Response.json({ choices: [{ message: { content: JSON.stringify({ language: "en", blocks: [{ type: "missing", text: "Not documented in the current project corpus.", citations: [] }], missing: [], followUps: [] }) } }] });
    }) as unknown as typeof fetch;
    process.chdir(root);
    const store = updateStore();
    await store.publish("U001", update(), []);
    const a = await store.list();
    const metaA = await chatMeta(a);
    process.chdir(originalCwd);
    const answerA = await chatProject("What changed?", "current", [], { snapshot: a });
    assert.equal(answerA.context.contextKey, metaA.contextKey);
    assert.notEqual(answerA.context.contextKey, (await chatMeta(latest)).contextKey);
    const baseline = await chatProject("What changed?", "baseline", [], { snapshot: a });
    assert.equal(baseline.context.contextKey, "baseline");
    assert.deepEqual(baseline.context.updateIds, []);
    const before = JSON.stringify(answerA);
    assert.equal(await store.reset(), 1);
    const resetMeta = await chatMeta();
    assert.equal(resetMeta.contextKey, "current");
    assert.notEqual(answerA.context.contextKey, resetMeta.contextKey);
    await store.publish("U001", update("U001", "Event B"), []);
    const response = await GET();
    assert.equal(response.headers.get("cache-control"), "no-store");
    const metaB = await response.json();
    assert.deepEqual(metaB.updateIds, metaA.updateIds);
    assert.notEqual(metaB.contextKey, metaA.contextKey);
    assert.deepEqual(Object.keys(metaB.updates[0]).sort(), ["fingerprint", "id"]);
    const recheck = await chatProject(answerA.question, "current", [], { snapshot: await store.list() });
    assert.equal(recheck.context.contextKey, metaB.contextKey);
    assert.notEqual(recheck.id, answerA.id);
    assert.equal(JSON.stringify(answerA), before);
    const messages: ChatMessage[] = [answerA, baseline, recheck].map((answer) => ({ id: answer.id, role: "assistant", createdAt: answer.answeredAt, answer }));
    const restored = restoreChatState(JSON.stringify({ ...initialChatState, messages, activeConversationId: "preserved-conversation" }));
    assert.deepEqual(restored.messages, JSON.parse(JSON.stringify(messages)));
    assert.equal(restored.activeConversationId, "preserved-conversation");
    assert.deepEqual(restored.messages.filter((m) => m.answer?.context.mode === "current" && m.answer.context.contextKey !== metaB.contextKey).map((m) => m.id), [answerA.id]);
    const legacy = structuredClone(messages[0]); legacy.answer!.context.contextKey = "current|U001";
    const legacyRestored = restoreChatState(JSON.stringify({ ...restored, messages: [legacy] }));
    assert.deepEqual(legacyRestored.messages, JSON.parse(JSON.stringify([legacy])));
    assert.notEqual(legacyRestored.messages[0].answer!.context.contextKey, metaB.contextKey);
  } finally {
    process.chdir(originalCwd); global.fetch = originalFetch;
    for (const key of envKeys) { if (previousEnv[key] === undefined) delete process.env[key]; else process.env[key] = previousEnv[key]; }
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("nova-chat-context-"));
    await fs.rm(root, { recursive: true, force: true });
  }
});
