# Refonte de la présentation de NOVA

L’application utilise désormais une coque arrondie sur toute la largeur, une navigation sombre regroupée, la police Poppins, une palette sobre bleu et bleu-vert, des icônes au trait partagées, des pastilles de citation compactes, des étiquettes sémantiques discrètes et des tableaux opérationnels cohérents.

La vue d’ensemble exploite les données existantes du budget et des conditions dans une bande d’indicateurs, un module de préparation, un volet de décisions et d’actions, une barre de répartition et un avertissement distinct pour CR-04 non approuvé. Les questions utilisent un index d’ancres et un document de réponses ; les contradictions, des colonnes de comparaison des preuves ; les sources, des lignes de dépôt et un espace de consultation du document et de ses métadonnées. La fiche, la chronologie, l’équipe, le guide, l’interrogation et la révision des mises à jour partagent ce système visuel tout en conservant leurs fonctions propres.

## Préservation

Lors de cette refonte, aucune modification de `src/lib/**`, `src/app/api/**`, `scripts/**`, `data/**`, `corpus/**` ou `rehearsal/**`. La construction des URL de citation, la résolution des localisateurs, le surlignage et le défilement automatique, la recherche, les requêtes API, CodeGate, la composition de l’état initial et actuel et les garde-fous sont préservés. Aucune dépendance ajoutée ; les icônes sont des SVG locaux. Poppins utilise le même chargement externe Google Fonts que les anciennes polices.

## Vérification

- `npm run build` : réussi, y compris TypeScript et la génération de toutes les routes.
- `npm run lint` : aucune erreur ; avertissements préexistants dans `src/lib/prompts.ts` pour deux variables `citations` inutilisées. Le commentaire de désactivation inutilisé du composant d’interrogation a été supprimé. Le contrôle ciblé de `src/app` et `src/components` ne produit aucun avertissement.
- Chromium et Playwright disponibles sur l’ordinateur ont été utilisés sans ajouter d’outil de test ni de dépendance au dépôt.
- Le serveur de production final a aussi été vérifié : barre latérale sombre de 244 px, police Poppins et captures de production propres pour chaque route demandée.
- Toutes les routes demandées ont répondu HTTP 200, puis été capturées et inspectées visuellement : vue d’ensemble, fiche, questions, chronologie, décisions, contradictions, actions, sources, source textuelle SEC-210, tableur PLAN-V2, capture ACC-301.png, équipe, mise à jour, interrogation et guide.
- La navigation par citation atteint SEC-210 L25, surligne le passage exact et fait défiler la page jusqu’à lui. La plage L23-L25 surligne trois passages. Le surlignage fondé sur la seule requête fonctionne aussi.
- La cellule `Plan projet!F7` de PLAN-V3 et la ligne `region=row-4` de la capture OPS-601.png correspondent exactement aux citations.
- La recherche de `rollback` dans les sources renvoie cinq passages. L’index des questions mène à Q05.
- Une question sur l’acceptation de la sécurité a été soumise à l’API réelle, qui a répondu HTTP 200 avec une réponse sourcée.
- Le champ de fichier produit une requête POST multipart vers `/api/update/analyze`, interceptée avant ingestion. La révision, le focus sur Publier et l’abandon ont été vérifiés avec une réponse destinée uniquement au rendu, construite à partir du texte initial existant. Aucun téléversement ni publication n’a été conservé. La capture de révision vérifie le rendu et ne représente pas une nouvelle version du projet.
- Aucune erreur de page ni débordement horizontal global dans les vues vérifiées (vue d’ensemble, questions, preuves, actions, mise à jour et interrogation) aux largeurs de 1 920, 1 366, 1 024, 768 et 390 px. Les captures de bureau comprennent 1440×900, 1920×1080 et 1366×768.
- Les vérifications au clavier ont réussi pour le lien d’évitement et sa cible principale, la barre latérale, le champ d’en-tête, les pastilles de preuve, les liens de preuve des tableaux, le champ de fichier, le champ de question et la commande de publication, avec des contours de focus visibles de 3 px.
- La réduction des animations désactive les transitions. La fiche PDF tient sur une page A4 ; la barre latérale et l’en-tête sont masqués, et la fiche s’imprime en noir sur blanc.

## Limites et omissions volontaires

Le lot de références nommé `reference_images`, `reference_code` et `specs` était absent de l’espace de travail et des pièces jointes fournis. Les couleurs, proportions et orientations détaillées dans la demande ont été suivies, et les quatre captures originales du projet ont été inspectées. La comparaison directe avec les deux images de référence manquantes était donc impossible.

Aucun raccourci de palette de commandes, indicateur inventé, illustration décorative, nouveau filtre métier ni publication n’a été ajouté. CodeGate et les moteurs de mise à jour et de réponse ont été préservés. Les captures originales restent disponibles pour comparer l’avant et l’après.

## Fichiers sources modifiés ou créés

`src/components/UI.tsx` est nouveau ; les autres fichiers ci-dessous ont été modifiés.

- `src/app/actions/page.tsx`
- `src/app/ask/AskClient.tsx`
- `src/app/ask/page.tsx`
- `src/app/brief/page.tsx`
- `src/app/contradictions/page.tsx`
- `src/app/decisions/page.tsx`
- `src/app/globals.css`
- `src/app/guide/page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/questions/page.tsx`
- `src/app/sources/[id]/page.tsx`
- `src/app/sources/page.tsx`
- `src/app/team/page.tsx`
- `src/app/timeline/page.tsx`
- `src/app/update/UpdateClient.tsx`
- `src/app/update/page.tsx`
- `src/components/ChangeSetView.tsx`
- `src/components/Chip.tsx`
- `src/components/Nav.tsx`
- `src/components/SourceExplorer.tsx`
- `src/components/UI.tsx`

## Documentation et pièces de vérification créées

- `docs/UI_REDESIGN.md` (ce rapport)
- `docs/screenshots/redesign/accessibility-verification.json`
- `docs/screenshots/redesign/actions.png`
- `docs/screenshots/redesign/ask-answer.png`
- `docs/screenshots/redesign/ask.png`
- `docs/screenshots/redesign/brief-print.pdf`
- `docs/screenshots/redesign/brief-print.png`
- `docs/screenshots/redesign/brief.png`
- `docs/screenshots/redesign/contradictions.png`
- `docs/screenshots/redesign/decisions.png`
- `docs/screenshots/redesign/guide.png`
- `docs/screenshots/redesign/overview-1024.png`
- `docs/screenshots/redesign/overview-1366.png`
- `docs/screenshots/redesign/overview-1440-viewport.png`
- `docs/screenshots/redesign/overview-1920.png`
- `docs/screenshots/redesign/overview-390.png`
- `docs/screenshots/redesign/overview-768.png`
- `docs/screenshots/redesign/overview.png`
- `docs/screenshots/redesign/questions.png`
- `docs/screenshots/redesign/review-contact-sheet.png`
- `docs/screenshots/redesign/screenshot-locator-viewport.png`
- `docs/screenshots/redesign/source-search.png`
- `docs/screenshots/redesign/sources-ACC-301.png.png`
- `docs/screenshots/redesign/sources-PLAN-V2.png`
- `docs/screenshots/redesign/sources-SEC-210.png`
- `docs/screenshots/redesign/sources.png`
- `docs/screenshots/redesign/team.png`
- `docs/screenshots/redesign/timeline.png`
- `docs/screenshots/redesign/update-review-render-check.png`
- `docs/screenshots/redesign/update.png`
- `docs/screenshots/redesign/verification.json`
