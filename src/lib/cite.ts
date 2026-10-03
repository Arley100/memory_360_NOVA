import { norm, prettyLoc } from "./text";
import type { Cite, ResolvedCite, Segment } from "./types";

function inRange(loc: string, range: string): boolean {
  const m = /^L(\d+)-L(\d+)$/.exec(range);
  const l = /^L(\d+)$/.exec(loc);
  if (!m || !l) return loc === range;
  const n = +l[1];
  return n >= +m[1] && n <= +m[2];
}

// Resolve a citation to the exact segment that contains its quote.
// A citation is "verified" only if the quote really appears in the cited source.
export function resolveCite(c: Cite, bySrc: Map<string, Segment[]>): ResolvedCite {
  const segs = bySrc.get(c.src) ?? [];
  const q = norm(c.quote);
  const pool = c.loc ? segs.filter((s) => s.loc === c.loc || inRange(s.loc, c.loc!)) : segs;
  const hit = pool.find((s) => norm(s.text).includes(q));
  const loc = hit?.loc ?? c.loc ?? "";
  return { ...c, loc, label: `${c.src}${loc ? " · " + prettyLoc(loc) : ""}`, verified: Boolean(hit) };
}

export function indexSegments(segments: Segment[]): Map<string, Segment[]> {
  const m = new Map<string, Segment[]>();
  for (const s of segments) {
    if (!m.has(s.src)) m.set(s.src, []);
    m.get(s.src)!.push(s);
  }
  return m;
}
