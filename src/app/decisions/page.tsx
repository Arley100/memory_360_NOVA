import { PageHeader } from "@/components/UI";
import { Chips } from "@/components/Chip";
import { allSegments, allSources, getKB, type DecisionStage } from "@/lib/store";
import { indexSegments } from "@/lib/cite";
import { resolveDecisionEvidence } from "@/lib/decisionEvidence";

export default async function Decisions() {
  const [k, segments, sources] = await Promise.all([getKB(), allSegments(), allSources()]);
  const sourceIds = new Set(sources.map((s) => s.id));
  const bySrc = indexSegments(segments.filter((s) => sourceIds.has(s.src)));
  const cols = ["Proposed", "Decided", "Delivered", "Validated"] as const;
  const stages = ["proposed", "decided", "delivered", "validated"] as const satisfies readonly DecisionStage[];
  const tones = { proposed: "text-proposal", decided: "text-primary", delivered: "text-delivery", validated: "text-validation" };
  return (
    <div className="space-y-6">
      <PageHeader title="Decisions" subtitle={<>Each decision&apos;s lifecycle. A proposal is not a decision; a delivery is not a validation.</>} />
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead className="bg-canvas"><tr><th className="p-3">Subject</th>{cols.map((c) => <th key={c} className="p-3"><span className={`stage-marker stage-${c.toLowerCase()}`} />{c}</th>)}<th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {k.decisions.map((d) => (
              <tr key={d.id}>
                <td className="p-3 font-semibold"><span className="text-muted">{d.id}</span> {d.subject}</td>
                {stages.map((stage) => {
                  const cites = resolveDecisionEvidence(d.evidence?.[stage], bySrc);
                  return <td key={stage} className={`p-3 ${tones[stage]}`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{d[stage]}</span>
                      {cites.length > 0 ? <Chips cites={cites} /> : <span className="text-xs text-muted">Evidence not linked</span>}
                    </div>
                  </td>;
                })}
                <td className="p-3"><span className="decision-status">{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
