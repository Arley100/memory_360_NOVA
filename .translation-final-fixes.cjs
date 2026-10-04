const fs=require('fs');function edit(f,fn){fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')))}
edit('src/lib/frenchContent.ts',s=>s.replace('"quote", "label", "path"','"quote", "path"').replace('"authority", "role",','"authority",'));
edit('src/lib/text.ts',s=>s.replace('if (loc.startsWith("header:")) return loc.slice(7);','if (loc.startsWith("header:")) return ({ From: "De", To: "À", Cc: "Cc", Subject: "Objet", Date: "Date" } as Record<string, string>)[loc.slice(7)] ?? loc.slice(7);'));
edit('src/lib/prompts.ts',s=>s.replace(s.slice(s.indexOf('export const RULES ='),s.indexOf('export async function corpusContext')),`export const RULES = \`Règles de lecture (README du défi) :
1. Référence : 2026-09-30 09:00 Montréal (UTC-04:00). Les faits ultérieurs viennent uniquement des mises à jour publiées (U001...).
2. Les faits du projet proviennent UNIQUEMENT des passages fournis, jamais de connaissances externes.
3. Distingue PROPOSAL et DECISION, DELIVERY et VALIDATION. Un fournisseur disant « corrigé » décrit une livraison, pas une validation.
4. Une capture historique ne prouve pas qu’un défaut reste ouvert ; le statut du ticket prévaut.
5. Les doublons comptent comme une seule source. Certains fichiers sont sans rapport (autres projets, infolettres, notes personnelles) : évalue pertinence et autorité.
6. Évalue l’autorité et la date des faits. Un fichier récent ne garantit pas un contenu actuel. Plans, registres et rapports peuvent être périmés.
7. Montants CAD hors taxes : distingue autorisé, facturé et payé. Aucun calcul de taxes.
8. Toute information absente reste non documentée. N’invente jamais de décision, d’échéance, d’approbation ou de responsable.
9. Présente tes suggestions comme recommandations, distinctes des engagements documentés.\`;

export const CITATION_FORMAT = \`Format strict des citations :
- « src » contient uniquement l’identifiant avant « # ». Pour [[M04#L23]], utilise « src »: « M04 », « loc »: « L23 ».
- « quote » est copié caractère par caractère depuis un passage unique, dans sa langue d’origine, de 3 à 20 mots. Aucune paraphrase, traduction, ellipse ni ajout de guillemets.
- Chaque phrase factuelle exige une citation. Privilégie la source faisant autorité (décision > validation > rapport).\`;

`));
edit('src/lib/update.ts',s=>s.replace('a.due : "TBC"','a.due : "À confirmer"').replace('d.authority ?? "unknown"','d.authority ?? "inconnue"').replace('«${d.text}"','«${d.text}»').replace('`fiche «${b.theme}"`','`fiche «${b.theme}»`').replace('`fiche «${x.theme}"`','`fiche «${x.theme}»`').replace('/go-live|go live/i.test(x.text)','/go-live|go live|mise en production/i.test(x.text)').replace('/runbook/i.test(sentence)','/runbook|guide d.exploitation/i.test(sentence)').replace('/\\b(validated|accepted|closed|approved|met)\\b/i.test(sentence)','/\\b(validated|accepted|closed|approved|met|valid[ée]e?s?|accept[ée]e?s?|ferm[ée]e?s?|approuv[ée]e?s?|satisfait[es]*)\\b/i.test(sentence.normalize("NFC"))').replace('remains open|en validation)', 'remains open|en validation|non|pas|aucun|aucune|sans|attente|avant|requiert|n[ée]cessite|doit|reste ouvert)'));

