import Link from "next/link";
import { Chips } from "@/components/Chip";
import { currentBrief, kb, resolver, updates } from "@/lib/store";

export default async function Brief({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const k = kb();
  const ups = await updates();
  const r = await resolver([], ups);
  const showCurrent = ups.length > 0 && view !== "baseline";
  const rows = await currentBrief(ups);
  return (
    <article className="mx-auto max-w-3xl rounded-lg border border-line bg-surface p-8 print:border-0 print:p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">NOVA · Handover brief</h1>
        <span className="text-sm text-muted">{showCurrent ? `Current state · after ${ups.at(-1)!.cs.id}` : `State as of ${k.brief.asOf}`}</span>
      </div>
      {ups.length > 0 && (
        <nav className="no-print mt-3 flex gap-2 text-sm" aria-label="Version">
          <Link href="/brief" className={`rounded-full border px-3 py-1 ${showCurrent ? "border-primary bg-primary text-white" : "border-line"}`}>Current</Link>
          <Link href="/brief?view=baseline" className={`rounded-full border px-3 py-1 ${!showCurrent ? "border-primary bg-primary text-white" : "border-line"}`}>Baseline (Sept 30, 09:00)</Link>
        </nav>
      )}
      <dl className="mt-4 divide-y divide-line">
        {rows.map(({ item, current }) => {
          const useCurrent = showCurrent && current;
          return (
            <div key={item.theme} className={`grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] ${useCurrent ? "bg-marker/20 -mx-2 px-2" : ""}`}>
              <dt className="font-bold">
                {item.theme}
                {useCurrent && <span className="ml-2 rounded bg-marker px-1.5 text-xs font-semibold">changed in {current.changedIn}</span>}
              </dt>
              <dd>
                {useCurrent ? current.text : item.text} <Chips cites={(useCurrent ? current.citations : item.citations).map(r)} />
                {useCurrent && (
                  <details className="no-print mt-1 text-sm text-muted">
                    <summary className="cursor-pointer">Baseline (Sept 30)</summary>
                    {item.text}
                  </details>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="no-print mt-6 text-sm text-muted">Print this page (Ctrl+P): it fits on one page. Items marked &quot;our recommendation&quot; are proposals by our team, not documented commitments.</p>
    </article>
  );
}
