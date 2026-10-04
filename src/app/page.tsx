import Link from "next/link";
import { Chips, Tag } from "@/components/Chip";
import { Icon, MetricCell, PageHeader, Panel, SectionHeader } from "@/components/UI";
import { currentConditions, kb, resolver, updates } from "@/lib/store";
import { money } from "@/lib/text";

export default async function Overview() {
  const k = kb();
  const ups = await updates();
  const r = await resolver([], ups);
  const conds = await currentConditions(ups);
  const met = conds.filter((c) => c.status === "met").length;
  const b = k.budget;
  const pct = (n: number) => `${(n / b.authorized) * 100}%`;
  const proposals = ups.flatMap((u) => u.cs.newProposals.map((p) => ({ ...p, id: u.cs.id })));

  return (
    <div className="overview">
      <PageHeader title="NOVA" subtitle={`Where NOVA stands ${ups.length ? `(current state, after ${ups.at(-1)!.cs.id})` : "on Sept 30, 2026, 09:00"}`}>
        <span className="readiness-label"><span className="status-dot" />Go-live readiness · Conditional</span>
      </PageHeader>
      <div className="metric-strip">
        <MetricCell label="Paid to date" value={money(b.paid)}>CAD · before tax</MetricCell>
        <MetricCell label="Go-live" value="Oct 22, 2026"><span className="text-delivery">Conditional</span></MetricCell>
        <MetricCell label="Authorized budget" value={money(b.authorized)}>Contract + approved CR-01</MetricCell>
        <MetricCell label="Go-live conditions" value={<>{met}<span className="text-muted text-lg"> / 3</span></>}><div className="progress-track mt-2"><div style={{ width: `${met / 3 * 100}%` }} /></div></MetricCell>
      </div>
      <div className="overview-grid">
        <div className="space-y-5 min-w-0">
          <Panel>
            <SectionHeader title="The three go-live conditions"><span className="text-xs text-muted">{met} of 3 met</span></SectionHeader>
            <div className="px-5 pt-4"><div className="progress-track" role="img" aria-label={`${met} of 3 go-live conditions met`}><div style={{ width: `${met / 3 * 100}%` }} /></div></div>
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
                <div><p className="section-label">Authorized</p><p className="text-2xl font-semibold tracking-tight">{money(b.authorized)}</p><p className="text-xs text-muted">{money(b.base)} contract + {money(b.cr01)} CR-01</p></div>
                <Chips cites={[r({ src: "CONTRACT", quote: "Montant maximal initial" }), r({ src: "CR-01", quote: "APPROUVÉE" })]} />
              </div>
              <div className="budget-track" role="img" aria-label={`Paid ${money(b.paid)}, invoiced not paid ${money(b.invoicedValid - b.paid)}, remaining ${money(b.remaining)}`}>
                <div className="bg-brand" style={{ width: pct(b.paid) }} /><div className="bg-delivery/60" style={{ width: pct(b.invoicedValid - b.paid) }} /><div className="bg-line" style={{ width: pct(b.remaining) }} />
              </div>
              <ul className="budget-legend">
                <li><span className="legend-dot bg-brand" /><div>Paid<strong>{money(b.paid)}</strong></div></li>
                <li><span className="legend-dot bg-delivery/60" /><div>Invoiced, not paid<strong>{money(b.invoicedValid - b.paid)}</strong><small>INV-003 milestone 3</small></div></li>
                <li><span className="legend-dot bg-line" /><div>Remaining<strong>{money(b.remaining)}</strong></div></li>
              </ul>
              <div className="budget-exception"><Icon name="warning" size={16} /><span><strong>Not payable: {money(b.unapproved)}</strong> · Unapproved CR-04 on INV-003</span><Chips cites={[r({ src: "INV-003", quote: "Optimisation interface mobile - CR-04" })]} /></div>
            </div>
          </Panel>
        </div>
        <div className="space-y-5 min-w-0">
          <Panel className="context-rail">
            <SectionHeader title="Current decision"><Icon name="decisions" size={17} /></SectionHeader>
            <div className="p-5"><h3>Oct 22 · Conditional go-live</h3><p className="mt-2 text-[13px]">Approved by the steering committee on Sept 10 after Boréal&apos;s Sept 8 proposal. It is not a guaranteed go.</p><div className="mt-3"><Chips cites={[r({ src: "M04", quote: "Donc approuvé. Le 22 devient la date officielle" }), r({ src: "E09", quote: "Merci de ne pas communiquer le 22 comme un go garanti" })]} /></div></div>
            {proposals.length > 0 && <div className="proposal-snapshot"><Tag t="PROPOSAL" /><strong className="block mt-2 text-xs">New proposal on the table (not approved):</strong>{proposals.map((p, i) => <p key={i} className="mt-2 text-xs">{p.text} <span className="text-muted">({p.id})</span></p>)}</div>}
          </Panel>
          <Panel className="context-rail">
            <SectionHeader title="Next actions"><Link href="/actions" className="text-xs text-primary hover:underline">All actions →</Link></SectionHeader>
            <ul className="action-feed">{[...k.actions.slice(0, 6), ...ups.flatMap((u) => u.cs.newActions.map((a, i) => ({ ...a, id: `${u.cs.id}-A${i + 1}` })))].map((a) => <li key={a.id}><span className="feed-marker" /><div><p className="text-xs font-semibold">{a.title}</p><p className="mt-1 text-[10px] text-muted">{a.id} · {a.owner} ({a.ownerStatus}) · due {a.due}</p><span className="feed-type"><Tag t={a.type} /></span></div></li>)}</ul>
          </Panel>
          {ups.length > 0 && <Panel><SectionHeader title="Changes since the baseline" /><div className="divide-y divide-line">{ups.map((u) => <Link key={u.cs.id} href="/update" className="block p-4 text-xs hover:bg-canvas"><strong>{u.cs.id}</strong> · {u.cs.filename} · {u.cs.summary}</Link>)}</div></Panel>}
        </div>
      </div>
      <div className="watch-note mt-5"><Icon name="warning" /><p><strong>Watch item:</strong> the contract ends Oct 31, 2026, so any slip past Oct 22 eats the margin. Due dates for all three conditions are not documented (to be confirmed). <Chips cites={[r({ src: "CONTRACT", quote: "7 juillet au 31 octobre 2026" })]} /></p></div>
    </div>
  );
}
