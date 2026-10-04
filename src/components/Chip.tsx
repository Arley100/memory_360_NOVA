"use client";
import Link from "next/link";
import { Icon } from "./UI";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResolvedCite } from "@/lib/types";

type Preview = {
  verified: boolean; title: string; kind: string; authority: string; contentDate?: string; path: string; duplicateOf: string | null;
  before: { loc: string; text: string } | null; at: { loc: string; text: string } | null; after: { loc: string; text: string } | null;
};
async function load(src: string, loc: string, quote: string): Promise<Preview | null> {
  return fetch(`/api/segment?src=${encodeURIComponent(src)}&loc=${encodeURIComponent(loc)}&quote=${encodeURIComponent(quote)}`, { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null);
}

function Highlight({ text, quote }: { text: string; quote: string }) {
  const t = text.replace(/\u2019/g, "'"), q = quote.replace(/\u2019/g, "'").replace(/^["«\s]+|["»\s]+$/g, "").split(/…|\.\.\./)[0].trim();
  const i = q ? t.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

const IMG = ["png", "jpg", "webp", "gif"];

// Evidence chip: every claim links to the exact place in the source. Hover or focus shows the passage itself.
export function Chip({ c }: { c: ResolvedCite }) {
  const href = `/sources/${encodeURIComponent(c.src)}?loc=${encodeURIComponent(c.loc)}&q=${encodeURIComponent(c.quote)}`;
  const id = useId();
  const ref = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<Preview | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);

  function show(delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(440, window.innerWidth - 16);
      const above = r.bottom + 260 > window.innerHeight && r.top > 280;
      setPos({ top: above ? r.top - 8 : r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), above });
      setOpen(true); setLoaded(false);
      setData(await load(c.src, c.loc, c.quote)); setLoaded(true);
    }, delay);
  }
  function hide() { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 120); }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => setOpen(false);
    window.addEventListener("keydown", onKey); window.addEventListener("scroll", onScroll, true);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll, true); };
  }, [open]);

  return (
    <>
      <Link ref={ref} href={href} aria-describedby={open ? id : undefined}
        onMouseEnter={() => show(220)} onMouseLeave={hide} onFocus={() => show(0)} onBlur={hide}
        className={`evidence-chip ${c.verified ? "text-primary border-primary/30" : "text-blocker border-blocker/30"}`}>
        <Icon name="file" size={12} />
        {c.label}
      </Link>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div id={id} role="tooltip"
          className="peek pointer-events-none fixed z-50 w-[min(440px,calc(100vw-16px))] rounded-lg border border-line bg-surface p-3 text-left shadow-xl"
          style={{ top: pos.top, left: pos.left, transform: pos.above ? "translateY(-100%)" : undefined }}>
          {!data ? <p className="text-sm text-muted">{loaded ? "Source preview unavailable. Open the source to inspect it." : "Opening the source"}…</p> : (
            <>
              <p className="text-sm font-semibold leading-tight">{data.title}</p>
              <p className="text-xs text-muted">{c.label} · {data.authority.toLowerCase().replace("_", " ")}{data.contentDate ? ` · ${data.contentDate}` : ""}</p>
              {IMG.includes(data.kind) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/raw?path=${encodeURIComponent(data.path)}`} alt="" className="mt-2 max-h-32 rounded border border-line" />
              )}
              <div className="quote mt-2 space-y-1 text-sm leading-snug">
                {data.before && <p className="line-clamp-2 text-muted">{data.before.text}</p>}
                {data.at && <p className="rounded bg-marker/25 px-1"><Highlight text={data.at.text} quote={c.quote} /></p>}
                {data.after && <p className="line-clamp-2 text-muted">{data.after.text}</p>}
              </div>
              <p className={`mt-2 text-xs font-semibold ${data.verified ? "text-validation" : "text-blocker"}`}>
                {data.verified ? "✓ Quote found word for word in this file" : "✗ Quote not found in this file"} · click the chip to open the full source
              </p>
              {data.duplicateOf && <p className="text-xs text-muted">Identical copy of {data.duplicateOf}: not an independent confirmation.</p>}
            </>
          )}
        </div>, document.body)}
    </>
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
