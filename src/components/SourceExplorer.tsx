"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fold, prettyLoc } from "@/lib/text";
import type { Segment, Source } from "@/lib/types";

const ROLE_STYLE: Record<string, string> = {
  CORE: "border-primary/40 text-primary", TRAP: "border-delivery/50 text-delivery", NOISE: "border-line text-muted", CONTEXT: "border-line text-ink",
};

export function SourceExplorer({ sources, segments }: { sources: Source[]; segments: Segment[] }) {
  const [q, setQ] = useState("");
  const [showNoise, setShowNoise] = useState(false);
  const hits = useMemo(() => {
    const f = fold(q);
    if (f.length < 2) return [];
    return segments.filter((s) => fold(s.text).includes(f)).slice(0, 80);
  }, [q, segments]);
  const visible = sources.filter((s) => !s.parent && (showNoise || s.role !== "NOISE"));
  const folders = Array.from(new Set(visible.map((s) => s.path.split("/").slice(-2, -1)[0])));
  const mark = (t: string) => {
    const i = fold(t).indexOf(fold(q));
    if (i < 0 || !q) return t;
    return <>{t.slice(0, i)}<mark>{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>;
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="search" className="sr-only">Search all sources</label>
        <input id="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search every line, page, cell and screenshot (accents optional)…"
          className="min-w-[320px] flex-1 rounded-md border border-line bg-surface px-3 py-2" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showNoise} onChange={(e) => setShowNoise(e.target.checked)} /> Show noise and duplicates</label>
      </div>
      {q.length >= 2 && (
        <section aria-live="polite" className="rounded-lg border border-line bg-surface">
          <p className="border-b border-line p-3 text-sm text-muted">{hits.length} match(es){hits.length === 80 ? " (first 80)" : ""}</p>
          <ul className="divide-y divide-line">
            {hits.map((h, i) => (
              <li key={i}>
                <Link className="flex gap-3 p-3 hover:bg-marker/30" href={`/sources/${encodeURIComponent(h.src)}?loc=${encodeURIComponent(h.loc)}&q=${encodeURIComponent(q)}`}>
                  <span className="w-44 shrink-0 text-sm font-semibold text-primary">{h.src} · {prettyLoc(h.loc)}</span>
                  <span className="quote line-clamp-2">{mark(h.text)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {folders.map((f) => (
        <section key={f}>
          <h2 className="mb-2 text-lg font-bold">{f.replace(/_/g, " ")}</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {visible.filter((s) => s.path.split("/").slice(-2, -1)[0] === f).map((s) => (
              <li key={s.id}>
                <Link href={`/sources/${encodeURIComponent(s.id)}`} className="block rounded-md border border-line bg-surface p-3 hover:border-primary">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{s.id}</span>
                    <span className={`rounded border px-1.5 text-xs font-semibold ${ROLE_STYLE[s.role] ?? ""}`}>{s.role.toLowerCase()}</span>
                    <span className="text-xs text-muted">{s.authority.toLowerCase().replace("_", " ")} · {s.kind}</span>
                    {s.duplicateOf && <span className="text-xs text-muted">duplicate of {s.duplicateOf}</span>}
                    {s.version !== "baseline" && <span className="rounded bg-marker px-1.5 text-xs font-semibold">{s.version}</span>}
                  </div>
                  <div className="mt-1">{s.title}</div>
                  {s.note && <div className="text-sm text-muted">{s.note}</div>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
