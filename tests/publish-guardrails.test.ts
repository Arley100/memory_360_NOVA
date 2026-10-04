import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { POST as publish } from "../src/app/api/update/publish/route";
import { POST as reset } from "../src/app/api/update/reset/route";
import { updateStore } from "../src/lib/updateStore";
import { allSegments, currentAnswers, currentConditions, getKB } from "../src/lib/store";
import { applyGuardrails, emptyChangeSet } from "../src/lib/update";
import type { Segment } from "../src/lib/types";

test("publish guardrails protect edits, retain drafts, and preserve baseline/current-state behavior", async (t) => {
  const original = process.cwd();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nova-publish-tests-"));
  const env = { DEMO_CODE: process.env.DEMO_CODE, KB_SOURCE: process.env.KB_SOURCE,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL, KV_REST_API_URL: process.env.KV_REST_API_URL };
  t.after(async () => {
    process.chdir(original);
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("nova-publish-tests-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  for (const name of ["baseline/kb.json", "registry.json", "segments.json"]) {
    await fs.mkdir(path.dirname(path.join(root, "data", name)), { recursive: true });
    await fs.copyFile(path.join(original, "data", name), path.join(root, "data", name));
  }
  process.chdir(root);
  delete process.env.DEMO_CODE; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.KV_REST_API_URL;
  process.env.KB_SOURCE = "curated";
  const store = updateStore();
  const k = await getKB();
  const baseline = await allSegments([]);
  const before = JSON.stringify(k);
  const hashBaseline = async () => Promise.all(["baseline/kb.json", "registry.json", "segments.json"].map(async (name) =>
    createHash("sha256").update(await fs.readFile(path.join(root, "data", name))).digest("hex")));
  const hashes = await hashBaseline();
  const fresh: Segment[] = [
    { src: "NEW", loc: "L1", text: "Boreal proposes October 29 for go-live. October 22 remains approved." },
    { src: "NEW", loc: "L2", text: "Boreal delivered the SEC-210 fix. Internal security validation is pending." },
  ];
  const cite = (i: number) => ({ src: "NEW", loc: fresh[i].loc, quote: fresh[i].text });
  const facts = { conditions: k.conditions, goLive: k.goLive, contractEnd: k.goLive.contractEnd };
  const raw = emptyChangeSet("update.txt");
  raw.newProposals = [{ text: "October 29 is proposed for go-live.", citations: [cite(0)] }];
  raw.revisedAnswers = [{ id: "Q01", text: "October 29 is proposed; October 22 remains approved.", citations: [cite(0)] }];
  const safe = applyGuardrails(raw, baseline, fresh, facts);
  const save = (id: string, segments = fresh) => store.saveDraft(id,
    { filename: "update.txt", files: ["update.txt"], segments }, [{ name: "update.txt", data: Buffer.from("original upload") }]);
  let requestNo = 0;
  const send = (id: string, cs: unknown) => publish(new Request("http://localhost/api/update/publish", {
    method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `test-${requestNo++}` }, body: JSON.stringify({ draftId: id, changeset: cs }),
  }));

  await t.test("A/E: edited proposal cannot become approved; repeated attempts have stable warnings", async () => {
    await save("proposal");
    const edited = structuredClone(safe);
    edited.revisedAnswers![0].text = "Oct 29 is the approved date.";
    const first = await send("proposal", edited);
    assert.equal(first.status, 409);
    const result = await first.json();
    assert.equal(result.reviewRequired, true);
    assert.ok(result.warnings.some((n: string) => n.includes("proposed date")));
    assert.deepEqual((await (await send("proposal", edited)).json()).warnings, result.warnings);
    assert.equal(edited.revisedAnswers![0].text, "Oct 29 is the approved date.");
    assert.ok(await store.loadDraft("proposal"));
    assert.equal((await store.list()).length, 0);
    assert.deepEqual(applyGuardrails(result.guardedChangeSet, baseline, fresh, facts).guardrails.notes, result.guardedChangeSet.guardrails.notes);
  });

  await t.test("B: delivered fix cannot become validated in a condition or narrative", async () => {
    await save("delivery");
    const edited = structuredClone(safe);
    edited.conditionChanges = [{ id: 1, status: "met", text: "SEC-210 validated.", citations: [cite(1)] }];
    edited.revisedAnswers = [{ id: "Q08", text: "SEC-210 is validated and accepted.", citations: [cite(1)] }];
    const response = await send("delivery", edited);
    assert.equal(response.status, 409);
    const result = await response.json();
    assert.equal(result.guardedChangeSet.conditionChanges.length, 0);
    assert.ok(result.warnings.some((n: string) => n.startsWith("Q08:")));
    edited.conditionChanges = [];
    assert.equal((await send("delivery", edited)).status, 409);
    assert.ok(await store.loadDraft("delivery"));
  });

  await t.test("invalid citations and material reclassification require review", async () => {
    await save("invalid-cites");
    const edited = structuredClone(safe);
    edited.newDecisions = [{ text: "October 29 approved.", citations: [{ src: "NEW", quote: "The committee approved October 29." }] }];
    const response = await send("invalid-cites", edited);
    assert.equal(response.status, 409);
    assert.ok((await response.json()).warnings.some((n: string) => n.includes("citation(s) removed")));
    assert.equal((await send("invalid-cites", { revisedAnswers: "bad" })).status, 400);
  });

  await t.test("C/D: wording-only edits and safe analyzed ChangeSets publish the final guarded version", async () => {
    await save("wording");
    const edited = structuredClone(safe);
    edited.revisedAnswers![0].text = "October 29 remains a proposal; October 22 remains approved.";
    assert.equal((await send("wording", edited)).status, 200);
    assert.equal(await store.loadDraft("wording"), null);
    const saved = (await store.list())[0].cs;
    assert.equal(saved.revisedAnswers![0].text, edited.revisedAnswers![0].text);
    assert.equal(saved.revisedAnswers![0].citations[0].src, "U001-S1");
    assert.equal(saved.revisedAnswers![0].citations[0].loc, "L1");
    await save("safe");
    assert.equal((await send("safe", safe)).status, 200);
    assert.equal((await currentAnswers()).find((a) => a.item.id === "Q01")?.current?.changedIn, "U002");
  });

  await t.test("fresh published source and approved-date state are used on each attempt", async () => {
    const decisionSegments = [{ src: "NEW", loc: "L1", text: "The NOVA steering committee approved go-live on October 29." }];
    await save("decision", decisionSegments);
    const decision = emptyChangeSet("update.txt");
    decision.newDecisions = [{ text: "Go-live approved for October 29.", authority: "NOVA steering committee", citations: [{ src: "NEW", quote: decisionSegments[0].text }] }];
    assert.equal((await send("decision", decision)).status, 200);
    await save("current-date");
    const edited = emptyChangeSet("update.txt");
    edited.revisedAnswers = [{ id: "Q01", text: "October 29 is the approved go-live date.", citations: [{ src: "U003-S1", quote: decisionSegments[0].text }] }];
    assert.equal((await send("current-date", edited)).status, 200);
  });

  await t.test("F/G: baseline is unchanged and reset restores current state", async () => {
    assert.deepEqual(await hashBaseline(), hashes);
    assert.equal(JSON.stringify(await getKB()), before);
    assert.deepEqual((await currentConditions()).map((c) => c.status), k.conditions.map((c) => c.status));
    const response = await reset(new Request("http://localhost/api/update/reset", { method: "POST", headers: { "x-forwarded-for": "reset-test" } }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).removed, 4);
    assert.equal((await store.list()).length, 0);
    assert.ok((await currentAnswers()).every((a) => !a.current));
    assert.deepEqual(await hashBaseline(), hashes);
  });
});
