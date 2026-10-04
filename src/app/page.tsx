import Link from "next/link";
import { Chips, Tag } from "@/components/Chip";
import { Icon, MetricCell, PageHeader, Panel, SectionHeader } from "@/components/UI";
import { currentConditions, getKB, resolver, updates } from "@/lib/store";
import { money } from "@/lib/text";

const fmtDate = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : d ?? "TBC");

export default async function Overview() {
  const ups = await updates();
  const k = await getKB();
  const r = await resolver([], ups);
  const conds = await currentConditions(ups);
  const met = conds.filter((c) => c.status === "met").length;
  const b = k.budget;
  const pct = (n: number) => `${Math.max(0, (n / Math.max(b.authorized, 1)) * 100)}%`;
  const proposals = ups.flatMap((u) => u.cs.newProposals.map((p) => ({ ...p, id: u.cs.id })));
  const status = k.goLive.status ?? "conditional";
  const components = b.components ?? (b.base !== undefined ? [{ label: "initial contract", amount: b.base }, { label: "approved change request", amount: b.cr01 ?? 0 }] : []);

  return (
    <div className="overview">
      <PageHeader title="NOVA" subtitle={`Where NOVA stands ${ups.length ? `(current state, after ${ups.at(-1)!.cs.id})` : "on Sept 30, 2026, 09:00"}`}>
        <span className="readiness-label"><span className="status-dot" />Go-live readiness · {status}</span>
      </PageHeader>
      <div className="metric-strip">
        <MetricCell label="Paid to date" value={money(b.paid)}>CAD · before tax</MetricCell>
        <MetricCell label="Go-live" value={fmtDate(k.goLive.date)}><span className="text-delivery">{status}</span></MetricCell>
        <MetricCell label="Authorized budget" value={money(b.authorized)}>{components.map((x) => x.label).join(" + ") || "CAD · before tax"}</MetricCell>
        <MetricCell label="Go-live conditions" value={<>{met}<span className="text-muted text-lg"> / {conds.length}</span></>}><div className="progress-track mt-2"><div style={{ width: `${met / Math.max(conds.length, 1) * 100}%` }} /></div></MetricCell>
      </div>
      <div className="overview-grid">
        <div className="space-y-5 min-w-0">
          <Panel>
            <SectionHeader title="The go-live conditions"><span className="text-xs text-muted">{met} of {conds.length} met</span></SectionHeader>
            <div className="px-5 pt-4"><div className="progress-track" role="img" aria-label={`${met} of {conds.length} go-live conditions met`}><div style={{ width: `${met / Math.max(conds.length, 1) * 100}%` }} /></div></div>
            {conds.length === 0 && <p className="p-5 text-sm text-muted">No go-live conditions documented in this analysis.</p>}
            <ol className="condition-list">
              {conds.map((c) => <li key={c.id}>
                <span className={`condition-index ${c.status === "met" ? "is-met" : ""}`}>{String(c.id).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3>{c.title}</h3><Tag t={c.status === "met" ? "MET" : "OPEN"} />{c.changedIn && <span className="version-delta">changed in {c.changedIn}</span>}</div>
                  <p className="mt-1 text-xs text-muted">Owner: {c.owner}</p>
                  <p className="mt-2 text-[13px]">{c.changeText ?? c.state}</p>
                </div>
                <div className="condition-evidence"><Chips cites={(c.changeCites ?? c.citations).map(r)} /></div>
              </li>)}
            </ol>
          </Panel>
          <Panel>
            <SectionHeader title="Budget and invoices"><span className="text-[10px] text-muted">CAD · before tax</span></SectionHeader>
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="section-label">Authorized</p><p className="text-2xl font-semibold tracking-tight">{money(b.authorized)}</p><p className="text-xs text-muted">{components.map((x, i) => <span key={i}>{i > 0 && " + "}{money(x.amount)} {x.label}</span>)}</p></div>
                <Chips cites={components.flatMap((x) => ("citations" in x ? (x.citations ?? []) : []).slice(0, 1)).map(r)} />
              </div>
              <div className="budget-track" role="img" aria-label={`Paid ${money(b.paid)}, invoiced not paid ${money(b.invoicedValid - b.paid)}, remaining ${money(b.remaining)}`}>
                <div className="bg-brand" style={{ width: pct(b.paid) }} /><div className="bg-delivery/60" style={{ width: pct(b.invoicedValid - b.paid) }} /><div className="bg-line" style={{ width: pct(b.remaining) }} />
              </div>
              <ul className="budget-legend">
                <li><span className="legend-dot bg-brand" /><div>Paid<strong>{money(b.paid)}</strong></div></li>
                <li><span className="legend-dot bg-delivery/60" /><div>Invoiced, not paid<strong>{money(b.invoicedValid - b.paid)}</strong></div></li>
                <li><span className="legend-dot bg-line" /><div>Remaining<strong>{money(b.remaining)}</strong></div></li>
              </ul>
              {b.unapproved > 0 && <div className="budget-exception"><Icon name="warning" size={16} /><span><strong>Not payable: {money(b.unapproved)}</strong>{b.unapprovedLabel ? ` · ${b.unapprovedLabel}` : ""}</span><Chips cites={(b.unapprovedCitations ?? []).slice(0, 2).map(r)} /></div>}
            </div>
          </Panel>
        </div>
        <div className="space-y-5 min-w-0">
          <Panel className="context-rail">
            <SectionHeader title="Current decision"><Icon name="decisions" size={17} /></SectionHeader>
            <div className="p-5"><h3>{fmtDate(k.goLive.date)} · {status} go-live</h3>{k.goLive.headline && <p className="mt-2 text-[13px]">{k.goLive.headline}</p>}<div className="mt-3"><Chips cites={(k.goLive.citations ?? []).map(r)} /></div></div>
            {proposals.length > 0 && <div className="proposal-snapshot"><Tag t="PROPOSAL" /><strong className="block mt-2 text-xs">New proposal on the table (not approved):</strong>{proposals.map((p, i) => <p key={i} className="mt-2 text-xs">{p.text} <span className="text-muted">({p.id})</span></p>)}</div>}
          </Panel>
          <Panel className="context-rail">
            <SectionHeader title="Next actions"><Link href="/actions" className="text-xs text-primary hover:underline">All actions →</Link></SectionHeader>
            <ul className="action-feed">{[...k.actions.slice(0, 6), ...ups.flatMap((u) => u.cs.newActions.map((a, i) => ({ ...a, id: `${u.cs.id}-A${i + 1}` })))].map((a) => <li key={a.id}><span className="feed-marker" /><div><p className="text-xs font-semibold">{a.title}</p><p className="mt-1 text-[10px] text-muted">{a.id} · {a.owner} ({a.ownerStatus}) · due {a.due}</p><span className="feed-type"><Tag t={a.type} /></span></div></li>)}</ul>
          </Panel>
          {ups.length > 0 && <Panel><SectionHeader title="Changes since the baseline" /><div className="divide-y divide-line">{ups.map((u) => <Link key={u.cs.id} href="/update" className="block p-4 text-xs hover:bg-canvas"><strong>{u.cs.id}</strong> · {u.cs.filename} · {u.cs.summary}</Link>)}</div></Panel>}
        </div>
      </div>
      {(k.goLive.contractEndNote || k.goLive.contractEnd) && <div className="watch-note mt-5"><Icon name="warning" /><p><strong>Watch item:</strong> {k.goLive.contractEndNote ?? `The contract ends ${fmtDate(k.goLive.contractEnd)}.`} <Chips cites={(k.goLive.contractEndCitations ?? []).map(r)} /></p></div>}
    </div>
  );
}
