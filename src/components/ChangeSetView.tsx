import { Icon } from "./UI";
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
    <div className={`review-column ${tone} ${r.className}`} style={r.style}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-4 mt-1 text-xs text-muted">{hint}</p>
      {items.length === 0 ? <p className="text-muted italic">Nothing in this file.</p> : (
        <ul className="review-items">{items.map((x, i) => <li key={i}>{x.text}{x.proposer ? <span className="text-muted"> (proposed by {x.proposer})</span> : null} {chips(x.citations)}</li>)}</ul>
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
    <div className="changeset space-y-4">
      {cs.summary && <p className="review-summary">{cs.summary}</p>}
      <div className="grid gap-3 lg:grid-cols-3">
        <Col title="Problem status" hint="What changed in the state of a problem" tone="review-problem" items={cs.problemStatus} delay={d(0)} />
        <Col title="Prior decision (still in force)" hint="Stays valid until the proper authority changes it" tone="review-decision" items={cs.priorDecisions} delay={d(100)} />
        <Col title="New proposal (not approved)" hint="A suggestion, not a decision" tone="review-proposal" items={cs.newProposals} delay={d(200)} />
      </div>
      {cs.newDecisions.length > 0 && <Col title="New decision (approval quoted)" hint="Only kept when the new file quotes the proper authority" tone="review-validation" items={cs.newDecisions} delay={d(300)} />}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="panel p-5">
          <h3 className="font-bold">Go-live conditions</h3>
          {cs.conditionChanges.length === 0 ? <p className="text-muted">No condition changes status. Other conditions stay as they were.</p> :
            <ul className="space-y-1">{cs.conditionChanges.map((c, i) => <li key={i}>#{c.id} → <Tag t={c.status === "met" ? "MET" : "OPEN"} /> {c.text} {chips(c.citations)}</li>)}</ul>}
          <h3 className="mt-3 font-bold">Affected</h3>
          <p>Answers: {cs.affected.answers.join(", ") || "none"} · Conditions: {cs.affected.conditions.join(", ") || "none"} · Actions: {cs.affected.actions.join(", ") || "none"}</p>
        </div>
        <div className="panel p-5">
          <h3 className="font-bold">Guardrails</h3>
          <ul className="guardrail-list">
            <li className={approvalWarn ? "text-blocker" : ""}><Icon name={approvalWarn ? "warning" : "check"} size={16} /><span>{approvalWarn ? "A revised text may present a proposal as approved: review it below" : `No approval invented${moved ? ` (${moved} unquoted decision moved to proposals)` : ""}`}</span></li>
            <li><Icon name="check" size={16} /><span>No condition closed without its validating owner{blocked ? ` (${blocked} attempt blocked)` : ""}</span></li>
            <li className={g.beyondContractEnd ? "text-delivery" : ""}><Icon name={g.beyondContractEnd ? "warning" : "check"} size={16} /><span>{g.beyondContractEnd ? "A date falls after the contract end" : "Within contract period"}</span></li>
            <li><Icon name="check" size={16} /><span>Baseline preserved (Sept 30, 2026, 09:00)</span></li>
          </ul>
          {g.notes.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-delivery">{g.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        </div>
      </div>
      {((cs.revisedAnswers?.length ?? 0) > 0 || (cs.revisedBrief?.length ?? 0) > 0) && (
        <div className="answer-delta p-5">
          <h3 className="font-bold">The new state</h3>
          <p className="mb-4 mt-1 text-xs text-muted">Proposed revisions to the brief and knowledge state. Official question answers stay unchanged until manually recomputed.</p>
          {cs.revisedBrief?.map((b, i) => <p key={`b${i}`} className="mb-2"><strong>Brief · {b.theme}:</strong> {b.text} {chips(b.citations)}</p>)}
          {cs.revisedAnswers?.map((a, i) => <p key={`a${i}`} className="mb-2"><strong>{a.id}:</strong> {a.text} {chips(a.citations)}</p>)}
        </div>
      )}
      {cs.newActions.length > 0 && (
        <div className="panel p-5">
          <h3 className="font-bold">Actions to take</h3>
          <ul className="mt-1 space-y-1">{cs.newActions.map((a, i) => (
            <li key={i}><strong>{a.title}</strong> · {a.owner} ({a.ownerStatus}) · due {a.due} <Tag t={a.type} /> {chips(a.citations)}</li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}
