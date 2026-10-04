import { guard } from "@/lib/access";
import { indexSegments, resolveCite } from "@/lib/cite";
import { allSegments, allSources, updates } from "@/lib/store";
import { updateStore } from "@/lib/updateStore";
import { publishedSources } from "@/lib/updateSources";
import type { ChangeSet, Cite, Source } from "@/lib/types";

// Publishing creates update U00n in the update store. The baseline is never touched.
export async function POST(req: Request) {
  const denied = guard(req, "write");
  if (denied) return denied;
  const { draftId, changeset } = (await req.json()) as { draftId: string; changeset: ChangeSet };
  const store = updateStore();
  const loaded = await store.loadDraft(String(draftId).replace(/[^\w-]/g, ""));
  if (!loaded) return Response.json({ error: "Draft not found or expired (drafts are kept 1 hour). Upload the file again." }, { status: 404 });
  const { draft, files: stored } = loaded;
  const ups = await updates();
  const id = `U${String(ups.length + 1).padStart(3, "0")}`;
  const srcId = `${id}-S1`;
  const rename = (s: string) => s.replace(/^NEW/, srcId);
  let sources: Source[];
  try { sources = publishedSources(id, draft, stored, await allSources(ups)); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 409 }); }
  const segments = draft.segments.map((s) => ({ ...s, src: rename(s.src) }));
  const cs: ChangeSet = JSON.parse(JSON.stringify(changeset).replace(/"src":"NEW/g, `"src":"${srcId}`));
  // Fill exact locators for every citation (new file + baseline).
  const idx = indexSegments([...(await allSegments(ups)), ...segments]);
  const fix = (cites: Cite[] = []) => cites.map((c) => ({ ...c, loc: resolveCite(c, idx).loc || c.loc }));
  for (const k of ["problemStatus", "priorDecisions", "newProposals", "newDecisions"] as const) cs[k] = cs[k].map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.conditionChanges = cs.conditionChanges.map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.newActions = cs.newActions.map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.revisedAnswers = (cs.revisedAnswers ?? []).map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.revisedBrief = (cs.revisedBrief ?? []).map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.id = id; cs.publishedAt = new Date().toISOString(); cs.filename = draft.filename;
  await store.publish(id, { cs, sources, segments }, stored);
  await store.deleteDraft(draftId);
  return Response.json({ ok: true, id });
}
