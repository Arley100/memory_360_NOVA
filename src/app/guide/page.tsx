import Link from "next/link";
import { Chips } from "@/components/Chip";
import { PageHeader } from "@/components/UI";
import { resolver } from "@/lib/store";

export default async function Guide() {
  const resolve = await resolver([], []);
  const uncertainties = [
    {
      title: "SEC-210",
      text: "Correctif livré en validation ; acceptation de sécurité et résultats du nouveau test non documentés. Le ticket reste EN VALIDATION ; aucune date de nouveau test n’est précisée.",
      citations: [
        { src: "SEC-210", loc: "L23", quote: "Fix déployé sur l'environnement de validation." },
        { src: "SEC-210", loc: "L25", quote: "Re-test planifié. Statut maintenu EN VALIDATION." },
        { src: "M06", loc: "L7", quote: "Nous n'avons pas encore donné l'acceptation sécurité de SEC-210." },
      ],
    },
    {
      title: "ACC-303",
      text: "Toujours ouvert. Correctif annoncé pour la prochaine version ; livraison, fermeture validée et date précise non documentées.",
      citations: [{ src: "ACC-303", loc: "L16", quote: "Toujours ouvert. Correctif annoncé pour la prochaine build." }],
    },
    {
      title: "OPS-601",
      text: "Guide d’exploitation final non reçu au 29 septembre. Retour arrière à faire et validation après déploiement incomplète ; approbation finale et date de disponibilité non documentées.",
      citations: [
        { src: "OPS-601", loc: "L16", quote: "Toujours pas reçu la version finale." },
        { src: "OPS-601.png", loc: "region=row-4", quote: "4. Procédure de retour arrière : TODO" },
        { src: "OPS-601.png", loc: "region=row-5", quote: "5. Validation fonctionnelle post-déploiement : À compléter" },
      ],
    },
    {
      title: "INV-003 / CR-04",
      text: "La facture en validation comprend 18 000 $ CA pour CR-04, non approuvée. Une mention sur facture ne vaut pas approbation ; le règlement de cette ligne est non documenté.",
      citations: [
        { src: "INV-003", loc: "page=1", quote: "Optimisation interface mobile - CR-04 18 000 $" },
        { src: "CR-04", loc: "page=1", quote: "Aucun numéro d’approbation ni signature de comité n’est présent dans ce document." },
        { src: "E10", loc: "body:P3", quote: "Aucune dépense liée à CR-04 ne doit être engagée ou facturée sans nouvelle approbation." },
      ],
    },
    {
      title: "Mise en production",
      text: "Architecture Canada Central et migration vérifiée documentées. La cible approuvée du 22 octobre reste conditionnelle à la sécurité, à l’accessibilité et à l’approbation du guide d’exploitation ; mise en production effective non documentée à la référence.",
      citations: [
        { src: "ADR-007", loc: "L10", quote: "L'environnement de production de NOVA sera déployé dans **Canada Central**." },
        { src: "M03", loc: "L5", quote: "La migration de l'architecture vers Canada Central est déclarée terminée par Boréal et vérifiée par l'équipe architecture." },
        { src: "M06", loc: "L11", quote: "trois conditions concrètes : validation sécurité de SEC-210, fermeture de ACC-303 et approbation du runbook incluant rollback." },
      ],
    },
  ];

  return (
    <article className="guide-article">
      <PageHeader title="Guide d’utilisation" subtitle="Commencez par la vue d’ensemble, interrogez NOVA, puis vérifiez les preuves." />
      <section><h2 className="text-xl font-bold">Ouverture</h2>
        <p>Ouvrir <a className="text-primary underline" href="https://memory-360-nova.vercel.app">l’application déployée</a> à <Link className="text-primary underline" href="/">Vue d’ensemble</Link>. Saisissez le code de démonstration du jury pour les opérations protégées. Aucun abonnement payant ni compte personnel Claude/OpenAI n’est nécessaire.</p>
        <p>Les instructions d’installation locale et de déploiement figurent dans README.md et DEPLOY.md.</p></section>
      <section><h2 className="text-xl font-bold">Navigation</h2>
        <ul className="list-disc pl-5">
          <li><strong>Vue d’ensemble / Fiche de passation :</strong> préparation, budget, conditions et prochaines actions / résumé imprimable (Ctrl+P).</li>
          <li><strong>Reconstruire depuis les sources :</strong> reconstitue la mémoire, vérifie les citations et les faits requis.</li>
          <li><strong>Chronologie / Décisions :</strong> évolution datée / proposition → décision → livraison → validation.</li>
          <li><strong>Contradictions / Risques :</strong> conflits et résolution / registre, interprétation actuelle et preuves périmées.</li>
          <li><strong>Actions / Équipe :</strong> engagements et recommandations, responsables confirmés ou proposés, échéances à confirmer / rôles.</li>
          <li><strong>Questions :</strong> réponses officielles Q01–Q10, actualité et recalcul.</li>
          <li><strong>Sources :</strong> recherche de preuves, repères précis et fichiers originaux.</li>
          <li><strong>Ajouter des informations :</strong> analyser, vérifier et publier en préservant la référence.</li>
          <li><strong>Assistant NOVA :</strong> conversation persistante fondée sur les preuves, en français ou en anglais.</li>
        </ul></section>
      <section><h2 className="text-xl font-bold">Poser des questions et vérifier les preuves</h2>
        <ul className="list-disc pl-5">
          <li>Le bouton <strong>Demander</strong> de l’en-tête ouvre l’<strong>Assistant NOVA</strong> : français/anglais, questions de suivi et modes Actuel/Référence. L’historique persiste après navigation et actualisation si le stockage local est disponible.</li>
          <li>La conversation est distincte des dix réponses officielles Q01–Q10 de <strong>Questions</strong> : <strong>À jour</strong>, <strong>À recalculer</strong> ou <strong>À vérifier</strong> ; les réponses périmées indiquent les fichiers modifiés.</li>
          <li>Actualisez une réponse, utilisez <strong>Sélectionner les réponses périmées → Recalculer la sélection</strong>, ou <strong>Plus → Recalculer depuis toutes les sources</strong>. Le recalcul nécessite une IA configurée.</li>
          <li>Survolez ou ciblez au clavier une citation pour un aperçu ; cliquez pour atteindre la ligne, le paragraphe de courriel, la page PDF, la cellule ou la rangée de capture.</li>
          <li><strong>Sources</strong> permet une recherche textuelle sans IA.</li>
        </ul></section>
      <section><h2 className="text-xl font-bold">Ajouter des informations</h2>
        <p><strong>Téléverser → analyser → vérifier → publier → inspecter la mémoire touchée.</strong></p>
        <p>Avec l’IA configurée, NOVA extrait le contenu, distingue problèmes, propositions et décisions, identifie les questions/conditions/actions touchées, propose des révisions, vérifie les citations et applique les garde-fous.</p>
        <p>La vérification humaine est obligatoire. La publication crée U001, U002… en préservant la référence. Inspectez la mémoire touchée et recalculez les réponses officielles périmées.</p>
        <p>Sans IA, importez et vérifiez le texte pris en charge ; publiez les sources, versions et champs manuels disponibles. L’analyse automatique des impacts, la génération de citations et le recalcul sont indisponibles.</p>
        <p>La transcription d’images nécessite un fournisseur avec vision. Les fichiers illisibles/numérisés sans texte extractible restent à vérifier manuellement, sous réserve de la limite de stockage ci-dessous.</p>
      </section>
      <section><h2 className="text-xl font-bold">Référence et état actuel</h2>
        <p><strong>30 septembre 2026 à 9 h, heure de Montréal</strong> constitue la référence préservée. <strong>Actuel = référence + mises à jour publiées.</strong> Les nouvelles informations ne réécrivent jamais la référence.</p>
        <p>Consultez la version d’en-tête, l’historique et le sélecteur Actuel/Référence. Les anciennes réponses conservent leur contexte ; revérifiez-les après une mise à jour.</p>
      </section>
      <section><h2 className="text-xl font-bold">Outils</h2>
        <ul className="list-disc pl-5">
          <li><strong>Assistant NOVA :</strong> questions fondées sur les preuves, en français/anglais.</li>
          <li><strong>Reconstruire depuis les sources :</strong> reconstitue la mémoire depuis les preuves indexées.</li>
          <li><strong>Questions :</strong> suit les dix réponses officielles et leur actualité.</li>
          <li><strong>Sources :</strong> recherche et ouvre les originaux aux repères précis.</li>
          <li><strong>Ajouter des informations :</strong> analyse et publie les mises à jour vérifiées.</li>
          <li><strong>Aperçus de preuves :</strong> contexte, autorité et citations vérifiées.</li>
        </ul>
        <p>L’IA utilise Anthropic ou un fournisseur compatible OpenAI configuré côté serveur. La consultation ne nécessite aucun compte IA du jury.</p></section>
      <section><h2 className="text-xl font-bold">Vérification manuelle</h2>
        <p>Avant publication, vérifiez :</p>
        <ul className="list-disc pl-5">
          <li>le texte extrait et les pièces jointes ;</li>
          <li>l’autorité de la source ;</li>
          <li>la distinction entre proposition, décision, livraison et validation ;</li>
          <li>les responsables et échéances ;</li>
          <li>les questions, conditions et actions touchées ;</li>
          <li>les avertissements des garde-fous.</li>
        </ul>
        <p>Les inconnues restent <strong>à confirmer</strong> ou <strong>non documentées</strong>, sans déduction.</p></section>
      <section><h2 className="text-xl font-bold">Limites</h2>
        <ul className="list-disc pl-5">
          <li>Les faits NOVA proviennent du corpus fourni. L’IA peut se tromper ; les affirmations non étayées sont signalées et les citations vérifiées.</li>
          <li>Une citation valide ne prouve pas l’autorité d’une conclusion ; une date récente ne confère pas automatiquement davantage d’autorité.</li>
          <li>Les captures historiques peuvent être périmées ; les pièces jointes en double ne sont pas des confirmations indépendantes.</li>
          <li>Approbations, responsables et échéances manquants restent non documentés/à confirmer.</li>
          <li>Les fonctions IA peuvent être indisponibles si le fournisseur échoue.</li>
          <li>Téléversement hébergé : 4,3 Mio au total ; originaux conservés : 4 Mio (4 194 304 octets) par fichier. Les originaux plus volumineux ne sont pas conservés ; scindez-les avant téléversement.</li>
        </ul></section>
      <section className="guide-limits"><h2 className="text-xl font-bold">Incertitudes actuellement documentées</h2>
        <p>Lacunes vérifiées à la référence ; des mises à jour publiées peuvent les remplacer. Consultez les preuves actuelles et l’actualité des réponses.</p>
        <ul className="list-disc pl-5 space-y-2">
          {uncertainties.map((item) => <li key={item.title}><strong>{item.title}:</strong> {item.text}{" "}<Chips cites={item.citations.map(resolve)} /></li>)}
        </ul></section>
    </article>
  );
}