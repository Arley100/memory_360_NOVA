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
        <ul className="list-disc pl-5">
          <li>Open <a className="text-primary underline" href="https://memory-360-nova.vercel.app">the deployed application</a> and start at <Link className="text-primary underline" href="/">Overview</Link>. Enter the jury demo code when prompted for protected operations.</li>
          <li>Locally: Node.js 20.9+, <code>npm install</code>, <code>npm run ingest</code>, <code>npm run dev</code>; open <code>http://localhost:3000</code>.</li>
        </ul>
        <p>Jurors need no paid subscription or personal AI account; hosted AI uses the team&apos;s configured provider and demo code.</p></section>
      <section><h2 className="text-xl font-bold">Navigation</h2>
        <ul className="list-disc pl-5">
          <li><strong>Overview / Handover brief:</strong> readiness, budget, conditions and next actions / printable project summary.</li>
          <li><strong>Build from sources:</strong> AI rebuild from indexed files, with citation checks and internal required-fact coverage.</li>
          <li><strong>Timeline / Decisions:</strong> dated baseline/update events / cited proposal → decision → delivery → validation lineage.</li>
          <li><strong>Contradictions / Risks:</strong> conflicting claims and their resolution / register entries, current interpretations, stale evidence and baseline comparisons.</li>
          <li><strong>Actions / Team:</strong> commitments or recommendations, confirmed or proposed owners, dates or TBC / roles and responsibilities.</li>
          <li><strong>Questions / Sources / Add new information:</strong> official answers and freshness / searchable evidence / reviewed updates.</li>
        </ul></section>
      <section><h2 className="text-xl font-bold">Search / chat</h2>
        <p>Header <strong>Ask</strong> opens the persistent global <strong>NOVA Assistant</strong> (EN/FR), with follow-ups and Current/Baseline modes. History stays across navigation, saved in this browser when available. Header answers stay in chat, separate from official Q01–Q10. <strong>Sources</strong> searches text without AI.</p>
      </section>
      <section><h2 className="text-xl font-bold">Questions and freshness</h2>
        <ul className="list-disc pl-5">
          <li><strong>Q01–Q10</strong> are the ten official dossier questions: cached answers, computation times, changed files and Up to date / Needs recompute / Requires review status.</li>
          <li>Use individual refresh or Select stale → Recompute selected. More → Recompute from all sources gives full verification. After publishing, trigger recomputation of affected answers separately; this requires a configured AI provider, and failures preserve previous answers.</li>
          <li>Expand original answers/traps. The page’s separate “Ask another question” form adds session answers below, outside official recomputation and header chat.</li>
        </ul></section>
      <section><h2 className="text-xl font-bold">Evidence and source navigation</h2>
        <p>Hover or focus a citation for passage, context, authority and quote verification; click for its highlighted source location. Locators: <code>L23</code> line, <code>¶3</code> email paragraph, <code>p.1</code> PDF page, <code>F7</code> spreadsheet cell, <code>row 4</code> screenshot row. Inspect metadata, attachments and original files; return via Sources. Search ignores accents; “Show noise and duplicates” reveals hidden files.</p>
      </section>
      <section><h2 className="text-xl font-bold">Adding new information</h2>
        <ul className="list-disc pl-5">
          <li><strong>Upload → analyze → review → publish → affected memory.</strong> Drop files/ZIP. With AI configured, review problem status, prior decisions still in force, new proposals, affected items, actions, revised answers/brief and guardrails.</li>
          <li>Correct flagged content, then publish U001, U002… with sources/history. Inspect current conditions/brief and recompute affected official questions separately.</li>
          <li>AI off: supported text is extracted; manual fallback edits only the three status/decision/proposal text columns before publication. It cannot author citations, approvals or structured impacts/actions/revisions. Empty impacts mean unassessed. Guardrails still run; demo-code protection still applies.</li>
        </ul>
      </section>
      <section><h2 className="text-xl font-bold">Baseline vs current</h2>
        <p><strong>Sep 30, 2026, 09:00 Montréal</strong> is the preserved baseline. Current includes published updates. Check header version, history and Assistant mode; earlier replies keep their original context. Ask again after updates.</p>
      </section>
      <section><h2 className="text-xl font-bold">Tools and automation</h2>
        <ul className="list-disc pl-5">
          <li>AI accelerates analysis through Anthropic or an OpenAI-compatible provider. Build, chat, recomputation and automatic impact analysis require configured AI; new image transcription also needs vision support. Local setup: <code>.env.local</code>, following <code>.env.example</code>.</li>
          <li>Browsing, indexed evidence, search and supported text extraction work without AI. Publication always requires human review.</li>
          <li>Next.js/React/TypeScript, document parsers and Vercel/Upstash hosting/storage. Claude, ChatGPT and Codex assisted development; required-fact coverage is the team&apos;s internal verification.</li>
        </ul></section>
      <section><h2 className="text-xl font-bold">Manual review and limitations</h2>
        <ul className="list-disc pl-5">
          <li>NOVA facts require supplied corpus evidence. Citations are verified against indexed sources; AI can be wrong, unsupported claims are flagged, and quote matching does not prove conclusions.</li>
          <li>Human-review changes before publishing: extracted text, authority, approvals, owners and TBC dates. Baseline screenshots were human-transcribed; verify new image extraction.</li>
          <li>Scanned PDFs without a text layer and unreadable formats need manual inspection; uploading a file does not guarantee its contents were extracted.</li>
          <li>Newer timestamps do not necessarily mean higher authority. Screenshots show past states; compare validation and dates of facts. Duplicates are not independent evidence.</li>
          <li>Undocumented outcomes remain unknown; recommendations are not commitments. Split oversized uploads as prompted. Configured AI can still fail.</li>
        </ul></section>
      <section className="guide-limits"><h2 className="text-xl font-bold">Current documented uncertainties</h2>
        <p>Verified baseline gaps below; published updates may supersede them. Check current evidence and question freshness.</p>
        <ul className="list-disc pl-5 space-y-2">
          {uncertainties.map((item) => <li key={item.title}><strong>{item.title}:</strong> {item.text}{" "}<Chips cites={item.citations.map(resolve)} /></li>)}
        </ul></section>
    </article>
  );
}
