# Actualité des réponses et recalcul manuel

Q01–Q10 disposent désormais de caches de réponses indépendants et persistants. L’ouverture de Questions importe tout cache manquant à partir de la réponse résolue existante, sans appel au modèle. L’horodatage initial est explicitement présenté comme celui de l’initialisation du cache ; il ne prétend pas indiquer une ancienne exécution du modèle. Après cette initialisation, la publication d’une mise à jour ne remplace jamais la réponse en cache ni son horodatage.

L’actualité compare les identifiants des mises à jour incluses à l’état publié. Une nouvelle mise à jour ne périme que les questions listées dans `affected.answers`. La suppression d’une mise à jour incluse périme le calcul qui l’utilisait. Les empreintes des mises à jour détectent aussi la réutilisation d’identifiants après réinitialisation. Les étiquettes de modification des fichiers utilisent les chemins et les empreintes SHA-256 enregistrés ; une empreinte absente produit l’étiquette neutre « Contexte modifié ». Les répertoires de versions du stockage sont normalisés lors de la comparaison du chemin logique de fichiers publiés successivement.

Chaque bouton de recalcul et la barre d’outils groupés utilisent `POST /api/questions/recompute`. Le serveur appelle la chaîne `askProject()` existante avec un instantané figé des mises à jour publiées et une concurrence limitée à deux tâches. Les clients JSON reçoivent les résultats, y compris les réussites partielles ; l’interface Questions demande du NDJSON pour afficher la progression réelle de cette même requête. Une publication ou une réinitialisation survenant pendant un calcul peut rendre son résultat périmé, car elle ne faisait pas partie de son contexte d’entrée.

Les calculs réussis ne conservent que les citations vérifiées. Les échecs préservent la réponse et les preuves antérieures. Les citations de sources supprimées par une réinitialisation restent visibles comme preuves archivées, sans liens vers les pages disparues. La référence initiale et l’architecture existante des mises à jour et réponses révisées sont préservées.

Les enregistrements locaux et l’historique complet des calculs résident dans `data/question-computations/Qxx.json`, exclus de Git et du suivi des fichiers de déploiement. Les enregistrements hébergés utilisent les variables d’environnement Upstash/KV existantes et les clés `${STORE_PREFIX || "m360"}:questions:Qxx`. Redis ajoute l’historique de manière atomique. La réinitialisation des mises à jour ne supprime pas ces enregistrements.

## Vérification

Exécutez les tests persistants avec :

```powershell
node --import tsx --test tests/question-freshness.test.ts
```

Les tests couvrent les publications pertinentes ou sans lien, les retours de l’horloge en arrière, les fichiers ajoutés, modifiés ou sans empreinte, la réinitialisation et les identifiants réutilisés, l’initialisation de secours, l’immuabilité des caches après publication, la persistance au redémarrage, la conservation de l’historique, les écritures tardives, les lots à deux tâches, les échecs partiels, les preuves exclusivement vérifiées et la publication pendant le recalcul. Les tests de l’adaptateur Redis simulent les réponses REST ; ils n’écrivent pas dans un stockage hébergé réel.

Les contrôles d’interaction React ont aussi vérifié les dix cases de sélection, commandes de recalcul et horodatages, l’absence de requête au modèle à l’initialisation, la sélection des réponses périmées, une seule requête du navigateur pour un lot de trois questions, la progression en continu, l’effacement des sélections réussies, la préservation des réponses en échec, la nouvelle tentative sur une question, le message 503, la réception d’un état réinitialisé, l’animation de recalcul et les preuves archivées. Ils utilisaient une réponse de modèle simulée et n’ont consommé aucun crédit fournisseur.

La route Questions locale réelle a répondu 200, affiché les dix commandes et préservé les caches persistants au rechargement. Les requêtes de recalcul invalides ont répondu 400. La compilation de production et les contrôles TypeScript ont réussi. Le contrôle de style ne présente que les deux avertissements préexistants de variables inutilisées dans `src/lib/prompts.ts`.

La vérification par captures du navigateur et l’exécution réelle avec Redis hébergé ou un fournisseur n’ont pas été effectuées.
