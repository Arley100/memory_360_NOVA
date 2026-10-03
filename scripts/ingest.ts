// Build the baseline index: data/registry.json + data/segments.json, then verify every KB citation.
// Run: npm run ingest   (deterministic; no LLM needed: screenshots use data/vision/transcriptions.json)
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { parseFile, kindOf, type Transcription } from "../src/lib/ingest";
import { indexSegments, resolveCite } from "../src/lib/cite";
import type { Cite, Segment, Source } from "../src/lib/types";

const ROOT = process.cwd();
const CORPUS = path.join(ROOT, "corpus", "Projet360_NOVA_ETUDIANTS");
const meta: Record<string, { id: string; title: string; authority: string; role: string; contentDate: string; note: string }> =
  JSON.parse(fs.readFileSync(path.join(ROOT, "data/registry.meta.json"), "utf8"));
const vision: Record<string, Transcription> = JSON.parse(fs.readFileSync(path.join(ROOT, "data/vision/transcriptions.json"), "utf8"));

const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
const posix = (p: string) => p.split(path.sep).join("/");

async function main() {
  const files = walk(CORPUS).sort();
  const hashToId = new Map<string, string>();
  const entries = files.map((f) => {
    const key = posix(path.relative(path.join(ROOT, "corpus"), f));
    const m = meta[key];
    if (!m) throw new Error(`No registry metadata for ${key}`);
    const buf = fs.readFileSync(f);
    const h = sha(buf);
    if (!hashToId.has(h)) hashToId.set(h, m.id);
    return { f, key, m, buf, h };
  });

  const sources: Source[] = [];
  const segments: Segment[] = [];
  for (const { f, key, m, buf, h } of entries) {
    const parsed = await parseFile(buf, path.basename(f), { transcription: vision[key] ?? null });
    const dupOf = hashToId.get(h) !== m.id ? hashToId.get(h) : undefined;
    sources.push({
      id: m.id, path: posix(path.relative(ROOT, f)), kind: kindOf(f), title: m.title, authority: m.authority,
      role: m.role, contentDate: m.contentDate || parsed.contentDate, note: m.note, sha256: h, duplicateOf: dupOf, version: "baseline",
    });
    parsed.segments.forEach((s) => segments.push({ src: m.id, ...s }));
    for (const a of parsed.attachments) {
      const ah = sha(a.content);
      const orig = hashToId.get(ah);
      sources.push({
        id: `${m.id}>${a.filename}`, path: posix(path.relative(ROOT, f)) + `#att:${a.filename}`, kind: kindOf(a.filename),
        title: `Attachment ${a.filename} (in ${m.id})`, authority: m.authority, role: orig ? "NOISE" : m.role,
        sha256: ah, duplicateOf: orig, parent: m.id, version: "baseline", note: orig ? `Identical to ${orig}` : undefined,
      });
    }
  }
  fs.writeFileSync(path.join(ROOT, "data/registry.json"), JSON.stringify(sources, null, 1));
  fs.writeFileSync(path.join(ROOT, "data/segments.json"), JSON.stringify(segments, null, 1));
  console.log(`Indexed ${files.length} files → ${sources.length} sources, ${segments.length} segments.`);
  const dups = sources.filter((s) => s.duplicateOf).map((s) => `${s.id} = ${s.duplicateOf}`);
  console.log(`Duplicates (${dups.length}): ${dups.join("; ")}`);

  // Verify all KB citations against the corpus.
  const kb = JSON.parse(fs.readFileSync(path.join(ROOT, "data/baseline/kb.json"), "utf8"));
  const idx = indexSegments(segments);
  const all: { where: string; c: Cite }[] = [];
  const add = (where: string, cs: Cite[] = []) => cs.forEach((c) => all.push({ where, c }));
  kb.answers.forEach((a: { id: string; citations: Cite[] }) => add(a.id, a.citations));
  kb.conditions.forEach((x: { id: number; citations: Cite[] }) => add(`condition ${x.id}`, x.citations));
  kb.actions.forEach((x: { id: string; citations: Cite[] }) => add(x.id, x.citations));
  kb.contradictions.forEach((x: { id: string; aCit: Cite[]; bCit: Cite[] }) => { add(x.id, x.aCit); add(x.id, x.bCit); });
  kb.timeline.forEach((x: { date: string; citations: Cite[] }) => add(`timeline ${x.date}`, x.citations));
  kb.brief.sections.forEach((x: { theme: string; citations: Cite[] }) => add(`brief ${x.theme}`, x.citations));
  const bad = all.filter(({ c }) => !resolveCite(c, idx).verified);
  bad.forEach(({ where, c }) => console.log(`  ✗ ${where}: [${c.src}] "${c.quote}"`));
  console.log(`Citations verified: ${all.length - bad.length}/${all.length}`);
  if (bad.length) process.exitCode = 1;
}
main();
