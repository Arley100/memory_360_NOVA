import { frenchLabel } from "@/lib/locale";
import Link from "next/link";
import { Chips, Tag } from "@/components/Chip";
import { Icon, MetricCell, PageHeader, Panel, SectionHeader } from "@/components/UI";
import { currentConditions, getKB, resolver, updates } from "@/lib/store";
import { fmtDay, money } from "@/lib/text";

const fmtDate = fmtDay;

export default async function Overview({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const { changed } = await searchParams;
  const ups = await updates();
  const k = await getKB();
  const r = await resolver([], ups);
  const conds = await currentConditions(ups);
  const met = conds.filter((c) => c.status === "met").length;
  // Just published? Compare with the state before that update, to show exactly what changed.
  const justPublished = changed ? ups.find((u) => u.cs.id === changed) : undefined;
  const before = justPublished ? await currentConditions(ups.slice(0, ups.indexOf(justPublished))) : null;
  const metBefore = before ? before.filter((c) => c.status === "met").length : null;
  const statusBefore = (id: number) => before?.find((c) => c.id === id)?.status;
  const b = k.budget;
  const pct = (n: number) => `${Math.max(0, (n / Math.max(b.authorized, 1)) * 100)}%`;
  const proposals = ups.flatMap((u) => u.cs.newProposals.map((p) => ({ ...p, id: u.cs.id })));
  const status = k.goLive.status ?? "conditional";
  const components = b.components ?? (b.base !== undefined ? [{ label: "contrat initial", amount: b.base }, { label: "demande de changement approuvée", amount: b.cr01 ?? 0 }] : []);

  return (
    <div className="overview">
      <PageHeader title="NOVA" subtitle={`État de NOVA ${ups.length ? `(état actuel, après ${ups.at(-1)!.cs.id})` : "au 30 sept. 2026, 9 h"}`}>
        <span className="readiness-label"><span className="status-dot" />Préparation à la mise en production · {frenchLabel(status)}</span>
      </PageHeader>
      {justPublished && <div role="status" className="panel mb-5 p-4 text-sm"><strong>{justPublished.cs.id} publiée.</strong> {justPublished.cs.summary} <Link href="/questions" className="text-primary underline">Vérifier l’actualité des réponses</Link> ; le recalcul nécessite une IA configurée et doit être lancé séparément.</div>}
      <div className="metric-strip">
        <MetricCell label="Payé à ce jour" value={money(b.paid)}>CAD · hors taxes</MetricCell>
        <MetricCell label="Mise en production" value={fmtDate(k.goLive.date)}><span className="text-delivery">{frenchLabel(status)}</span></MetricCell>
        <MetricCell label="Budget autorisé" value={money(b.authorized)}>{components.map((x) => x.label).join(" + ") || "CAD · hors taxes"}</MetricCell>
        <MetricCell label="Conditions de mise en production" value={<>{met}<span className="text-muted text-lg"> / {conds.length}</span></>}><div className="progress-track mt-2"><div style={{ width: `${met / Math.max(conds.length, 1) * 100}%` }} /></div></MetricCell>
      </div>
      <div className="overview-grid">
        <div className="space-y-5 min-w-0">
          <Panel>
            <SectionHeader title="Conditions de mise en production"><span className="text-xs text-muted">{met} sur {conds.length} satisfaites{metBefore !== null && metBefore !== met ? ` (auparavant ${metBefore})` : ""}</span></SectionHeader>
            <div className="px-5 pt-4"><div className="progress-track" role="img" aria-label={`${met} sur {conds.length} conditions de mise en production satisfaites`}><div style={{ width: `${met / Math.max(conds.length, 1) * 100}%` }} /></div></div>
            {conds.length === 0 && <p className="p-5 text-sm text-muted">Aucune condition de mise en production documentée dans cette analyse.</p>}
            <ol className="condition-list">
              {conds.map((c) => <li key={c.id} className={justPublished && c.changedIn === changed ? "flash-marker" : undefined}>
                <span className={`condition-index ${c.status === "met" ? "is-met" : ""}`}>{String(c.id).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3>{c.title}</h3>{statusBefore(c.id) && statusBefore(c.id) !== c.status && <span className="text-xs text-muted">Précédemment {frenchLabel(statusBefore(c.id))}</span>}<Tag t={c.status === "met" ? "MET" : "OPEN"} />{c.changedIn && <span className="version-delta">modifié dans {c.changedIn}</span>}</div>
                  <p className="mt-1 text-xs text-muted">Responsable : {c.owner}</p>
                  <p className="mt-2 text-[13px]">{c.changeText ?? c.state}</p>
                </div>
                <div className="condition-evidence"><Chips cites={(c.changeCites ?? c.citations).map(r)} /></div>
              </li>)}
            </ol>
          </Panel>
          <Panel>
            <SectionHeader title="Budget et factures"><span className="text-[10px] text-muted">CAD · hors taxes</span></SectionHeader>
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="section-label">Autorisé</p><p className="text-2xl font-semibold tracking-tight">{money(b.authorized)}</p><p className="text-xs text-muted">{components.map((x, i) => <span key={i}>{i > 0 && " + "}{money(x.amount)} {x.label}</span>)}</p></div>
                <Chips cites={components.flatMap((x) => ("citations" in x ? (x.citations ?? []) : []).slice(0, 1)).map(r)} />
              </div>
              <div className="budget-track" role="img" aria-label={`Payé ${money(b.paid)}, facturé non payé ${money(b.invoicedValid - b.paid)}, solde ${money(b.remaining)}`}>
                <div className="bg-brand" style={{ width: pct(b.paid) }} /><div className="bg-delivery/60" style={{ width: pct(b.invoicedValid - b.paid) }} /><div className="bg-line" style={{ width: pct(b.remaining) }} />
              </div>
              <ul className="budget-legend">
                <li><span className="legend-dot bg-brand" /><div>Payé<strong>{money(b.paid)}</strong></div></li>
                <li><span className="legend-dot bg-delivery/60" /><div>Facturé, non payé<strong>{money(b.invoicedValid - b.paid)}</strong></div></li>
                <li><span className="legend-dot bg-line" /><div>Solde<strong>{money(b.remaining)}</strong></div></li>
              </ul>
              {b.unapproved > 0 && <div className="budget-exception"><Icon name="warning" size={16} /><span><strong>Non payable : {money(b.unapproved)}</strong>{b.unapprovedLabel ? ` · ${b.unapprovedLabel}` : ""}</span><Chips cites={(b.unapprovedCitations ?? []).slice(0, 2).map(r)} /></div>}
            </div>
          </Panel>
        </div>
        <div className="space-y-5 min-w-0">
          <Panel className="context-rail">
            <SectionHeader title="Décision actuelle"><Icon name="decisions" size={17} /></SectionHeader>
            <div className="p-5"><h3>{fmtDate(k.goLive.date)} · {frenchLabel(status)} mise en production</h3>{k.goLive.headline && <p className="mt-2 text-[13px]">{k.goLive.headline}</p>}<div className="mt-3"><Chips cites={(k.goLive.citations ?? []).map(r)} /></div></div>
            {proposals.length > 0 && <div className="proposal-snapshot"><Tag t="PROPOSAL" /><strong className="block mt-2 text-xs">Nouvelle proposition (non approuvée) :</strong>{proposals.map((p, i) => <p key={i} className="mt-2 text-xs">{p.text} <span className="text-muted">({p.id})</span></p>)}</div>}
          </Panel>
          <Panel className="context-rail">
            <SectionHeader title="Prochaines actions"><Link href="/actions" className="text-xs text-primary hover:underline">Toutes les actions →</Link></SectionHeader>
            <ul className="action-feed">{[...k.actions.slice(0, 6), ...ups.flatMap((u) => u.cs.newActions.map((a, i) => ({ ...a, id: `${u.cs.id}-A${i + 1}` })))].map((a) => <li key={a.id}><span className="feed-marker" /><div><p className="text-xs font-semibold">{a.title}</p><p className="mt-1 text-[10px] text-muted">{a.id} · {a.owner} ({frenchLabel(a.ownerStatus)}) · échéance {frenchLabel(a.due)}</p><span className="feed-type"><Tag t={a.type} /></span></div></li>)}</ul>
          </Panel>
          {ups.length > 0 && <Panel><SectionHeader title="Changements depuis la référence" /><div className="divide-y divide-line">{ups.map((u) => <Link key={u.cs.id} href="/update" className="block p-4 text-xs hover:bg-canvas"><strong>{u.cs.id}</strong> · {u.cs.filename} · {u.cs.summary}</Link>)}</div></Panel>}
        </div>
      </div>
      {(k.goLive.contractEndNote || k.goLive.contractEnd) && <div className="watch-note mt-5"><Icon name="warning" /><p><strong>Point de vigilance :</strong> {k.goLive.contractEndNote ?? `Le contrat prend fin le ${fmtDate(k.goLive.contractEnd)}.`} <Chips cites={(k.goLive.contractEndCitations ?? []).map(r)} /></p></div>}
    </div>
  );
}
