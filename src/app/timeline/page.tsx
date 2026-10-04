import { PageHeader, Icon } from "@/components/UI";
import { Chips, Tag } from "@/components/Chip";
import { getKB, resolver, updates } from "@/lib/store";

export default async function Timeline() {
  const k = await getKB();
  const ups = await updates();
  const r = await resolver([], ups);
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  const big = new Set(["DECISION"]);
  return (
    <div className="space-y-6">
      <PageHeader title="Timeline" subtitle={<>Proposal, decision, delivery and validation are tagged separately. Bold rows are governance decisions.</>} />
      <ol className="panel timeline-module">
        {k.timeline.map((e, i) => (
          <li key={i} className="timeline-event">
            <span className={`timeline-node node-${e.tag.toLowerCase()}`}><Icon name={e.tag === "DECISION" ? "decisions" : e.tag === "VALIDATION" ? "check" : e.tag === "DELIVERY" ? "file" : "timeline"} size={13} /></span>
            <div className="timeline-event-content">
              <time className="timeline-date">{fmt(e.date)}</time>
              <Tag t={e.tag} />
              <span className={big.has(e.tag) ? "font-bold" : ""}>{e.title}</span>
              <Chips cites={e.citations.map(r)} />
            </div>
          </li>
        ))}
        <li className="timeline-event">
          <span className="timeline-node node-baseline"><Icon name="overview" size={13} /></span>
          <div className="font-bold">Sept 30, 2026, 09:00 · Baseline reference point</div>
        </li>
        {ups.map((u) => (
          <li key={u.cs.id} className="timeline-event">
            <span className="timeline-node node-update"><Icon name="upload" size={13} /></span>
            <div><span className="version-delta">{u.cs.id}</span> <strong>{u.cs.filename}</strong>: {u.cs.summary}</div>
          </li>
        ))}
        <li className="timeline-upcoming"><p className="section-label mb-2">Upcoming</p>{k.goLive.date} · target go-live ({k.goLive.status ?? "conditional"}){k.goLive.contractEnd ? ` · ${k.goLive.contractEnd} · contract ends` : ""}</li>
      </ol>
    </div>
  );
}
