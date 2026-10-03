import { Chips, Tag } from "@/components/Chip";
import { kb, resolver, updates } from "@/lib/store";

export default function Timeline() {
  const k = kb();
  const r = resolver();
  const ups = updates();
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  const big = new Set(["DECISION"]);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Timeline</h1>
      <p className="text-muted">Proposal, decision, delivery and validation are tagged separately. Bold rows are governance decisions.</p>
      <ol className="relative border-l-2 border-line pl-6">
        {k.timeline.map((e, i) => (
          <li key={i} className="mb-4">
            <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ${big.has(e.tag) ? "bg-primary" : "bg-line"}`} />
            <div className="flex flex-wrap items-center gap-2">
              <time className="w-28 text-sm text-muted">{fmt(e.date)}</time>
              <Tag t={e.tag} />
              <span className={big.has(e.tag) ? "font-bold" : ""}>{e.title}</span>
              <Chips cites={e.citations.map(r)} />
            </div>
          </li>
        ))}
        <li className="mb-4">
          <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-4 border-ink bg-white" />
          <div className="font-bold">Sept 30, 2026, 09:00 · Baseline reference point</div>
        </li>
        {ups.map((u) => (
          <li key={u.cs.id} className="mb-4">
            <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-marker" />
            <div><span className="rounded bg-marker px-1.5 text-xs font-semibold">{u.cs.id}</span> <strong>{u.cs.filename}</strong>: {u.cs.summary}</div>
          </li>
        ))}
        <li className="text-muted">Oct 22, 2026 · target go-live (conditional) · Oct 31, 2026 · contract ends</li>
      </ol>
    </div>
  );
}
