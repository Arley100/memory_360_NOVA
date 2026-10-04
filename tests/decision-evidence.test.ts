import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { indexSegments } from "../src/lib/cite";
import { resolveDecisionEvidence } from "../src/lib/decisionEvidence";
import type { KB } from "../src/lib/store";
import type { Segment, Source } from "../src/lib/types";

const segments: Segment[] = JSON.parse(fs.readFileSync("data/segments.json", "utf8"));
const sources: Source[] = JSON.parse(fs.readFileSync("data/registry.json", "utf8"));
const index = indexSegments(segments);

test("both KBs link every supplied stage citation to an existing exact source passage", () => {
  for (const kind of ["baseline", "generated"]) {
    const kb: KB = JSON.parse(fs.readFileSync(`data/${kind}/kb.json`, "utf8"));
    for (const decision of kb.decisions) {
      assert.ok((decision.evidence?.decided?.length ?? 0) + (decision.evidence?.delivered?.length ?? 0) > 0, decision.id);
      for (const citations of Object.values(decision.evidence ?? {})) {
        const resolved = resolveDecisionEvidence(citations, index);
        assert.equal(resolved.length, citations.length, `${kind} ${decision.id}`);
        for (const c of resolved) {
          assert.ok(sources.some((s) => s.id === c.src));
          assert.ok(c.loc);
          assert.notEqual(c.label, c.src);
        }
      }
    }
    const hosting = kb.decisions.find((d) => d.id === "D1")!;
    assert.equal(resolveDecisionEvidence(hosting.evidence?.proposed, index)[0].label, "E02 · ¶3");
    assert.equal(resolveDecisionEvidence(hosting.evidence?.decided, index)[0].src, "ADR-007");
    assert.equal(resolveDecisionEvidence(hosting.evidence?.delivered, index)[0].src, "E03");
    assert.equal(resolveDecisionEvidence(hosting.evidence?.validated, index)[0].src, "M03");
  }
});

test("missing, ambiguous and misattributed evidence cannot borrow another stage or source", () => {
  assert.deepEqual(resolveDecisionEvidence(undefined, index), []);
  assert.deepEqual(resolveDecisionEvidence([{ src: "E02", quote: "" }], index), []);
  assert.deepEqual(resolveDecisionEvidence([{ src: "E02", loc: "body:P99", quote: "" }], index), []);
  assert.deepEqual(resolveDecisionEvidence([{ src: "E02", quote: "This evidence does not exist" }], index), []);
  const delivery = segments.find((s) => s.src === "E03" && s.loc === "body:P2")!;
  assert.deepEqual(resolveDecisionEvidence([{ src: "E02", quote: delivery.text }], index), []);
  // An indexed locator or a verbatim quote within the named source is sufficient.
  assert.equal(resolveDecisionEvidence([{ src: "E03", loc: "body:P2", quote: "" }], index)[0].loc, "body:P2");
  assert.equal(resolveDecisionEvidence([{ src: "E03", quote: delivery.text }], index)[0].loc, "body:P2");
  const ambiguous = indexSegments([
    { src: "M1", loc: "L1", text: "Approved by the committee" },
    { src: "M1", loc: "L2", text: "Approved by the committee" },
  ]);
  assert.deepEqual(resolveDecisionEvidence([{ src: "M1", quote: "Approved by the committee" }], ambiguous), []);
  assert.equal(resolveDecisionEvidence([{ src: "M1", loc: "L2", quote: "Approved by the committee" }], ambiguous)[0].loc, "L2");
});
