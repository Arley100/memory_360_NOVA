import { PageHeader } from "@/components/UI";
import { Chips, Tag } from "@/components/Chip";
import { getKB, resolver, updates } from "@/lib/store";
import { decisionLineages } from "@/lib/updateMemory";
import { fmtDay } from "@/lib/text";

export default async function Decisions() {
  const k = await getKB();
  const ups = await updates();
  const r = await resolver([], ups);
  const lineages = decisionLineages(k, ups);
  const cols = ["Proposed", "Decided", "Delivered", "Validated"] as const;
  return (
    <div className="space-y-6">
      <PageHeader title="Decisions" subtitle={<>Each decision&apos;s lifecycle. A proposal is not a decision; a delivery is not a validation.</>} />
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead className="bg-canvas"><tr><th className="p-3">Subject</th>{cols.map((c) => <th key={c} className="p-3"><span className={`stage-marker stage-${c.toLowerCase()}`} />{c}</th>)}<th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {k.decisions.map((d) => (
              <tr key={d.id}>
                <td className="p-3 font-semibold"><p className="section-label">BASELINE DECISION</p><span className="text-muted">{d.id}</span> {d.subject}</td>
                <td className="p-3 text-proposal">{d.proposed}</td>
                <td className="p-3 text-primary">{d.decided}</td>
                <td className="p-3 text-delivery">{d.delivered}</td>
                <td className="p-3 text-validation">{d.validated}</td>
                <td className="p-3"><span className="decision-status">{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lineages.some((g) => g.steps.length) && <section className="space-y-4" aria-label="Decision lineage">
        <h2 className="text-xl font-semibold">Decision lineage</h2>
        {lineages.filter((g) => g.steps.length).map((g) => <article key={g.id} className="panel p-5 space-y-3">
          <h3 className="font-semibold">{g.subject}</h3>
          {g.baseline && <div className="border-l-2 border-line pl-3">
            <p className="section-label">BASELINE DECISION · {g.baseline.id}</p>
            <p>Proposed: {g.baseline.proposed}</p>
            <p>Decision: {g.baseline.decided}</p>
            <p className="text-muted">{g.baseline.status}</p>
          </div>}
          <ol className="space-y-3">{g.steps.map((s) => <li key={s.id} className="border-l-2 border-line pl-3 space-y-1">
            <p className="section-label">{s.stage === "DECIDED" ? "UPDATE DECISION" : s.stage === "PROPOSED" ? "UPDATE PROPOSAL" : "CONTINUITY / CONTEXT"} · UPDATE {s.updateId} · {fmtDay(s.date)}</p>
            <p>{s.stage !== "CONTINUITY" && <Tag t={s.stage === "DECIDED" ? "DECISION" : "PROPOSAL"} />} <strong>{s.stage === "CONTINUITY" ? "Prior decision still in force: " : `${s.stage}: `}</strong>{s.text}</p>
            {(s.proposer || s.authority) && <p className="text-sm text-muted">{s.stage === "PROPOSED" ? s.proposer ?? s.authority : s.authority ?? s.proposer}</p>}
            <Chips cites={s.citations.map(r)} />
          </li>)}</ol>
          <p className="font-semibold">Current: {g.current}</p>
        </article>)}
      </section>}
    </div>
  );
}
