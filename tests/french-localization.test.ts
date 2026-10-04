import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { frenchAppContent, frenchText } from "../src/lib/frenchContent";
import { frenchLabel } from "../src/lib/locale";
import { applyGuardrails, emptyChangeSet } from "../src/lib/update";
import type { KB } from "../src/lib/store";

test("French display translates saved summaries while preserving evidence, identifiers and protocol values", () => {
  for (const file of ["data/baseline/kb.json", "data/generated/kb.json"]) {
    const bytes = fs.readFileSync(file);
    const original: KB = JSON.parse(bytes.toString());
    const localized = frenchAppContent(original);
    assert.notEqual(localized.answers[0].answer_en, original.answers[0].answer_en);
    assert.match(localized.answers[0].answer_en, /22 octobre 2026/);
    assert.equal(localized.answers[0].question_en, "Quelle est la date de mise en production actuellement approuvée, et avec quelle réserve ?");
    assert.equal(localized.goLive.date, original.goLive.date);
    assert.equal(localized.goLive.status, original.goLive.status);
    assert.equal(localized.actions[0].ownerStatus, original.actions[0].ownerStatus);
    assert.equal(localized.actions[0].type, original.actions[0].type);
    for (let i = 0; i < original.answers.length; i++) {
      assert.equal(localized.answers[i].id, original.answers[i].id);
      assert.deepEqual(localized.answers[i].citations, original.answers[i].citations);
    }
    for (let i = 0; i < original.decisions.length; i++) {
      assert.deepEqual(localized.decisions[i].evidence, original.decisions[i].evidence);
    }
    assert.deepEqual(fs.readFileSync(file), bytes);
  }
  assert.equal(frenchLabel("VENDOR_CLAIM"), "déclaration du fournisseur");
  assert.equal(frenchText("TBC"), "À confirmer");
  assert.equal(frenchText("constructor"), "constructor");
});

test("French narrative cannot convert vendor delivery into security acceptance or proposal into approval", () => {
  const fresh = [{ src: "NEW", loc: "L1", text: "Boréal a livré le correctif SEC-210." }];
  const facts = {
    conditions: [{ id: 1, title: "Validation de sécurité SEC-210", owner: "Sophie Lambert", status: "open" as const }],
    goLive: { date: "2026-10-22" }, contractEnd: "2026-10-31",
  };
  const changes = emptyChangeSet("mise-a-jour.txt");
  changes.revisedAnswers = [{ id: "Q08", text: "SEC-210 est validé et accepté.", citations: [{ src: "NEW", loc: "L1", quote: fresh[0].text }] }];
  changes.newProposals = [{ text: "Mise en production proposée le 29 octobre.", citations: [] }];
  changes.revisedBrief = [{ theme: "Date approuvée et conditions", text: "La date officielle de mise en production est le 29 octobre.", citations: [{ src: "NEW", loc: "L1", quote: fresh[0].text }] }];
  const guarded = applyGuardrails(changes, [], fresh, facts);
  assert.ok(guarded.guardrails.reviewWarnings?.some((warning) => /Q08.*NON fermée/.test(warning)));
  assert.ok(guarded.guardrails.reviewWarnings?.some((warning) => /date proposée/.test(warning)));
  changes.revisedAnswers[0].text = "SEC-210 n’est pas validé ni accepté.";
  assert.ok(!applyGuardrails(changes, [], fresh, facts).guardrails.reviewWarnings?.some((warning) => /Q08.*NON fermée/.test(warning)));
});
