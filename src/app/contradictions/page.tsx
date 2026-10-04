import { frenchLabel } from "@/lib/locale";
import { PageHeader, Icon } from "@/components/UI";
import { Chips } from "@/components/Chip";
import { getKB, resolver } from "@/lib/store";

export default async function Contradictions() {
  const k = await getKB();
  const r = await resolver();
  return (
    <div className="space-y-6">
      <PageHeader title="Contradictions" subtitle={<>Résolution selon l’autorité ou la date des faits. Une date de fichier récente ne garantit pas un contenu à jour.</>} />
      {k.contradictions.map((c) => (
        <section key={c.id} className="panel comparison-panel">
          <div className="section-header">
            <h2 className="text-base font-semibold"><span className="text-muted">{c.id}</span> {c.topic}</h2>
            <span className="rounded border border-primary/40 bg-primary/5 px-1.5 text-xs font-semibold text-primary">résolu selon {frenchLabel(c.rule)}</span>
            {c.planOrRegister && <span className="rounded border border-line px-1.5 text-xs font-semibold">dans un plan ou registre des risques</span>}
          </div>
          <div className="comparison-grid">
            <div className="comparison-claim"><p className="section-label mb-3">Affirmation / source périmée</p><p>{c.a}</p><Chips cites={c.aCit.map(r)} /></div>
            <div className="comparison-authority"><p className="section-label mb-3">Preuves faisant autorité / actuelles</p><p>{c.b}</p><Chips cites={c.bCit.map(r)} /></div>
          </div>
          <div className="resolution-row"><Icon name="check" /><p><strong>Résolution :</strong> {c.resolution}</p></div>
        </section>
      ))}
    </div>
  );
}
