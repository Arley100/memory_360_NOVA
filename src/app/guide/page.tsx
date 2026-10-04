import Link from "next/link";
import { Chips } from "@/components/Chip";
import { PageHeader } from "@/components/UI";
import { resolver } from "@/lib/store";

export default async function Guide() {
  const resolve = await resolver([], []);
  const uncertainties = [
    {
      title: "SEC-210",
      text: "Fix delivered to validation; security acceptance and completed re-test results are undocumented. The ticket remains EN VALIDATION; no re-test date is given.",
      citations: [
        { src: "SEC-210", loc: "L23", quote: "Fix déployé sur l'environnement de validation." },
        { src: "SEC-210", loc: "L25", quote: "Re-test planifié. Statut maintenu EN VALIDATION." },
        { src: "M06", loc: "L7", quote: "Nous n'avons pas encore donné l'acceptation sécurité de SEC-210." },
      ],
    },
    {
      title: "ACC-303",
      text: "Still open. A fix is announced for the next build; delivery, validated closure and a precise completion date are undocumented.",
      citations: [{ src: "ACC-303", loc: "L16", quote: "Toujours ouvert. Correctif annoncé pour la prochaine build." }],
    },
    {
      title: "OPS-601",
      text: "Final runbook not received as of Sept 29. Rollback is TODO and post-deployment validation is incomplete; final approval and readiness date are undocumented.",
      citations: [
        { src: "OPS-601", loc: "L16", quote: "Toujours pas reçu la version finale." },
        { src: "OPS-601.png", loc: "region=row-4", quote: "4. Procédure de retour arrière : TODO" },
        { src: "OPS-601.png", loc: "region=row-5", quote: "5. Validation fonctionnelle post-déploiement : À compléter" },
      ],
    },
    {
      title: "INV-003 / CR-04",
      text: "Invoice under validation includes CAD 18,000 for unapproved CR-04 work. An invoice reference is not approval; resolution of this line is undocumented.",
      citations: [
        { src: "INV-003", loc: "page=1", quote: "Optimisation interface mobile - CR-04 18 000 $" },
        { src: "CR-04", loc: "page=1", quote: "Aucun numéro d’approbation ni signature de comité n’est présent dans ce document." },
        { src: "E10", loc: "body:P3", quote: "Aucune dépense liée à CR-04 ne doit être engagée ou facturée sans nouvelle approbation." },
      ],
    },
    {
      title: "Production go-live",
      text: "Canada Central architecture and verified migration are documented. The approved Oct 22 target remains conditional on security, accessibility and runbook approval; actual production go-live is undocumented at baseline.",
      citations: [
        { src: "ADR-007", loc: "L10", quote: "L'environnement de production de NOVA sera déployé dans **Canada Central**." },
        { src: "M03", loc: "L5", quote: "La migration de l'architecture vers Canada Central est déclarée terminée par Boréal et vérifiée par l'équipe architecture." },
        { src: "M06", loc: "L11", quote: "trois conditions concrètes : validation sécurité de SEC-210, fermeture de ACC-303 et approbation du runbook incluant rollback." },
      ],
    },
  ];

  return (
    <article className="guide-article">
      <PageHeader title="Usage guide" subtitle="Start with Overview, ask NOVA, then inspect the evidence." />
      <section><h2 className="text-xl font-bold">Opening</h2>
        <p>Open <a className="text-primary underline" href="https://memory-360-nova.vercel.app">the deployed application</a> at <Link className="text-primary underline" href="/">Overview</Link>. Enter the jury demo code when prompted for protected operations. No paid subscription or personal Claude/OpenAI account is needed.</p>
        <p>Local setup and deployment instructions are in README.md and DEPLOY.md.</p></section>
      <section><h2 className="text-xl font-bold">Navigation</h2>
        <ul className="list-disc pl-5">
          <li><strong>Overview / Handover brief:</strong> readiness, budget, conditions and next actions / printable project summary (Ctrl+P).</li>
          <li><strong>Build from sources:</strong> rebuilds memory from indexed files, verifies citations and cross-checks required facts.</li>
          <li><strong>Timeline / Decisions:</strong> dated project evolution / proposal → decision → delivery → validation.</li>
          <li><strong>Contradictions / Risks:</strong> conflicting records and resolution / risk entries, current interpretation and stale evidence.</li>
          <li><strong>Actions / Team:</strong> commitments and recommendations, confirmed or proposed owners, deadlines or TBC / roles and responsibilities.</li>
          <li><strong>Questions:</strong> official Q01–Q10 answers, freshness and recomputation.</li>
          <li><strong>Sources:</strong> searchable evidence, exact locators and original files.</li>
          <li><strong>Add new information:</strong> analyze, review and publish evidence while preserving the baseline.</li>
          <li><strong>NOVA Assistant:</strong> persistent evidence-grounded chat in English or French.</li>
        </ul></section>
      <section><h2 className="text-xl font-bold">Asking questions and checking evidence</h2>
        <ul className="list-disc pl-5">
          <li>Header <strong>Ask</strong> opens <strong>NOVA Assistant</strong>: English/French, follow-ups and Current/Baseline modes. History survives navigation and refresh when local storage is available.</li>
          <li>Chat stays separate from the ten official Q01–Q10 answers in <strong>Questions</strong>:  <strong>Up to date</strong>, <strong>Needs recompute</strong> or <strong>Requires review</strong>; stale answers show changed files.</li>
          <li>Use individual refresh, <strong>Select stale → Recompute selected</strong>, or <strong>More → Recompute from all sources</strong>. Recomputation requires configured AI.</li>
          <li>Hover/focus citations for evidence previews; click for the exact source location: line, email paragraph, PDF page, spreadsheet cell or screenshot row.</li>
          <li><strong>Sources</strong> supports direct text search without AI.</li>
        </ul></section>
      <section><h2 className="text-xl font-bold">Adding new information</h2>
        <p><strong>Upload → analyze → review → publish → inspect affected memory.</strong></p>
        <p>With configured AI, NOVA extracts content, identifies problem status, proposals, formal decisions and affected questions/conditions/actions, proposes actions/brief updates, verifies citations and applies guardrails.</p>
        <p>Human review is required. Publication creates U001, U002… and preserves the baseline. Inspect affected memory; recompute stale official answers as needed.</p>
        <p>Without AI, ingest and review supported text; publish source/version information and available manual fields. Automatic impact analysis, citation generation and answer recomputation are unavailable.</p>
        <p>New image transcription needs a vision-capable provider. Unreadable/scanned files without extractable text remain for manual review, subject to the storage limit below.</p>
      </section>
      <section><h2 className="text-xl font-bold">Baseline vs current</h2>
        <p><strong>September 30, 2026 at 09:00 Montréal time</strong> is the preserved baseline. <strong>Current = baseline + published updates.</strong> New information never rewrites the baseline.</p>
        <p>Use the header version, update history and Assistant Current/Baseline selector. Earlier replies retain their context; recheck after updates.</p>
      </section>
      <section><h2 className="text-xl font-bold">Tools</h2>
        <ul className="list-disc pl-5">
          <li><strong>NOVA Assistant:</strong> evidence-grounded questions in English/French.</li>
          <li><strong>Build from sources:</strong> reconstructs memory from indexed evidence.</li>
          <li><strong>Questions:</strong> tracks ten official answers and freshness.</li>
          <li><strong>Sources:</strong> searches and opens original evidence at precise locators.</li>
          <li><strong>Add new information:</strong> analyzes and publishes reviewed updates.</li>
          <li><strong>Evidence previews:</strong> source context, authority and verified quotes.</li>
        </ul>
        <p>AI uses Anthropic or an OpenAI-compatible provider configured server-side. Browsing memory and evidence requires no jury AI account.</p></section>
      <section><h2 className="text-xl font-bold">Manual review</h2>
        <p>Before publishing, verify:</p>
        <ul className="list-disc pl-5">
          <li>extracted text and attachments;</li>
          <li>source authority;</li>
          <li>proposal vs formal decision, delivery or validation;</li>
          <li>owners and due dates;</li>
          <li>affected questions, conditions and actions;</li>
          <li>guardrail warnings.</li>
        </ul>
        <p>Unknown information stays <strong>TBC</strong> or <strong>undocumented</strong>, rather than inferred.</p></section>
      <section><h2 className="text-xl font-bold">Limitations</h2>
        <ul className="list-disc pl-5">
          <li>NOVA facts must come from the supplied corpus. AI can be wrong; unsupported claims are flagged and citations checked against indexed sources.</li>
          <li>A valid quote alone does not prove an authoritative conclusion; newer timestamps do not automatically mean higher authority.</li>
          <li>Historical screenshots can be stale; duplicate attachments are not independent confirmation.</li>
          <li>Missing approvals, owners or deadlines remain undocumented/TBC.</li>
          <li>AI-assisted features may be unavailable if the configured provider fails.</li>
          <li>Hosted picker: 4.3 MiB total; retained originals: 4 MiB (4,194,304 bytes) per file. Larger originals are not retained; split oversized files before uploading.</li>
        </ul></section>
      <section className="guide-limits"><h2 className="text-xl font-bold">Current documented uncertainties</h2>
        <p>Verified baseline gaps below; published updates may supersede them. Check current evidence and question freshness.</p>
        <ul className="list-disc pl-5 space-y-2">
          {uncertainties.map((item) => <li key={item.title}><strong>{item.title}:</strong> {item.text}{" "}<Chips cites={item.citations.map(resolve)} /></li>)}
        </ul></section>
    </article>
  );
}
