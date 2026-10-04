import { PageHeader } from "@/components/UI";
import { Chips, Tag } from "@/components/Chip";
import { kb, resolver, updates } from "@/lib/store";

export default async function Actions() {
  const k = kb();
  const ups = await updates();
  const r = await resolver([], ups);
  const extra = ups.flatMap((u) => u.cs.newActions.map((a, i) => ({ ...a, id: `${u.cs.id}-A${i + 1}`, condition: undefined as number | undefined })));
  const rows = [...k.actions, ...extra];
  return (
    <div className="space-y-6">
      <PageHeader title="Actions" subtitle={<>Owner is confirmed (named in the corpus) or proposed (our suggestion). Due dates are never invented: unknown dates are marked TBC.</>} />
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead className="bg-canvas"><tr>{["ID", "Action", "Condition", "Owner", "Type", "Due", "Evidence"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="p-3 font-mono">{a.id}</td>
                <td className="p-3 font-semibold">{a.title}</td>
                <td className="p-3">{a.condition ? `#${a.condition}` : "—"}</td>
                <td className="p-3">{a.owner}<br /><span className="text-muted">{a.ownerStatus}</span></td>
                <td className="p-3"><Tag t={a.type} /></td>
                <td className={`p-3 ${a.due.startsWith("TBC") ? "text-muted italic" : ""}`}>{a.due}</td>
                <td className="p-3"><Chips cites={a.citations.map(r)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
