import { PageHeader } from "@/components/UI";
import { kb } from "@/lib/store";

export default function Decisions() {
  const k = kb();
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
                <td className="p-3 font-semibold"><span className="text-muted">{d.id}</span> {d.subject}</td>
                <td className="p-3 text-proposal">{d.proposed}</td>
                <td className="p-3 text-primary">{d.decided}</td>
                <td className="p-3 text-delivery">{d.delivered}</td>
                <td className="p-3 text-validation">{d.validated}</td>
                <td className="p-3 font-semibold">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
