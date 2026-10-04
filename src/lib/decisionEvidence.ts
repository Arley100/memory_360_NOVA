import { resolveCite } from "./cite";
import type { Cite, ResolvedCite, Segment } from "./types";

// Only resolve evidence assigned to this stage, inside its named source.
// A bare source ID cannot identify a passage or prove a lifecycle stage.
export function resolveDecisionEvidence(citations: Cite[] = [], bySrc: Map<string, Segment[]>): ResolvedCite[] {
  const resolved: ResolvedCite[] = [];
  for (const citation of citations) {
    const segments = bySrc.get(citation.src);
    if (!segments) continue;
    const segment = citation.loc ? segments.find((s) => s.loc === citation.loc) : undefined;
    const quote = citation.quote.trim() ? citation.quote : segment?.text;
    if (!quote) continue;
    if (!citation.loc) {
      const matches = segments.filter((s) => resolveCite({ ...citation, quote }, new Map([[citation.src, [s]]])).verified);
      if (matches.length !== 1) continue;
    }
    const cite = resolveCite({ ...citation, quote }, new Map([[citation.src, segments]]));
    if (!cite.verified || !segments.some((s) => s.loc === cite.loc)) continue;
    if (!resolved.some((c) => c.src === cite.src && c.loc === cite.loc && c.quote === cite.quote)) resolved.push(cite);
  }
  return resolved;
}
