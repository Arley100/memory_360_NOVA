import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { frenchAppContent, frenchText } from "../src/lib/frenchContent";
import { frenchLabel } from "../src/lib/locale";
import { prettyLoc } from "../src/lib/text";
import { applyGuardrails, emptyChangeSet } from "../src/lib/update";
import type { KB } from "../src/lib/store";

test("French display translates saved summaries while preserving evidence, identifiers and protocol values", () => {
  for (const file of ["data/baseline/kb.json", "data/generated/kb.json"]) {
    const bytes = fs.readFileSync(file);
    const original: KB = JSON.parse(bytes.toString());
    const localized = frenchAppContent(original);
    if (/\b(?:The|currently|approved)\b/.test(original.answers[0].answer_en)) assert.notEqual(localized.answers[0].answer_en, original.answers[0].answer_en);
    assert.match(localized.answers[0].answer_en, /22 octobre 2026/);
    assert.match(localized.answers[0].question_en, /date.*production.*approuvée/);
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
  assert.equal(frenchText("Runbook avec rollback, prochaine build, go-live : TBC."), "Guide d’exploitation avec retour arrière, prochaine version, mise en production : À confirmer.");
  assert.equal(frenchText("ACC-302 re-testé ; nouveau retest à faire."), "ACC-302 testé à nouveau ; nouveau nouveau test à faire.");
  assert.deepEqual(frenchAppContent({ text: "Runbook avec rollback", citations: [{ quote: "Runbook avec rollback" }], evidence: [{ text: "Runbook avec rollback" }] }), { text: "Guide d’exploitation avec retour arrière", citations: [{ quote: "Runbook avec rollback" }], evidence: [{ text: "Runbook avec rollback" }] });
  assert.equal(prettyLoc("region=row-4"), "rangée 4");
  assert.equal(prettyLoc("event-1:SUMMARY"), "événement 1 · résumé");
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
