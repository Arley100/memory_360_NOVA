import { frenchLabel } from "@/lib/locale";
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
      {items.length === 0 ? <p className="text-muted italic">Aucun élément dans ce fichier.</p> : (
        <ul className="review-items">{items.map((x, i) => <li key={i}>{x.text}{x.proposer ? <span className="text-muted"> (proposé par {x.proposer})</span> : null} {chips(x.citations)}</li>)}</ul>
      )}
    </div>
  );
}

export function ChangeSetView({ cs, animate }: { cs: ChangeSet; animate?: boolean }) {
  const g = cs.guardrails;
  const d = (ms: number) => (animate ? ms : undefined);
  const approvalWarn = g.notes.some((n) => /may present the proposed date|peut présenter la date proposée/.test(n));
  const blocked = g.notes.filter((n) => /NOT closed|NON fermée/.test(n)).length;
  const moved = g.notes.filter((n) => /^(Moved to proposals|Déplacée vers les propositions)/.test(n)).length;
  return (
    <div className="changeset space-y-4">
      {cs.summary && <p className="review-summary">{cs.summary}</p>}
      <div className="grid gap-3 lg:grid-cols-3">
        <Col title="État du problème" hint="Ce qui a changé dans l’état d’un problème" tone="review-problem" items={cs.problemStatus} delay={d(0)} />
        <Col title="Décision antérieure (en vigueur)" hint="Valide tant que l’autorité compétente ne la modifie pas" tone="review-decision" items={cs.priorDecisions} delay={d(100)} />
        <Col title="Nouvelle proposition (non approuvée)" hint="Une suggestion, pas une décision" tone="review-proposal" items={cs.newProposals} delay={d(200)} />
      </div>
      {cs.newDecisions.length > 0 && <Col title="Nouvelle décision (approbation citée)" hint="Conservée seulement si le fichier cite l’autorité compétente" tone="review-validation" items={cs.newDecisions} delay={d(300)} />}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="panel p-5">
          <h3 className="font-bold">Conditions de mise en production</h3>
          {cs.conditionChanges.length === 0 ? <p className="text-muted">Aucune condition ne change de statut. Les autres conservent leur état.</p> :
            <ul className="space-y-1">{cs.conditionChanges.map((c, i) => <li key={i}>#{c.id} → <Tag t={c.status === "met" ? "MET" : "OPEN"} /> {c.text} {chips(c.citations)}</li>)}</ul>}
          <h3 className="mt-3 font-bold">Éléments touchés</h3>
          <p>Réponses : {cs.affected.answers.join(", ") || "aucun"} · Conditions : {cs.affected.conditions.join(", ") || "aucun"} · Actions : {cs.affected.actions.join(", ") || "aucun"}</p>
        </div>
        <div className="panel p-5">
          <h3 className="font-bold">Garde-fous</h3>
          <ul className="guardrail-list">
            <li className={approvalWarn ? "text-blocker" : ""}><Icon name={approvalWarn ? "warning" : "check"} size={16} /><span>{approvalWarn ? "Un texte révisé peut présenter une proposition comme approuvée : vérifiez-le ci-dessous" : `Aucune approbation inventée${moved ? ` (${moved} décision sans citation déplacée vers les propositions)` : ""}`}</span></li>
            <li><Icon name="check" size={16} /><span>Aucune condition fermée sans son responsable de validation{blocked ? ` (${blocked} tentative bloquée)` : ""}</span></li>
            <li className={g.beyondContractEnd ? "text-delivery" : ""}><Icon name={g.beyondContractEnd ? "warning" : "check"} size={16} /><span>{g.beyondContractEnd ? "Une date dépasse la fin du contrat" : "Dans la période contractuelle"}</span></li>
            <li><Icon name="check" size={16} /><span>Référence préservée (30 sept. 2026, 9 h)</span></li>
          </ul>
          {g.notes.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-delivery">{g.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        </div>
      </div>
      {((cs.revisedAnswers?.length ?? 0) > 0 || (cs.revisedBrief?.length ?? 0) > 0) && (
        <div className="answer-delta p-5">
          <h3 className="font-bold">Le nouvel état</h3>
          <p className="mb-4 mt-1 text-xs text-muted">Révisions proposées de la fiche et de la mémoire. Les réponses officielles restent inchangées jusqu’au lancement du recalcul, qui nécessite une IA configurée.</p>
          {cs.revisedBrief?.map((b, i) => <p key={`b${i}`} className="mb-2"><strong>Fiche · {b.theme}:</strong> {b.text} {chips(b.citations)}</p>)}
          {cs.revisedAnswers?.map((a, i) => <p key={`a${i}`} className="mb-2"><strong>{a.id}:</strong> {a.text} {chips(a.citations)}</p>)}
        </div>
      )}
      {cs.newActions.length > 0 && (
        <div className="panel p-5">
          <h3 className="font-bold">Actions à entreprendre</h3>
          <ul className="mt-1 space-y-1">{cs.newActions.map((a, i) => (
            <li key={i}><strong>{a.title}</strong> · {a.owner} ({frenchLabel(a.ownerStatus)}) · échéance {frenchLabel(a.due)} <Tag t={a.type} /> {chips(a.citations)}</li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}
