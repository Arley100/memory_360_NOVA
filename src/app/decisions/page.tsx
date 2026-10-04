import { frenchLabel } from "@/lib/locale";
import { PageHeader } from "@/components/UI";
import { Chips, Tag } from "@/components/Chip";
import { allSegments, allSources, getKB, resolver, updates, type DecisionStage } from "@/lib/store";
import { decisionLineages } from "@/lib/updateMemory";
import { fmtDay } from "@/lib/text";
import { indexSegments } from "@/lib/cite";
import { resolveDecisionEvidence } from "@/lib/decisionEvidence";

export default async function Decisions() {
  const [k, ups] = await Promise.all([getKB(), updates()]);
  const [r, segments, sources] = await Promise.all([resolver([], ups), allSegments(ups), allSources(ups)]);
  const lineages = decisionLineages(k, ups);
  const sourceIds = new Set(sources.map((s) => s.id));
  const bySrc = indexSegments(segments.filter((s) => sourceIds.has(s.src)));
  const cols = ["Proposition", "Décision", "Livraison", "Validation"] as const;
  const stages = ["proposed", "decided", "delivered", "validated"] as const satisfies readonly DecisionStage[];
  const tones = { proposed: "text-proposal", decided: "text-primary", delivered: "text-delivery", validated: "text-validation" };
  return (
    <div className="space-y-6">
      <PageHeader title="Décisions" subtitle={<>Cycle de chaque décision. Une proposition n’est pas une décision ; une livraison n’est pas une validation.</>} />
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead className="bg-canvas"><tr><th className="p-3">Sujet</th>{cols.map((c, i) => <th key={c} className="p-3"><span className={`stage-marker stage-${["proposed", "decided", "delivered", "validated"][i]}`} />{c}</th>)}<th className="p-3">Statut</th></tr></thead>
          <tbody className="divide-y divide-line">
            {k.decisions.map((d) => (
              <tr key={d.id}>
                <td className="p-3 font-semibold"><p className="section-label">DÉCISION DE RÉFÉRENCE</p><span className="text-muted">{d.id}</span> {d.subject}</td>
                {stages.map((stage) => {
                  const cites = resolveDecisionEvidence(d.evidence?.[stage], bySrc);
                  return <td key={stage} className={`p-3 ${tones[stage]}`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{d[stage]}</span>
                      {cites.length > 0 ? <Chips cites={cites} /> : <span className="text-xs text-muted">Preuve non liée</span>}
                    </div>
                  </td>;
                })}
                <td className="p-3"><span className="decision-status">{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lineages.some((g) => g.steps.length) && <section className="space-y-4" aria-label="Historique des décisions">
        <h2 className="text-xl font-semibold">Historique des décisions</h2>
        {lineages.filter((g) => g.steps.length).map((g) => <article key={g.id} className="panel p-5 space-y-3">
          <h3 className="font-semibold">{g.subject}</h3>
          {g.baseline && <div className="border-l-2 border-line pl-3">
            <p className="section-label">DÉCISION DE RÉFÉRENCE · {g.baseline.id}</p>
            <p>Proposition : {g.baseline.proposed}</p>
            <p>Décision : {g.baseline.decided}</p>
            <p className="text-muted">{g.baseline.status}</p>
          </div>}
          <ol className="space-y-3">{g.steps.map((s) => <li key={s.id} className="border-l-2 border-line pl-3 space-y-1">
            <p className="section-label">{s.stage === "DECIDED" ? "NOUVELLE DÉCISION" : s.stage === "PROPOSED" ? "NOUVELLE PROPOSITION" : "CONTINUITÉ / CONTEXTE"} · MISE À JOUR {s.updateId} · {fmtDay(s.date)}</p>
            <p>{s.stage !== "CONTINUITY" && <Tag t={s.stage === "DECIDED" ? "DECISION" : "PROPOSAL"} />} <strong>{s.stage === "CONTINUITY" ? "Décision antérieure toujours en vigueur : " : `${frenchLabel(s.stage)} : `}</strong>{s.text}</p>
            {(s.proposer || s.authority) && <p className="text-sm text-muted">{s.stage === "PROPOSED" ? s.proposer ?? s.authority : s.authority ?? s.proposer}</p>}
            <Chips cites={s.citations.map(r)} />
          </li>)}</ol>
          <p className="font-semibold">Actuel : {g.current}</p>
        </article>)}
      </section>}
    </div>
  );
}
