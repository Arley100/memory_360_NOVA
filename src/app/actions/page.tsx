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
      <h1 className="text-3xl font-bold">Actions</h1>
      <p className="text-muted">Owner is confirmed (named in the corpus) or proposed (our suggestion). Due dates are never invented: unknown dates are marked TBC.</p>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
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
