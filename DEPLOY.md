# Déployer Mémoire 360 sur Vercel (environnement de test partagé)

La démonstration en direct fonctionne toujours sur l’ordinateur de la personne qui présente (plus rapide, sans démarrage à froid). La copie hébergée permet à toute l’équipe de tester et de répéter depuis un navigateur.

## Différences en hébergement

- **Les mises à jour sont stockées hors du dépôt**, dans Upstash Redis : le système de fichiers hébergé est en lecture seule. La référence initiale (corpus et base de connaissances) accompagne le code et n’est jamais modifiée.
- **Un code de démonstration protège les fonctions qui consomment des crédits API ou modifient l’état** : interrogation, analyse des mises à jour, publication et réinitialisation. Consultation, preuves et recherche restent accessibles. Un navigateur reste déverrouillé pendant 7 jours.
- **Les téléversements hébergés sont limités à 4,3 Mio au total**. La conservation de l’original est limitée à 4 Mio (4 194 304 octets) par fichier ; divisez les fichiers plus volumineux.

Le jury n’a besoin ni d’abonnement payant ni de compte personnel Claude ou OpenAI. L’accès à l’IA est fourni par la configuration du serveur de l’équipe ; le jury utilise le code de démonstration remis.

Sans fournisseur d’IA configuré, consultation, preuves et recherche fonctionnent. Les fichiers peuvent être téléversés, leur texte pris en charge extrait et vérifié, puis publié dans une nouvelle version (avec le code de démonstration, s’il est configuré). Le mode manuel permet uniquement de modifier l’état du problème, les décisions antérieures et le texte des propositions. Il ne propose aucun contrôle pour les citations, les métadonnées du proposant ou de l’autorité, les nouvelles décisions formelles, les questions, conditions ou actions touchées, les changements d’état des conditions, les nouvelles actions ou les réponses et la fiche révisées. Des champs d’incidence vides signifient que l’analyse n’a pas été effectuée. La publication applique les garde-fous du code et préserve la référence initiale ; elle ne termine pas l’analyse des incidences et ne recalcule pas les réponses.

La conversation, la construction de la base de connaissances, l’analyse automatique des incidences, le recalcul des réponses et l’interprétation des mises à jour par l’IA exigent un fournisseur configuré. Les nouvelles images nécessitent un modèle capable de les lire. Les PDF numérisés sans couche de texte et les formats illisibles sont conservés pour révision manuelle. Les transcriptions existantes des captures du dossier initial restent disponibles.

## Étapes (environ 10 minutes)

1. **Poussez le dépôt sur GitHub** ; un dépôt privé convient.
2. **Importez-le dans Vercel** : vercel.com → Add New → Project → choisissez `memory_360_NOVA` → Framework : Next.js (détecté). Attendez l’étape 4 pour déployer, ou redéployez ensuite.
3. **Ajoutez le stockage** : dans le projet, ouvrez **Storage** → créez ou connectez une base **Upstash for Redis** avec l’offre gratuite → associez-la au projet. Les variables de connexion sont ajoutées automatiquement : `KV_REST_API_URL`/`KV_REST_API_TOKEN` ou `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` ; les deux conventions fonctionnent.
4. **Ajoutez les variables d’environnement** dans Settings → Environment Variables, Production :
   - `ANTHROPIC_API_KEY` : une clé réservée à ce déploiement (par exemple `codeml-nova-vercel`), marquée **Sensitive**.
   - `DEMO_CODE` : un code de votre choix, différent de vos mots de passe habituels.
   - Facultatif : `LLM_CACHE_TTL` = `1h`.
5. **Déployez** ; utilisez Deployments → Redeploy si le projet était déjà déployé. Ouvrez l’URL : l’en-tête doit afficher le point vert « IA configurée », et l’interrogation doit demander le code de démonstration.
6. **Partagez l’URL et le code en privé avec l’équipe**, par message direct, jamais sur un canal public.

Chaque `git push` vers `main` déclenche automatiquement un nouveau déploiement.

## Répéter sur la copie hébergée

Ajouter une information → déposer les fichiers de `rehearsal/` → réviser → publier. Utilisez **Rétablir la référence initiale** sur la même page à la fin, afin que la personne suivante reparte d’un état propre. Réinitialisez avant la présentation réelle.

## Après le hackathon

Supprimez le projet Vercel (ou sa variable `ANTHROPIC_API_KEY`), puis supprimez la clé API dans la console Claude.
