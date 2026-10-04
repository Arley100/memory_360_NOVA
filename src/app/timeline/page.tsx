import { PageHeader, Icon } from "@/components/UI";
import { Chips, Tag } from "@/components/Chip";
import { fmtDay } from "@/lib/text";
import { getKB, resolver, updates } from "@/lib/store";
import { updateTimeline } from "@/lib/updateMemory";

export default async function Timeline() {
  const k = await getKB();
  const ups = await updates();
  const r = await resolver([], ups);
  const fmt = fmtDay;
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
        {updateTimeline(ups).map((e) => (
          <li key={e.id} className="timeline-event">
            <span className="timeline-node node-update"><Icon name="upload" size={13} /></span>
            <div className="space-y-2">
              <div className="timeline-event-content">
                <time className="timeline-date">{fmt(e.date)}</time>
                <span className="version-delta">UPDATE {e.updateId}</span>
                <Tag t={e.tag} />
                <span className={big.has(e.tag) ? "font-bold" : ""}>{e.title}</span>
                <Chips cites={e.citations.map(r)} />
              </div>
              {e.context.map((c, i) => <p key={i} className="text-sm text-muted">Prior decision still in force (context at {e.updateId}): {c.text} <Chips cites={c.citations.map(r)} /></p>)}
            </div>
          </li>
        ))}
        <li className="timeline-upcoming"><p className="section-label mb-2">Upcoming</p>{k.goLive.date} · target go-live ({k.goLive.status ?? "conditional"}){k.goLive.contractEnd ? ` · ${k.goLive.contractEnd} · contract ends` : ""}</li>
      </ol>
    </div>
  );
}
