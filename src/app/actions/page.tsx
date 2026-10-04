import { frenchLabel } from "@/lib/locale";
import { PageHeader } from "@/components/UI";
import { Chips, Tag } from "@/components/Chip";
import { getKB, resolver, updates } from "@/lib/store";

export default async function Actions() {
  const k = await getKB();
  const ups = await updates();
  const r = await resolver([], ups);
  const extra = ups.flatMap((u) => u.cs.newActions.map((a, i) => ({ ...a, id: `${u.cs.id}-A${i + 1}`, condition: undefined as number | undefined })));
  const rows = [...k.actions, ...extra];
  return (
    <div className="space-y-6">
      <PageHeader title="Actions" subtitle={<>Le responsable est confirmé (nommé dans le corpus) ou proposé (notre suggestion). Les échéances inconnues restent à confirmer.</>} />
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead className="bg-canvas"><tr>{["ID", "Action", "Condition", "Responsable", "Type", "Échéance", "Preuves"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="p-3 font-mono">{a.id}</td>
                <td className="p-3 font-semibold">{a.title}</td>
                <td className="p-3">{a.condition ? `#${a.condition}` : "—"}</td>
                <td className="p-3">{a.owner}<br /><span className="text-muted">{frenchLabel(a.ownerStatus)}</span></td>
                <td className="p-3"><Tag t={a.type} /></td>
                <td className={`p-3 ${/^(TBC|À confirmer)/.test(a.due) ? "text-muted italic" : ""}`}>{frenchLabel(a.due)}</td>
                <td className="p-3"><Chips cites={a.citations.map(r)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
