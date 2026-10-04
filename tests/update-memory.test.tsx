import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import Timeline from "../src/app/timeline/page";
import Decisions from "../src/app/decisions/page";
import SourceView from "../src/app/sources/[id]/page";
import { POST as publish } from "../src/app/api/update/publish/route";
import { POST as reset } from "../src/app/api/update/reset/route";
import { GET as preview } from "../src/app/api/segment/route";
import { baselineSegments, baselineSources, curatedKB, updates } from "../src/lib/store";
import { updateStore, type Update } from "../src/lib/updateStore";
import { decisionLineages, updateTimeline } from "../src/lib/updateMemory";
import { emptyChangeSet } from "../src/lib/update";

test("published proposals, formal decisions, evidence, refresh and reset preserve baseline history", async () => {
  const kb = structuredClone(curatedKB()); baselineSegments(); baselineSources();
  const originalCwd = process.cwd();
  const baselinePath = path.join(originalCwd, "data/baseline/kb.json");
  const before = await fs.readFile(baselinePath);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nova-update-memory-"));
  const keys = ["KB_SOURCE", "DEMO_CODE", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
  const env = keys.map((key) => [key, process.env[key]] as const);
  try {
    keys.forEach((key) => delete process.env[key]); process.env.KB_SOURCE = "curated";
    process.chdir(root);
    const initialTimeline = renderToStaticMarkup(await Timeline());
    const initialDecisions = renderToStaticMarkup(await Decisions());
    const publishItem = async (draftId: string, text: string, formal: boolean) => {
      const filename = `${draftId}.txt`;
      const data = Buffer.from(text);
      await updateStore().saveDraft(draftId, { filename, files: [filename], segments: [{ src: "NEW", loc: "L1", text }] }, [{ name: filename, data }]);
      const cs = emptyChangeSet(filename);
      const item = { text, citations: [{ src: "NEW", quote: text }] };
      if (formal) cs.newDecisions = [item];
      else {
        cs.newProposals = [item, structuredClone(item)];
        cs.priorDecisions = [{ text: "Go-live 2026-10-22 remains approved.", citations: kb.goLive.citations ?? [] }];
      }
      const response = await publish(new Request("http://localhost/api/update/publish", { method: "POST", body: JSON.stringify({ draftId, changeset: cs }) }));
      assert.equal(response.status, 200);
      return (await response.json()).id as string;
    };
    assert.equal(await publishItem("proposal", "Move go-live to Oct 29, 2026.", false), "U001");
    let ups = await updates();
    const proposalLineage = decisionLineages(kb, ups).find((g) => g.steps.some((s) => s.stage === "PROPOSED"));
    assert.ok(proposalLineage?.baseline);
    assert.equal(proposalLineage.steps.filter((s) => s.stage === "PROPOSED").length, 1);
    assert.match(proposalLineage.current, /2026-10-22 reste approuvée/);
    assert.ok(!proposalLineage.steps.some((s) => s.stage === "DECIDED"));
    const proposalTimeline = renderToStaticMarkup(await Timeline());
    assert.match(proposalTimeline, /MISE À JOUR U001/);
    assert.match(proposalTimeline, /Move go-live to Oct 29/);
    const proposalDecisions = renderToStaticMarkup(await Decisions());
    assert.match(proposalDecisions, /proposition :/);
    assert.ok(!proposalDecisions.includes("NOUVELLE DÉCISION"));
    assert.equal(renderToStaticMarkup(await Timeline()), proposalTimeline);
    assert.equal(renderToStaticMarkup(await Decisions()), proposalDecisions);

    assert.equal(await publishItem("decision", "Steering committee approved go-live Oct 29, 2026.", true), "U002");
    ups = await updates();
    const lineage = decisionLineages(kb, ups).find((g) => g.id === proposalLineage.id)!;
    assert.equal(lineage.steps.filter((s) => s.stage === "PROPOSED").length, 1);
    assert.equal(lineage.steps.filter((s) => s.stage === "DECIDED").length, 1);
    assert.match(lineage.current, /Oct 29.*DÉCIDÉ.*U002/);
    assert.deepEqual(lineage.baseline, proposalLineage.baseline);
    const timeline = renderToStaticMarkup(await Timeline());
    const decisions = renderToStaticMarkup(await Decisions());
    assert.match(timeline, /MISE À JOUR U002/);
    assert.match(decisions, /NOUVELLE DÉCISION/);
    assert.match(decisions, /DÉCISION DE RÉFÉRENCE/);
    for (const html of [timeline, decisions]) {
      assert.match(html, /\/sources\/U002-S1\?loc=L1&amp;q=Steering/);
    }
    const evidence = await preview(new Request(`http://localhost/api/segment?src=U002-S1&loc=L1&quote=${encodeURIComponent(ups[1].segments[0].text)}`));
    assert.equal(evidence.status, 200);
    assert.equal((await evidence.json()).verified, true);
    const source = renderToStaticMarkup(await SourceView({ params: Promise.resolve({ id: "U002-S1" }), searchParams: Promise.resolve({ loc: "L1", q: ups[1].segments[0].text }) }));
    assert.match(source, /<mark>Steering committee approved go-live Oct 29, 2026\.<\/mark>/);
    assert.equal(renderToStaticMarkup(await Timeline()), timeline);
    assert.equal(renderToStaticMarkup(await Decisions()), decisions);
    const response = await reset(new Request("http://localhost/api/update/reset", { method: "POST" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await updates(), []);
    assert.equal(renderToStaticMarkup(await Timeline()), initialTimeline);
    assert.equal(renderToStaticMarkup(await Decisions()), initialDecisions);
    assert.deepEqual(curatedKB(), kb);
    assert.deepEqual(await fs.readFile(baselinePath), before);
  } finally {
    process.chdir(originalCwd);
    for (const [key, value] of env) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("nova-update-memory-"));
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("consequences deduplicate within an update, preserve later history and avoid ambiguous lineage", () => {
  const cs = emptyChangeSet("status.txt"); cs.id = "U003"; cs.publishedAt = "2026-10-04T01:00:00Z";
  const item = { text: "Security retest passed.", citations: [{ src: "U003-S1", loc: "L1", quote: "Security retest passed." }] };
  cs.problemStatus = [item, item]; cs.conditionChanges = [{ ...item, id: 1, status: "met" }];
  cs.newActions = [{ title: "Notify committee", owner: "Nicolas", ownerStatus: "assigned", type: "COMMITMENT", due: "2026-10-05", citations: item.citations }];
  cs.newProposals = [{ ...item, text: "Revise the plan" }];
  const u: Update = { cs, sources: [], segments: [] };
  const events = updateTimeline([u, u]);
  assert.equal(events.length, 3);
  assert.equal(events[0].date, "2026-10-03");
  assert.equal(events[0].tag, "VALIDATION");
  assert.equal(events[0].citations.length, 1);
  assert.match(events.find((e) => e.tag === "ACTION")!.title, /Nicolas.*échéance 2026-10-05/);
  const kb = structuredClone(curatedKB());
  const before = structuredClone(kb);
  const groups = decisionLineages(kb, [u]);
  assert.equal(groups.find((g) => g.steps.length)!.baseline, undefined);
  // Two matching subjects are ambiguous; neither baseline decision is mutated.
  kb.decisions.push({ ...kb.decisions.find((d) => /Go-live/.test(d.subject))!, id: "AMBIGUOUS" });
  cs.newProposals = [{ ...item, text: "Move go-live to Oct 29" }];
  assert.equal(decisionLineages(kb, [u]).find((g) => g.steps.length)!.baseline, undefined);
  kb.decisions.pop();
  assert.deepEqual(kb, before);
  const later: Update = { ...u, cs: { ...cs, id: "U004" } };
  assert.equal(updateTimeline([u, later]).filter((e) => e.tag === "VALIDATION").length, 2);
  assert.deepEqual(updateTimeline([]), []);
});
