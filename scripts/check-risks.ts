// Corpus regression checks and isolated update simulation. No project state is written.
import assert from "node:assert/strict";
import fs from "node:fs";
import { indexSegments, resolveCite } from "../src/lib/cite";
import { baselineSegments, baselineSources, curatedKB, getKB } from "../src/lib/store";
import { deriveRisks } from "../src/lib/risks";
import type { Segment } from "../src/lib/types";

async function main() {
  const sources = baselineSources(), segments = baselineSegments();
  const snapshot = JSON.stringify({ kb: curatedKB(), sources, segments });
  const resolve = (c: Parameters<typeof resolveCite>[0]) => resolveCite(c, indexSegments(segments));
  for (const kb of [curatedKB(), await getKB()]) {
    const risks = deriveRisks(kb, kb.conditions, sources, segments, resolve);
    assert.equal(risks.length, 5);
    assert.deepEqual(risks.filter((r) => r.status === "Current").map((r) => r.id), ["R-02", "R-03", "R-04"]);
    assert.equal(risks.find((r) => r.id === "R-01")?.status, "Stale/resolved");
    assert.equal(risks.find((r) => r.id === "R-05")?.status, "Closed");
    assert(risks.every((r) => [...r.registerCites, ...r.evidence].every((c) => c.verified && c.loc)));
    assert(risks.find((r) => r.id === "R-01")?.evidence.some((c) => c.src === "INT-101" && c.loc === "L18"));

    // The supplied rehearsal is explicitly simulated, never added to the project corpus.
    const fixture: Segment[] = fs.readFileSync("rehearsal/R2_Teams_ACC-303_valide.txt", "utf8").split(/\r?\n/).filter(Boolean).map((text, i) => ({ src: "TEST-UPDATE", loc: `L${i + 1}`, text }));
    const idx = indexSegments([...segments, ...fixture]);
    const condition = kb.conditions.find((c) => c.citations.some((cit) => cit.src === "ACC-303"));
    assert(condition);
    const simulated = kb.conditions.map((c) => c.id === condition.id ? { ...c, status: "met" as const, changedIn: "TEST-UPDATE", changeText: "Rehearsal: accessibility closure", changeCites: fixture.map((s) => ({ src: s.src, loc: s.loc, quote: s.text })) } : c);
    const updated = deriveRisks(kb, simulated, sources, segments, (c) => resolveCite(c, idx));
    assert.deepEqual(updated.filter((r) => r.status === "Current").map((r) => r.id), ["R-02", "R-03"]);
    assert.equal(updated.find((r) => r.id === "R-04")?.status, "Stale/resolved");
    assert.equal(updated.find((r) => r.id === "R-04")?.changedIn, "TEST-UPDATE");
    const unverified = simulated.map((c) => c.id === condition.id ? { ...c, changeCites: [{ src: "MISSING", quote: "Unsupported closure" }] } : c);
    assert.equal(deriveRisks(kb, unverified, sources, segments, resolve).find((r) => r.id === "R-04")?.status, "Uncertain");
  }
  assert.equal(JSON.stringify({ kb: curatedKB(), sources, segments }), snapshot, "Baseline must remain unchanged");
  console.log("Risks: both KBs, exact citations, stale connector, isolated update, uncertainty and baseline immutability passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
