import fs from "fs";
import path from "path";
import { ROOT, updates } from "@/lib/store";
import { kindOf } from "@/lib/ingest";
import { indexSegments, resolveCite } from "@/lib/cite";
import { allSegments } from "@/lib/store";
import type { ChangeSet, Cite, Segment, Source } from "@/lib/types";

// Publishing creates data/updates/U00n/. The baseline (data/baseline, data/registry.json, data/segments.json) is never touched.
export async function POST(req: Request) {
  const { draftId, changeset } = (await req.json()) as { draftId: string; changeset: ChangeSet };
  const pending = path.join(ROOT, "data", "updates", "_pending", draftId.replace(/[^\w-]/g, ""));
  if (!fs.existsSync(pending)) return Response.json({ error: "Draft not found" }, { status: 404 });
  const draft = JSON.parse(fs.readFileSync(path.join(pending, "draft.json"), "utf8")) as { filename: string; contentDate?: string; segments: Segment[] };
  const id = `U${String(updates().length + 1).padStart(3, "0")}`;
  const srcId = `${id}-S1`;
  const dir = path.join(ROOT, "data", "updates", id);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(pending, draft.filename), path.join(dir, draft.filename));
  const rename = (s: string) => s.replace(/^NEW/, srcId);
  const relPath = `data/updates/${id}/${draft.filename}`;
  const subIds = Array.from(new Set(draft.segments.map((s) => s.src)));
  const sources: Source[] = subIds.map((sid) => ({
    id: rename(sid), path: sid === "NEW" ? relPath : `${relPath}#att:${sid.split(">")[1]}`, kind: kindOf(sid === "NEW" ? draft.filename : sid),
    title: sid === "NEW" ? `New information: ${draft.filename}` : `Attachment ${sid.split(">")[1]}`, authority: "NEW", role: "CORE",
    contentDate: draft.contentDate, sha256: "", version: id, parent: sid === "NEW" ? undefined : srcId,
  }));
  const segments = draft.segments.map((s) => ({ ...s, src: rename(s.src) }));
  const cs: ChangeSet = JSON.parse(JSON.stringify(changeset).replace(/"src":"NEW/g, `"src":"${srcId}`));
  // Fill exact locators for every citation (new file + baseline).
  const idx = indexSegments([...allSegments(), ...segments]);
  const fix = (cites: Cite[] = []) => cites.map((c) => ({ ...c, loc: resolveCite(c, idx).loc || c.loc }));
  for (const k of ["problemStatus", "priorDecisions", "newProposals", "newDecisions"] as const) cs[k] = cs[k].map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.conditionChanges = cs.conditionChanges.map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.newActions = cs.newActions.map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.id = id; cs.publishedAt = new Date().toISOString(); cs.filename = draft.filename;
  fs.writeFileSync(path.join(dir, "changeset.json"), JSON.stringify(cs, null, 1));
  fs.writeFileSync(path.join(dir, "sources.json"), JSON.stringify(sources, null, 1));
  fs.writeFileSync(path.join(dir, "segments.json"), JSON.stringify(segments, null, 1));
  fs.rmSync(pending, { recursive: true, force: true });
  return Response.json({ ok: true, id });
}
