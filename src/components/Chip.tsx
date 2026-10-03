import Link from "next/link";
import { Icon } from "./UI";
import type { ResolvedCite } from "@/lib/types";

// Evidence chip: every claim links to the exact place in the source.
export function Chip({ c }: { c: ResolvedCite }) {
  const href = `/sources/${encodeURIComponent(c.src)}?loc=${encodeURIComponent(c.loc)}&q=${encodeURIComponent(c.quote)}`;
  return (
    <Link
      href={href}
      title={`« ${c.quote} »${c.verified ? "" : " (not verified)"}`}
      className={`evidence-chip ${
        c.verified ? "border-primary/40 text-primary bg-primary/5" : "border-blocker/50 text-blocker bg-blocker/5"
      }`}
    >
      <Icon name="file" size={12} />{c.label}
    </Link>
  );
}

export function Chips({ cites }: { cites: ResolvedCite[] }) {
  return <span className="inline-flex flex-wrap gap-1.5 align-middle">{cites.map((c, i) => <Chip key={i} c={c} />)}</span>;
}

const TAGS: Record<string, string> = {
  PROPOSAL: "bg-proposal/10 text-proposal border-proposal/40",
  DECISION: "bg-primary/10 text-primary border-primary/40",
  DELIVERY: "bg-delivery/10 text-delivery border-delivery/40",
  VALIDATION: "bg-validation/10 text-validation border-validation/40",
  ISSUE: "bg-blocker/10 text-blocker border-blocker/40",
  OPEN: "bg-blocker/10 text-blocker border-blocker/40",
  MET: "bg-validation/10 text-validation border-validation/40",
  TBC: "bg-white text-muted border-muted border-dashed",
};
const LABELS: Record<string, string> = {
  PROPOSAL: "Proposal", DECISION: "Decision", DELIVERY: "Delivery (vendor says done)", VALIDATION: "Validation",
  ISSUE: "Issue", FINANCE: "Finance", ORG: "Organization", REPORT: "Report", STATUS: "Status", OPEN: "Open", MET: "Met", TBC: "To be confirmed",
  COMMITMENT: "Documented commitment", RECOMMENDATION: "Our recommendation",
};

export function Tag({ t }: { t: string }) {
  return (
    <span className={`semantic-tag ${TAGS[t] ?? "bg-canvas text-muted border-line"}`}>
      {LABELS[t] ?? t}
    </span>
  );
}
