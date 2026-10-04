import { Chip, Tag } from "./Chip";
import { prettyLoc } from "@/lib/text";
import type { ChangeSet, Cite } from "@/lib/types";

const chips = (cs: Cite[] = []) => (
  <span className="inline-flex flex-wrap gap-1.5">
    {cs.map((c, i) => <Chip key={i} c={{ ...c, loc: c.loc ?? "", label: `${c.src}${c.loc ? " · " + prettyLoc(c.loc) : ""}`, verified: true }} />)}
  </span>
);

const R = (on: boolean | undefined, ms: number) => (on ? { className: "reveal", style: { animationDelay: `${ms}ms` } } : { className: "", style: undefined });

function Col({ title, hint, tone, items, delay }: { title: string; hint: string; tone: string; items: { text: string; citations: Cite[]; proposer?: string }[]; delay?: number }) {
  const r = R(delay !== undefined, delay ?? 0);
  return (
    <div className={`rounded-lg border p-4 ${tone} ${r.className}`} style={r.style}>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mb-2 text-sm text-muted">{hint}</p>
      {items.length === 0 ? <p className="text-muted italic">Nothing in this file.</p> : (
        <ul className="space-y-2">{items.map((x, i) => <li key={i}>{x.text}{x.proposer ? <span className="text-muted"> (proposed by {x.proposer})</span> : null} {chips(x.citations)}</li>)}</ul>
      )}
    </div>
  );
}

export function ChangeSetView({ cs, animate }: { cs: ChangeSet; animate?: boolean }) {
  const g = cs.guardrails;
  const d = (ms: number) => (animate ? ms : undefined);
  const approvalWarn = g.notes.some((n) => n.includes("may present the proposed date"));
  const blocked = g.notes.filter((n) => n.includes("NOT closed")).length;
  const moved = g.notes.filter((n) => n.startsWith("Moved to proposals")).length;
  return (
    <div className="space-y-4">
      {cs.summary && <p className="text-lg">{cs.summary}</p>}
      <div className="grid gap-3 lg:grid-cols-3">
        <Col title="Problem status" hint="What changed in the state of a problem" tone="border-blocker/30 bg-blocker/5" items={cs.problemStatus} delay={d(150)} />
        <Col title="Prior decision (still in force)" hint="Stays valid until the proper authority changes it" tone="border-primary/30 bg-primary/5" items={cs.priorDecisions} delay={d(500)} />
        <Col title="New proposal (not approved)" hint="A suggestion, not a decision" tone="border-proposal/30 bg-proposal/5" items={cs.newProposals} delay={d(850)} />
      </div>
      {cs.newDecisions.length > 0 && <Col title="New decision (approval quoted)" hint="Only kept when the new file quotes the proper authority" tone="border-validation/30 bg-validation/5" items={cs.newDecisions} delay={d(1000)} />}
      <div className="grid gap-3 md:grid-cols-2">
        <div className={`rounded-lg border border-line bg-surface p-4 ${R(animate, 1200).className}`} style={R(animate, 1200).style}>
          <h3 className="font-bold">Go-live conditions</h3>
          {cs.conditionChanges.length === 0 ? <p className="text-muted">No condition changes status. Other conditions stay as they were.</p> :
            <ul className="space-y-1">{cs.conditionChanges.map((c, i) => <li key={i}>#{c.id} → <Tag t={c.status === "met" ? "MET" : "OPEN"} /> {c.text} {chips(c.citations)}</li>)}</ul>}
          <h3 className="mt-3 font-bold">Affected</h3>
          <p>Answers: {cs.affected.answers.join(", ") || "none"} · Conditions: {cs.affected.conditions.join(", ") || "none"} · Actions: {cs.affected.actions.join(", ") || "none"}</p>
        </div>
        <div className={`rounded-lg border border-line bg-surface p-4 ${R(animate, 1400).className}`} style={R(animate, 1400).style}>
          <h3 className="font-bold">Guardrails</h3>
          <ul className="text-sm">
            {[
              { cls: approvalWarn ? "font-semibold text-blocker" : "", text: approvalWarn ? "⚠ A revised text may present a proposal as approved: review it below" : `✓ No approval invented${moved ? ` (${moved} unquoted decision moved to proposals)` : ""}` },
              { cls: "", text: `✓ No condition closed without its validating owner${blocked ? ` (${blocked} attempt blocked)` : ""}` },
              { cls: g.beyondContractEnd ? "font-semibold text-delivery" : "", text: g.beyondContractEnd ? "⚠ A date falls after the contract end" : "✓ Within contract period" },
              { cls: "", text: "✓ Baseline preserved (Sept 30, 2026, 09:00)" },
            ].map((li, i) => { const r = R(animate, 1600 + i * 220); return <li key={i} className={`${li.cls} ${r.className}`} style={r.style}>{li.text}</li>; })}
          </ul>
          {g.notes.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-delivery">{g.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        </div>
      </div>
      {((cs.revisedAnswers?.length ?? 0) > 0 || (cs.revisedBrief?.length ?? 0) > 0) && (
        <div className={`rounded-lg border border-marker bg-marker/10 p-4 ${R(animate, 2600).className}`} style={R(animate, 2600).style}>
          <h3 className="font-bold">The new state</h3>
          <p className="mb-2 text-sm text-muted">What the brief and the answers become after this information. The baseline versions stay available.</p>
          {cs.revisedBrief?.map((b, i) => <p key={`b${i}`} className="mb-2"><strong>Brief · {b.theme}:</strong> {b.text} {chips(b.citations)}</p>)}
          {cs.revisedAnswers?.map((a, i) => <p key={`a${i}`} className="mb-2"><strong>{a.id}:</strong> {a.text} {chips(a.citations)}</p>)}
        </div>
      )}
      {cs.newActions.length > 0 && (
        <div className={`rounded-lg border border-line bg-surface p-4 ${R(animate, 2900).className}`} style={R(animate, 2900).style}>
          <h3 className="font-bold">Actions to take</h3>
          <ul className="mt-1 space-y-1">{cs.newActions.map((a, i) => (
            <li key={i}><strong>{a.title}</strong> · {a.owner} ({a.ownerStatus}) · due {a.due} <Tag t={a.type} /> {chips(a.citations)}</li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}
