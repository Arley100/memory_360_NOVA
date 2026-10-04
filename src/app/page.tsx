import Link from "next/link";
import { Chips, Tag } from "@/components/Chip";
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
  const components = b.components ?? (b.base !== undefined ? [{ label: "initial contract", amount: b.base }, { label: "approved change request", amount: b.cr01 ?? 0 }] : []);

  return (
    <div className="space-y-10">
      {justPublished && (
        <div role="status" className="reveal flex flex-wrap items-center gap-3 rounded-lg border-2 border-marker bg-marker/20 p-4">
          <span className="memo-pop inline-flex h-8 w-8 items-center justify-center rounded-full bg-validation text-white">✓</span>
          <p className="flex-1">
            <strong>{justPublished.cs.id} published.</strong>{" "}
            {justPublished.cs.conditionChanges.length} condition change(s) · {justPublished.cs.revisedAnswers?.length ?? 0} answer(s) revised ·{" "}
            {justPublished.cs.revisedBrief?.length ?? 0} brief section(s) revised · {justPublished.cs.newProposals.length} new proposal(s). The baseline is unchanged.
          </p>
          <Link href="/questions" className="rounded-md border border-line bg-surface px-3 py-1 text-sm">Revised answers</Link>
          <Link href="/brief" className="rounded-md border border-line bg-surface px-3 py-1 text-sm">Current brief</Link>
        </div>
      )}
      <section aria-labelledby="status">
        <p className="text-muted">Where NOVA stands {ups.length ? `(current state, after ${ups.at(-1)!.cs.id})` : "at the baseline (Sept 30, 2026, 09:00)"}</p>
        <h1 id="status" className="mt-1 text-4xl font-bold leading-tight tracking-tight">
          Go-live {fmtDate(k.goLive.date)} is{" "}
          <span className="underline decoration-delivery decoration-4 underline-offset-4">{status}</span>.
          {conds.length > 0 && <><br />{met} of {conds.length} go-live conditions met.</>}
          {metBefore !== null && metBefore !== met && <span className="reveal ml-3 align-middle text-base font-semibold text-muted" style={{ animationDelay: "600ms" }}>(was {metBefore} before {changed})</span>}
        </h1>
        {k.goLive.headline && (
          <p className="mt-3 max-w-3xl text-lg">{k.goLive.headline} <Chips cites={(k.goLive.citations ?? []).map(r)} /></p>
        )}
        {proposals.length > 0 && (
          <div className="mt-4 rounded-md border border-proposal/40 bg-proposal/5 p-3">
            <Tag t="PROPOSAL" /> <strong>New proposal on the table (not approved):</strong>{" "}
            {proposals.map((p, i) => <span key={i}>{p.text} <span className="text-muted">({p.id})</span> </span>)}
          </div>
        )}
      </section>

      {conds.length > 0 && (
        <section aria-labelledby="conds" className="space-y-3">
          <h2 id="conds" className="text-2xl font-bold">The go-live conditions</h2>
          <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
            {conds.map((c) => (
              <li key={c.id} className={`grid gap-2 p-4 md:grid-cols-[2.5rem_1fr_auto] md:items-start ${changed && c.changedIn === changed ? "flash-marker" : ""}`}>
                <span className="text-2xl font-bold text-muted">{c.id}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{c.title}</h3>
                    {changed && c.changedIn === changed && statusBefore(c.id) && statusBefore(c.id) !== c.status && <><Tag t={statusBefore(c.id) === "met" ? "MET" : "OPEN"} /><span className="text-muted" aria-label="became">→</span></>}
                    <Tag t={c.status === "met" ? "MET" : "OPEN"} />
                    {c.changedIn && <span className="rounded bg-marker px-1.5 text-xs font-semibold">changed in {c.changedIn}</span>}
                  </div>
                  <p className="text-muted">Owner: {c.owner}</p>
                  <p className="mt-1">{c.changeText ?? c.state}</p>
                </div>
                <Chips cites={(c.changeCites ?? c.citations).map(r)} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="budget" className="space-y-3">
        <h2 id="budget" className="text-2xl font-bold">Budget and invoices <span className="text-base font-normal text-muted">(CAD, before tax)</span></h2>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span>
              Authorized <strong className="text-xl">{money(b.authorized)}</strong>
              {components.length > 0 && <> = {components.map((x, i) => <span key={i}>{i > 0 && " + "}{money(x.amount)} {x.label}</span>)}</>}
            </span>
            <Chips cites={components.flatMap((x) => ("citations" in x ? (x.citations ?? []) : []).slice(0, 1)).map(r)} />
          </div>
          <div className="mt-3 flex items-stretch gap-2">
            <div className="flex h-8 flex-1 overflow-hidden rounded border border-line" role="img"
              aria-label={`Paid ${money(b.paid)}, invoiced not paid ${money(b.invoicedValid - b.paid)}, remaining ${money(b.remaining)}`}>
              <div className="bg-validation" style={{ width: pct(b.paid) }} />
              <div className="bg-delivery/70" style={{ width: pct(b.invoicedValid - b.paid) }} />
              <div className="bg-canvas" style={{ width: pct(b.remaining) }} />
            </div>
            {b.unapproved > 0 && (
              <div className="flex h-8 min-w-24 items-center justify-center rounded border-2 border-dashed border-blocker px-2 text-xs font-bold text-blocker"
                title={b.unapprovedLabel || "Billed without approval"}>+{money(b.unapproved)} ✗</div>
            )}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <li><span className="mr-1 inline-block h-3 w-3 bg-validation align-middle" />Paid {money(b.paid)}</li>
            <li><span className="mr-1 inline-block h-3 w-3 bg-delivery/70 align-middle" />Invoiced, not paid {money(b.invoicedValid - b.paid)}</li>
            <li><span className="mr-1 inline-block h-3 w-3 border border-line bg-canvas align-middle" />Remaining {money(b.remaining)}</li>
            {b.unapproved > 0 && (
              <li className="font-semibold text-blocker">Not payable: {money(b.unapproved)}{b.unapprovedLabel ? ` · ${b.unapprovedLabel}` : ""} <Chips cites={(b.unapprovedCitations ?? []).slice(0, 2).map(r)} /></li>
            )}
          </ul>
        </div>
      </section>

      <section aria-labelledby="next" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="next" className="text-2xl font-bold">Next actions</h2>
          <Link href="/actions" className="text-primary underline">All actions</Link>
        </div>
        <ul className="space-y-2">
          {[...k.actions.slice(0, 6), ...ups.flatMap((u) => u.cs.newActions.map((a, i) => ({ ...a, id: `${u.cs.id}-A${i + 1}` })))].map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface p-3">
              <span className="font-mono text-sm text-muted">{a.id}</span>
              <span className="font-semibold">{a.title}</span>
              <span className="text-muted">· {a.owner} ({a.ownerStatus}) · due {a.due}</span>
              <Tag t={a.type} />
            </li>
          ))}
        </ul>
      </section>

      {ups.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-bold">Changes since the baseline</h2>
          {ups.map((u) => (
            <Link key={u.cs.id} href="/update" className="block rounded-md border border-line bg-surface p-3 hover:border-primary">
              <strong>{u.cs.id}</strong> · {u.cs.filename} · {u.cs.summary}
            </Link>
          ))}
        </section>
      )}

      {(k.goLive.contractEndNote || k.goLive.contractEnd) && (
        <p className="rounded-md border border-line bg-surface p-3 text-sm">
          <strong>Watch:</strong> {k.goLive.contractEndNote ?? `The contract ends ${fmtDate(k.goLive.contractEnd)}.`}{" "}
          <Chips cites={(k.goLive.contractEndCitations ?? []).map(r)} />
        </p>
      )}
    </div>
  );
}
