import { PageHeader, Icon } from "@/components/UI";
import { Chips } from "@/components/Chip";
import { kb, resolver } from "@/lib/store";

export default async function Contradictions() {
  const k = kb();
  const r = await resolver();
  return (
    <div className="space-y-6">
      <PageHeader title="Contradictions" subtitle={<>Resolved by authority or by the date of the facts. A recent file date does not make content current.</>} />
      {k.contradictions.map((c) => (
        <section key={c.id} className="panel comparison-panel">
          <div className="section-header">
            <h2 className="text-base font-semibold"><span className="text-muted">{c.id}</span> {c.topic}</h2>
            <span className="rounded border border-primary/40 bg-primary/5 px-1.5 text-xs font-semibold text-primary">resolved by {c.rule}</span>
            {c.planOrRegister && <span className="rounded border border-line px-1.5 text-xs font-semibold">in a plan / risk register</span>}
          </div>
          <div className="comparison-grid">
            <div className="comparison-claim"><p className="section-label mb-3">Claim / stale source</p><p>{c.a}</p><Chips cites={c.aCit.map(r)} /></div>
            <div className="comparison-authority"><p className="section-label mb-3">Authoritative / current evidence</p><p>{c.b}</p><Chips cites={c.bCit.map(r)} /></div>
          </div>
          <div className="resolution-row"><Icon name="check" /><p><strong>Resolution:</strong> {c.resolution}</p></div>
        </section>
      ))}
    </div>
  );
}
