import { norm, prettyLoc } from "./text";
import type { Cite, ResolvedCite, Segment } from "./types";

function inRange(loc: string, range: string): boolean {
  const m = /^L(\d+)-L(\d+)$/.exec(range);
  const l = /^L(\d+)$/.exec(loc);
  if (!m || !l) return loc === range;
  const n = +l[1];
  return n >= +m[1] && n <= +m[2];
}

// Tolerate how models format source ids: "M04#L23", "[[M04#L23]]", "M04.txt", "m04", "M04 · L23".
function candidateIds(raw: string, known: Map<string, Segment[]>): { ids: string[]; locHint?: string } {
  const s = raw.trim().replace(/^\[\[|\]\]$/g, "").trim();
  const [base, hint] = s.split("#");
  const cleaned = base.replace(/\s*[·|].*$/, "").trim();
  const noExt = cleaned.replace(/\.(txt|md|eml|pdf|xlsx|csv|docx)$/i, "");
  const ids = [s, base, cleaned, noExt].filter(Boolean);
  const lower = new Map(Array.from(known.keys()).map((k) => [k.toLowerCase(), k]));
  const resolved = ids.map((i) => (known.has(i) ? i : lower.get(i.toLowerCase()))).filter((x): x is string => Boolean(x));
  return { ids: Array.from(new Set(resolved)), locHint: hint?.trim() };
}

// Quote parts: strip surrounding quote marks and split on ellipses ("a … b" must match a and b).
function quoteParts(quote: string): string[] {
  const q = quote.trim().replace(/^["'«“\s]+|["'»”\s]+$/g, "");
  return q.split(/…|\.\.\./).map((p) => norm(p).replace(/^[.,;:!? ]+|[.,;:!? ]+$/g, "")).filter((p) => p.length >= 3);
}

function findIn(segs: Segment[], parts: string[]): Segment | undefined {
  if (!parts.length) return undefined;
  // 1. all parts inside one segment
  const one = segs.find((s) => { const t = norm(s.text); return parts.every((p) => t.includes(p)); });
  if (one) return one;
  // 2. quote spanning consecutive segments (e.g. a sentence over two lines)
  const joined = segs.map((s) => norm(s.text)).join(" ");
  if (parts.every((p) => joined.includes(p))) return segs.find((s) => norm(s.text).includes(parts[0].slice(0, 25))) ?? segs[0];
  return undefined;
}

// Resolve a citation to the exact segment that contains its quote.
// "verified" means the quoted words really appear in a corpus file; formatting differences are tolerated,
// different words are not. If the model names the wrong file but the quote exists elsewhere, the citation
// is re-pointed to where the quote actually is.
export function resolveCite(c: Cite, bySrc: Map<string, Segment[]>): ResolvedCite {
  const parts = quoteParts(c.quote);
  const { ids, locHint } = candidateIds(c.src, bySrc);
  const wantLoc = c.loc ?? locHint;
  for (const id of ids) {
    const segs = bySrc.get(id) ?? [];
    const pool = wantLoc ? segs.filter((s) => s.loc === wantLoc || inRange(s.loc, wantLoc)) : [];
    const hit = findIn(pool, parts) ?? findIn(segs, parts);
    if (hit) return { ...c, src: id, loc: hit.loc, label: `${id} · ${prettyLoc(hit.loc)}`, verified: true };
  }
  // Re-point only distinctive quotes (>= 30 characters and >= 5 words). A short quote such as "APPROUVÉE"
  // attributed to the wrong file must be rejected, not matched to some unrelated sentence elsewhere.
  const joinedQuote = parts.join(" ");
  if (joinedQuote.length >= 30 && joinedQuote.split(" ").length >= 5) {
    for (const [id, segs] of bySrc) {
      const hit = segs.find((s) => { const t = norm(s.text); return parts.every((p) => t.includes(p)); });
      if (hit) return { ...c, src: id, loc: hit.loc, label: `${id} · ${prettyLoc(hit.loc)}`, verified: true };
    }
  }
  const src = ids[0] ?? c.src;
  return { ...c, src, loc: wantLoc ?? "", label: `${src}${wantLoc ? " · " + prettyLoc(wantLoc) : ""}`, verified: false };
}

export function indexSegments(segments: Segment[]): Map<string, Segment[]> {
  const m = new Map<string, Segment[]>();
  for (const s of segments) {
    if (!m.has(s.src)) m.set(s.src, []);
    m.get(s.src)!.push(s);
  }
  return m;
}
