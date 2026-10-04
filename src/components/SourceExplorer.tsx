"use client";
import { frenchText } from "@/lib/frenchContent";
import { frenchLabel } from "@/lib/locale";
import Link from "next/link";
import { Icon } from "./UI";
import { useMemo, useState } from "react";
import { fold, prettyLoc } from "@/lib/text";
import type { Segment, Source } from "@/lib/types";

const ROLE_STYLE: Record<string, string> = {
  CORE: "border-primary/40 text-primary",
  TRAP: "border-delivery/50 text-delivery",
  NOISE: "border-line text-muted",
  CONTEXT: "border-line text-ink",
};

export function SourceExplorer({
  sources,
  segments,
}: {
  sources: Source[];
  segments: Segment[];
}) {
  const [q, setQ] = useState("");
  const [showNoise, setShowNoise] = useState(false);
  const hits = useMemo(() => {
    const f = fold(q);
    if (f.length < 2) return [];
    return segments.filter((s) => fold(s.text).includes(f)).slice(0, 80);
  }, [q, segments]);
  const visible = sources.filter(
    (s) => !s.parent && (showNoise || s.role !== "NOISE"),
  );
  const folders = Array.from(
    new Set(visible.map((s) => s.path.split("/").slice(-2, -1)[0])),
  );
  const mark = (t: string) => {
    const i = fold(t).indexOf(fold(q));
    if (i < 0 || !q) return t;
    return (
      <>
        {t.slice(0, i)}
        <mark>{t.slice(i, i + q.length)}</mark>
        {t.slice(i + q.length)}
      </>
    );
  };
  return (
    <div className="space-y-6">
      <div className="source-toolbar">
        <Icon name="search" />
        <label htmlFor="search" className="sr-only">
          Rechercher dans toutes les sources
        </label>
        <input
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher dans les lignes, pages, cellules et captures (accents facultatifs)…"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm"
        />
        <label className="noise-toggle">
          <input
            type="checkbox"
            checked={showNoise}
            onChange={(e) => setShowNoise(e.target.checked)}
          />{" "}
          Afficher le bruit et les doublons
        </label>
      </div>
      {q.length >= 2 && (
        <section aria-live="polite" className="panel">
          <p className="border-b border-line p-3 text-sm text-muted">
            {hits.length} résultat(s)
            {hits.length === 80 ? " (80 premiers)" : ""}
          </p>
          <ul className="divide-y divide-line">
            {hits.map((h, i) => (
              <li key={i}>
                <Link
                  className="source-hit"
                  href={`/sources/${encodeURIComponent(h.src)}?loc=${encodeURIComponent(h.loc)}&q=${encodeURIComponent(q)}`}
                >
                  <span className="source-hit-locator">
                    {h.src} · {prettyLoc(h.loc)}
                  </span>
                  <span className="quote line-clamp-2 text-xs">
                    {mark(h.text)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {folders.map((f) => (
        <section key={f}>
          <h2 className="section-label mb-3">
            {frenchText(f.replace(/_/g, " "))}
          </h2>
          <ul className="panel repository-list">
            {visible
              .filter((s) => s.path.split("/").slice(-2, -1)[0] === f)
              .map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/sources/${encodeURIComponent(s.id)}`}
                    className="repository-row"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="repository-id">{s.id}</span>
                      <span
                        className={`rounded border px-1.5 text-[9px] font-medium ${ROLE_STYLE[s.role] ?? ""}`}
                      >
                        {frenchLabel(s.role)}
                      </span>
                      <span className="text-xs text-muted">
                        {frenchLabel(s.authority)} · {s.kind}
                      </span>
                      {s.duplicateOf && (
                        <span className="text-xs text-muted">
                          doublon de {s.duplicateOf}
                        </span>
                      )}
                      {s.version !== "baseline" && (
                        <span className="version-delta">{s.version}</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      <Icon name="file" size={14} />
                      {frenchText(s.title)}
                    </div>
                    {s.note && (
                      <div className="text-xs text-muted mt-1">
                        {frenchText(s.note)}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
