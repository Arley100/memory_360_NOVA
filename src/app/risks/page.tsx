import { frenchAppContent } from "@/lib/frenchContent";
import { frenchLabel } from "@/lib/locale";
import { Chips } from "@/components/Chip";
import { Icon, PageHeader } from "@/components/UI";
import {
  allSegments,
  allSources,
  baselineSegments,
  baselineSources,
  curatedKB,
  currentConditions,
  getKB,
  resolver,
  updates,
} from "@/lib/store";
import { deriveRisks, type RiskStatus } from "@/lib/risks";
import { fmtDateTime, fmtDay } from "@/lib/text";

function Status({ status }: { status: RiskStatus }) {
  return (
    <span className="semantic-tag bg-canvas text-ink border-line">
      <Icon
        name={
          status === "Current" || status === "Uncertain" ? "warning" : "check"
        }
        size={12}
      />
      {frenchLabel(status)}
    </span>
  );
}

export default async function Risks() {
  const ups = await updates();
  const [kb, conditions, sources, segments, resolve] = await Promise.all([
    getKB(),
    currentConditions(ups),
    allSources(ups),
    allSegments(ups),
    resolver([], ups),
  ]);
  const risks = deriveRisks(kb, conditions, sources, segments, resolve);
  const baseline = frenchAppContent(curatedKB());
  const baselineResolve = await resolver([], []);
  const original = deriveRisks(
    baseline,
    baseline.conditions,
    baselineSources(),
    baselineSegments(),
    baselineResolve,
  );
  const priorities = risks.filter((r) => r.status === "Current");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Risques"
        subtitle="Une entrée du registre ne reflète pas automatiquement l’état actuel. La validation opérationnelle et la date des faits déterminent l’interprétation actuelle."
      />
      <p className="text-xs text-muted">
        Preuves au{" "}
        {ups.at(-1)?.cs.publishedAt
          ? fmtDateTime(ups.at(-1)!.cs.publishedAt)
          : fmtDateTime(kb.asOf)}{" "}
        ·{" "}
        {ups.length
          ? `État actuel après ${ups.at(-1)!.cs.id}`
          : "Référence initiale du projet"}
      </p>
      <section className="panel">
        <div className="section-header">
          <h2>Risques prioritaires actuels</h2>
          <span className="text-xs text-muted">
            {priorities.length} étayés par les preuves actuelles
          </span>
        </div>
        <p className="px-5 py-3 text-xs text-muted">
          Ordre du registre. Probabilité et impact reprennent les valeurs du registre ; aucun classement numérique n’est déduit. Les entrées résolues, fermées ou incertaines sont exclues.
        </p>
        {priorities.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    "Risque",
                    "Probabilité / impact",
                    "Interprétation actuelle",
                    "Preuves",
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priorities.map((risk) => (
                  <tr key={risk.id}>
                    <td>
                      <a
                        href={`#risk-${risk.id}`}
                        className="font-semibold text-primary"
                      >
                        {risk.id} · {risk.title}
                      </a>
                      <div className="mt-2">
                        <Status status={risk.status} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {risk.probability} / {risk.impact}
                    </td>
                    <td className="min-w-60">{risk.interpretation}</td>
                    <td>
                      <Chips cites={[...risk.ratingCites, ...risk.evidence]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm">
            Aucun risque prioritaire actuel étayé par des preuves liées et vérifiées. Consultez les entrées ci-dessous.
          </p>
        )}
      </section>
      <section className="panel">
        <div className="section-header">
          <h2>Tous les risques enregistrés</h2>
          <span className="text-xs text-muted">
            {risks.length} entrées · développez pour voir les preuves
          </span>
        </div>
        {!risks.length && (
          <p className="p-5 text-sm">
            Aucun registre structuré des risques trouvé dans le corpus.
          </p>
        )}
        <div className="divide-y divide-line">
          {risks.map((risk) => {
            const before = original.find((r) => r.id === risk.id);
            return (
              <details
                key={risk.id}
                id={`risk-${risk.id}`}
                className="risk-entry scroll-mt-5"
              >
                <summary className="risk-summary cursor-pointer px-5 py-4 focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="font-semibold">
                    {risk.id} · {risk.title}
                  </span>
                  <span className="text-xs text-muted">
                    Registre : {risk.registerStatus} · {risk.probability} /{" "}
                    {risk.impact}
                  </span>
                  <Status status={risk.status} />
                </summary>
                <div className="space-y-4 border-t border-line bg-canvas/40 p-5 text-sm">
                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                    <span>
                      <strong>Responsable documenté :</strong> {risk.owner}
                    </span>
                    <span>
                      <strong>Date du registre :</strong>{" "}
                      {fmtDay(risk.registerDate)}
                    </span>
                    {risk.changedIn && (
                      <span>
                        <strong>Changement publié :</strong> {risk.changedIn}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="section-label mb-2">Preuves du registre</p>
                    <p className="mb-2">
                      {risk.mitigation}
                      {risk.followUp && ` · ${risk.followUp}`}
                    </p>
                    <Chips cites={risk.registerCites} />
                  </div>
                  <div>
                    <p className="section-label mb-2">Interprétation actuelle</p>
                    {risk.stale && (
                      <span className="semantic-tag mb-2 border-line bg-surface text-muted">
                        <Icon name="warning" size={12} />
                        Registre périmé
                      </span>
                    )}
                    <p className="mb-2">{risk.interpretation}</p>
                    {risk.stale && (
                      <p className="mb-2 text-muted">
                        Le registre du {fmtDay(risk.registerDate)} indique encore «
                        {risk.registerStatus}», mais les preuves opérationnelles faisant autorité remplacent cette entrée. Comparez la date des faits, plutôt que celle du fichier.
                      </p>
                    )}
                    <Chips cites={risk.evidence} />
                  </div>
                  {ups.length > 0 && before && (
                    <div className="border-t border-line pt-3">
                      <p className="section-label mb-2">Référence → actuel</p>
                      <p className="mb-2">
                        {frenchLabel(before.status)} → {frenchLabel(risk.status)}
                      </p>
                      <p className="mb-2 text-muted">
                        Référence : {before.interpretation}
                      </p>
                      <Chips cites={before.evidence} />
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
