// Reads the questions to answer from the corpus's own README (lines such as "Q01. ..."), so nothing is hardcoded.
import type { Segment, Source } from "./types";

export function readmeQuestions(sources: Source[], segments: Segment[]): { id: string; fr: string }[] {
  const readme = sources.find((s) => /(^|\/)readme\.(txt|md)$/i.test(s.path.split("#")[0]));
  if (!readme) return [];
  return segments
    .filter((s) => s.src === readme.id)
    .map((s) => /^\s*Q(\d{1,2})[.)]\s+(.+)$/.exec(s.text))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ id: `Q${m[1].padStart(2, "0")}`, fr: m[2].trim() }));
}
