import { Chips } from "@/components/Chip";
import { kb, resolver } from "@/lib/store";

export default function Contradictions() {
  const k = kb();
  const r = resolver();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Contradictions</h1>
      <p className="text-muted">Resolved by authority or by the date of the facts. A recent file date does not make content current.</p>
      {k.contradictions.map((c) => (
        <section key={c.id} className="rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold"><span className="text-muted">{c.id}</span> {c.topic}</h2>
            <span className="rounded border border-primary/40 bg-primary/5 px-1.5 text-xs font-semibold text-primary">resolved by {c.rule}</span>
            {c.planOrRegister && <span className="rounded border border-line px-1.5 text-xs font-semibold">in a plan / risk register</span>}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-blocker/30 bg-blocker/5 p-3"><p className="font-semibold">Says</p><p>{c.a}</p><Chips cites={c.aCit.map(r)} /></div>
            <div className="rounded-md border border-validation/30 bg-validation/5 p-3"><p className="font-semibold">But</p><p>{c.b}</p><Chips cites={c.bCit.map(r)} /></div>
          </div>
          <p className="mt-3"><strong>Resolution:</strong> {c.resolution}</p>
        </section>
      ))}
    </div>
  );
}
