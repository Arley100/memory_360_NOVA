// Shared grounding context and rules (see docs/SPEC-hackathon.md section 21).
import { allSegments, allSources, getKB, updates, type Update } from "./store";

export const RULES = `Règles de lecture (README du défi) :
1. Référence : 2026-09-30 09:00 Montréal (UTC-04:00). Les faits ultérieurs viennent uniquement des mises à jour publiées (U001...).
2. Les faits du projet proviennent UNIQUEMENT des passages fournis, jamais de connaissances externes.
3. Distingue PROPOSAL et DECISION, DELIVERY et VALIDATION. Un fournisseur disant « corrigé » décrit une livraison, pas une validation.
4. Une capture historique ne prouve pas qu’un défaut reste ouvert ; le statut du ticket prévaut.
5. Les doublons comptent comme une seule source. Certains fichiers sont sans rapport (autres projets, infolettres, notes personnelles) : évalue pertinence et autorité.
6. Évalue l’autorité et la date des faits. Un fichier récent ne garantit pas un contenu actuel. Plans, registres et rapports peuvent être périmés.
7. Montants CAD hors taxes : distingue autorisé, facturé et payé. Aucun calcul de taxes.
8. Toute information absente reste non documentée. N’invente jamais de décision, d’échéance, d’approbation ou de responsable.
9. Présente tes suggestions comme recommandations, distinctes des engagements documentés.`;

export const CITATION_FORMAT = `Format strict des citations :
- « src » contient uniquement l’identifiant avant « # ». Pour [[M04#L23]], utilise « src »: « M04 », « loc »: « L23 ».
- « quote » est copié caractère par caractère depuis un passage unique, dans sa langue d’origine, de 3 à 20 mots. Aucune paraphrase, traduction, ellipse ni ajout de guillemets.
- Chaque phrase factuelle exige une citation. Privilégie la source faisant autorité (décision > validation > rapport).`;

export async function corpusContext(ups?: Update[]): Promise<string> {
  const list = ups ?? (await updates());
  const src = new Map((await allSources(list)).map((s) => [s.id, s]));
  return (await allSegments(list))
    .filter((s) => { const x = src.get(s.src); return x && !x.duplicateOf; }) // only exact duplicates (by hash) are removed
    .map((s) => `[[${s.src}#${s.loc}]] ${s.text.replace(/\s+/g, " ")}`)
    .join("\n");
}

export async function kbContext(ups?: Update[]): Promise<string> {
  const k = await getKB();
  const list = ups ?? (await updates());
  const slim = {
    goLive: k.goLive, conditions: k.conditions.map(({ citations, ...c }) => c),
    answers: k.answers.map((a) => ({ id: a.id, q: a.question_en, a: a.answer_en })),
    actions: k.actions.map(({ citations, ...a }) => a),
    contradictions: k.contradictions.map((c) => ({ id: c.id, topic: c.topic, resolution: c.resolution })),
    decisions: k.decisions, budget: k.budget,
    updates: list.map((u) => u.cs),
  };
  return JSON.stringify(slim);
}
