import { Chips } from "@/components/Chip";
import { Icon, PageHeader } from "@/components/UI";
import { allSegments, allSources, baselineSegments, baselineSources, curatedKB, currentConditions, getKB, resolver, updates } from "@/lib/store";
import { deriveRisks, type RiskStatus } from "@/lib/risks";
import { fmtDateTime, fmtDay } from "@/lib/text";

function Status({ status }: { status: RiskStatus }) {
  return <span className="semantic-tag bg-canvas text-ink border-line"><Icon name={status === "Current" || status === "Uncertain" ? "warning" : "check"} size={12} />{status}</span>;
}

export default async function Risks() {
  const ups = await updates();
  const [kb, conditions, sources, segments, resolve] = await Promise.all([getKB(), currentConditions(ups), allSources(ups), allSegments(ups), resolver([], ups)]);
  const risks = deriveRisks(kb, conditions, sources, segments, resolve);
  const baseline = curatedKB();
  const baselineResolve = await resolver([], []);
  const original = deriveRisks(baseline, baseline.conditions, baselineSources(), baselineSegments(), baselineResolve);
  const priorities = risks.filter((r) => r.status === "Current");
  return (
    <div className="space-y-6">
      <PageHeader title="Risks / Risques" subtitle="A register entry is not automatically current truth. Operational validation and the date of the facts determine the current interpretation." />
      <p className="text-xs text-muted">Evidence as of {ups.at(-1)?.cs.publishedAt ? fmtDateTime(ups.at(-1)!.cs.publishedAt) : fmtDateTime(kb.asOf)} · {ups.length ? `Current state after ${ups.at(-1)!.cs.id}` : "Original project baseline"}</p>
      <section className="panel">
        <div className="section-header"><h2>Current priority risks</h2><span className="text-xs text-muted">{priorities.length} supported by current evidence</span></div>
        <p className="px-5 py-3 text-xs text-muted">Shown in register order. Probability and impact are register values; no numerical ranking is inferred. Resolved, closed and uncertain entries are excluded.</p>
        {priorities.length ? <div className="overflow-x-auto"><table className="data-table">
          <thead><tr>{["Risk", "Probability / impact", "Current interpretation", "Evidence"].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{priorities.map((risk) => <tr key={risk.id}>
            <td><a href={`#risk-${risk.id}`} className="font-semibold text-primary">{risk.id} · {risk.title}</a><div className="mt-2"><Status status={risk.status} /></div></td>
            <td className="whitespace-nowrap">{risk.probability} / {risk.impact}</td>
            <td className="min-w-60">{risk.interpretation}</td>
            <td><Chips cites={[...risk.ratingCites, ...risk.evidence]} /></td>
          </tr>)}</tbody>
        </table></div> : <p className="p-5 text-sm">No current priority risks are supported by linked, verified evidence. Review the registered entries below.</p>}
      </section>
      <section className="panel">
        <div className="section-header"><h2>All registered risks</h2><span className="text-xs text-muted">{risks.length} entries · expand for exact evidence</span></div>
        {!risks.length && <p className="p-5 text-sm">No structured risk register was found in the project corpus.</p>}
        <div className="divide-y divide-line">{risks.map((risk) => {
          const before = original.find((r) => r.id === risk.id);
          return <details key={risk.id} id={`risk-${risk.id}`} className="risk-entry scroll-mt-5">
            <summary className="risk-summary cursor-pointer px-5 py-4 focus-visible:outline-2 focus-visible:outline-primary">
              <span className="font-semibold">{risk.id} · {risk.title}</span>
              <span className="text-xs text-muted">Register: {risk.registerStatus} · {risk.probability} / {risk.impact}</span>
              <Status status={risk.status} />
            </summary>
            <div className="space-y-4 border-t border-line bg-canvas/40 p-5 text-sm">
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs"><span><strong>Documented owner:</strong> {risk.owner}</span><span><strong>Register date:</strong> {fmtDay(risk.registerDate)}</span>{risk.changedIn && <span><strong>Published change:</strong> {risk.changedIn}</span>}</div>
              <div><p className="section-label mb-2">Register evidence</p><p className="mb-2">{risk.mitigation}{risk.followUp && ` · ${risk.followUp}`}</p><Chips cites={risk.registerCites} /></div>
              <div><p className="section-label mb-2">Current interpretation</p>
                {risk.stale && <span className="semantic-tag mb-2 border-line bg-surface text-muted"><Icon name="warning" size={12} />Register is stale</span>}
                <p className="mb-2">{risk.interpretation}</p>
                {risk.stale && <p className="mb-2 text-muted">The {fmtDay(risk.registerDate)} register still shows “{risk.registerStatus}”, but authoritative operational evidence supersedes that entry. Compare the date of the underlying facts, rather than the file date.</p>}
                <Chips cites={risk.evidence} />
              </div>
              {ups.length > 0 && before && <div className="border-t border-line pt-3"><p className="section-label mb-2">Baseline → current</p><p className="mb-2">{before.status} → {risk.status}</p><p className="mb-2 text-muted">Baseline: {before.interpretation}</p><Chips cites={before.evidence} /></div>}
            </div>
          </details>;
        })}</div>
      </section>
    </div>
  );
}
