import Link from "next/link";
import { Chips, Tag } from "@/components/Chip";
import { currentConditions, kb, resolver, updates } from "@/lib/store";
import { money } from "@/lib/text";

export default function Overview() {
  const k = kb();
  const r = resolver();
  const conds = currentConditions();
  const met = conds.filter((c) => c.status === "met").length;
  const ups = updates();
  const b = k.budget;
  const pct = (n: number) => `${(n / b.authorized) * 100}%`;
  const proposals = ups.flatMap((u) => u.cs.newProposals.map((p) => ({ ...p, id: u.cs.id })));

  return (
    <div className="space-y-10">
      <section aria-labelledby="status">
        <p className="text-muted">Where NOVA stands {ups.length ? `(current state, after ${ups.at(-1)!.cs.id})` : "on Sept 30, 2026, 09:00"}</p>
        <h1 id="status" className="mt-1 text-4xl font-bold leading-tight tracking-tight">
          Go-live Oct 22, 2026 is <span className="underline decoration-delivery decoration-4 underline-offset-4">conditional</span>.
          <br />{met} of 3 go-live conditions met.
        </h1>
        <p className="mt-3 max-w-3xl text-lg">
          Approved by the steering committee on Sept 10 after Boréal&apos;s Sept 8 proposal. It is not a guaranteed go.{" "}
          <Chips cites={[r({ src: "M04", quote: "Donc approuvé. Le 22 devient la date officielle" }), r({ src: "E09", quote: "Merci de ne pas communiquer le 22 comme un go garanti" })]} />
        </p>
        {proposals.length > 0 && (
          <div className="mt-4 rounded-md border border-proposal/40 bg-proposal/5 p-3">
            <Tag t="PROPOSAL" /> <strong>New proposal on the table (not approved):</strong>{" "}
            {proposals.map((p, i) => <span key={i}>{p.text} <span className="text-muted">({p.id})</span> </span>)}
          </div>
        )}
      </section>

      <section aria-labelledby="conds" className="space-y-3">
        <h2 id="conds" className="text-2xl font-bold">The three go-live conditions</h2>
        <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
          {conds.map((c) => (
            <li key={c.id} className="grid gap-2 p-4 md:grid-cols-[2.5rem_1fr_auto] md:items-start">
              <span className="text-2xl font-bold text-muted">{c.id}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{c.title}</h3>
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

      <section aria-labelledby="budget" className="space-y-3">
        <h2 id="budget" className="text-2xl font-bold">Budget and invoices <span className="text-base font-normal text-muted">(CAD, before tax)</span></h2>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span>Authorized <strong className="text-xl">{money(b.authorized)}</strong> = {money(b.base)} contract + {money(b.cr01)} CR-01</span>
            <Chips cites={[r({ src: "CONTRACT", quote: "Montant maximal initial" }), r({ src: "CR-01", quote: "APPROUVÉE" })]} />
          </div>
          <div className="mt-3 flex items-stretch gap-2">
            <div className="flex h-8 flex-1 overflow-hidden rounded border border-line" role="img"
              aria-label={`Paid ${money(b.paid)}, invoiced not paid ${money(b.invoicedValid - b.paid)}, remaining ${money(b.remaining)}`}>
              <div className="bg-validation" style={{ width: pct(b.paid) }} />
              <div className="bg-delivery/70" style={{ width: pct(b.invoicedValid - b.paid) }} />
              <div className="bg-canvas" style={{ width: pct(b.remaining) }} />
            </div>
            <div className="flex h-8 w-24 items-center justify-center rounded border-2 border-dashed border-blocker text-xs font-bold text-blocker"
              title="CR-04 line on INV-003, not approved">+18 000 $ ✗</div>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <li><span className="mr-1 inline-block h-3 w-3 bg-validation align-middle" />Paid {money(b.paid)}</li>
            <li><span className="mr-1 inline-block h-3 w-3 bg-delivery/70 align-middle" />Invoiced, not paid {money(b.invoicedValid - b.paid)} (INV-003 milestone 3)</li>
            <li><span className="mr-1 inline-block h-3 w-3 border border-line bg-canvas align-middle" />Remaining {money(b.remaining)}</li>
            <li className="text-blocker font-semibold">Not payable: {money(b.unapproved)} CR-04 on INV-003 <Chips cites={[r({ src: "INV-003", quote: "Optimisation interface mobile - CR-04" })]} /></li>
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

      <p className="rounded-md border border-line bg-surface p-3 text-sm">
        <strong>Watch:</strong> the contract ends Oct 31, 2026, so any slip past Oct 22 eats the margin. Due dates for all three conditions are not documented (to be confirmed).{" "}
        <Chips cites={[r({ src: "CONTRACT", quote: "7 juillet au 31 octobre 2026" })]} />
      </p>
    </div>
  );
}
