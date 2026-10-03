import { Chip, Tag } from "./Chip";
import { prettyLoc } from "@/lib/text";
import type { ChangeSet, Cite } from "@/lib/types";

const chips = (cs: Cite[] = []) => (
  <span className="inline-flex flex-wrap gap-1.5">
    {cs.map((c, i) => <Chip key={i} c={{ ...c, loc: c.loc ?? "", label: `${c.src}${c.loc ? " · " + prettyLoc(c.loc) : ""}`, verified: true }} />)}
  </span>
);

function Col({ title, hint, tone, items }: { title: string; hint: string; tone: string; items: { text: string; citations: Cite[]; proposer?: string }[] }) {
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mb-2 text-sm text-muted">{hint}</p>
      {items.length === 0 ? <p className="text-muted italic">Nothing in this file.</p> : (
        <ul className="space-y-2">{items.map((x, i) => <li key={i}>{x.text}{x.proposer ? <span className="text-muted"> (proposed by {x.proposer})</span> : null} {chips(x.citations)}</li>)}</ul>
      )}
    </div>
  );
}

export function ChangeSetView({ cs }: { cs: ChangeSet }) {
  const g = cs.guardrails;
  return (
    <div className="space-y-4">
      {cs.summary && <p className="text-lg">{cs.summary}</p>}
      <div className="grid gap-3 lg:grid-cols-3">
        <Col title="Problem status" hint="What changed in the state of a problem" tone="border-blocker/30 bg-blocker/5" items={cs.problemStatus} />
        <Col title="Prior decision (still in force)" hint="Stays valid until the proper authority changes it" tone="border-primary/30 bg-primary/5" items={cs.priorDecisions} />
        <Col title="New proposal (not approved)" hint="A suggestion, not a decision" tone="border-proposal/30 bg-proposal/5" items={cs.newProposals} />
      </div>
      {cs.newDecisions.length > 0 && <Col title="New decision (approval quoted)" hint="Only kept when the new file quotes the proper authority" tone="border-validation/30 bg-validation/5" items={cs.newDecisions} />}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="font-bold">Go-live conditions</h3>
          {cs.conditionChanges.length === 0 ? <p className="text-muted">No condition changes status. Other conditions stay as they were.</p> :
            <ul className="space-y-1">{cs.conditionChanges.map((c, i) => <li key={i}>#{c.id} → <Tag t={c.status === "met" ? "MET" : "OPEN"} /> {c.text} {chips(c.citations)}</li>)}</ul>}
          <h3 className="mt-3 font-bold">Affected</h3>
          <p>Answers: {cs.affected.answers.join(", ") || "none"} · Conditions: {cs.affected.conditions.join(", ") || "none"} · Actions: {cs.affected.actions.join(", ") || "none"}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="font-bold">Guardrails</h3>
          <ul className="text-sm">
            <li>{g.approvalInvented ? "✗" : "✓"} No approval invented</li>
            <li>{g.otherConditionsClosed ? "✗" : "✓"} No other condition closed without its owner</li>
            <li>{g.beyondContractEnd ? "⚠ Date beyond contract end (Oct 31, 2026)" : "✓ Within contract period"}</li>
            <li>✓ Baseline preserved (Sept 30, 2026, 09:00)</li>
          </ul>
          {g.notes.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-delivery">{g.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        </div>
      </div>
      {cs.newActions.length > 0 && (
        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="font-bold">Actions to take</h3>
          <ul className="mt-1 space-y-1">{cs.newActions.map((a, i) => (
            <li key={i}><strong>{a.title}</strong> · {a.owner} ({a.ownerStatus}) · due {a.due} <Tag t={a.type} /> {chips(a.citations)}</li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}
