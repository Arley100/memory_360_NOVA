import { Chips } from "@/components/Chip";
import { kb, resolver } from "@/lib/store";

export default function Brief() {
  const k = kb();
  const r = resolver();
  return (
    <article className="mx-auto max-w-3xl rounded-lg border border-line bg-surface p-8 print:border-0 print:p-0">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">NOVA · Handover brief</h1>
        <span className="text-sm text-muted">State as of {k.brief.asOf}</span>
      </div>
      <dl className="mt-4 divide-y divide-line">
        {k.brief.sections.map((s) => (
          <div key={s.theme} className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr]">
            <dt className="font-bold">{s.theme}</dt>
            <dd>{s.text} <Chips cites={s.citations.map(r)} /></dd>
          </div>
        ))}
      </dl>
      <p className="no-print mt-6 text-sm text-muted">Print this page (Ctrl+P): it fits on one page. Items marked &quot;our recommendation&quot; are proposals by our team, not documented commitments.</p>
    </article>
  );
}
