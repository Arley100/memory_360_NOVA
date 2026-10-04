import { guard } from "@/lib/access";
import { indexSegments, resolveCite } from "@/lib/cite";
import { allSegments, getKB, allSources, updates } from "@/lib/store";
import { applyGuardrails, datesIn, dedupeWarnings } from "@/lib/update";
import { normalizeChangeSet } from "@/lib/updateInput";
import { plain } from "@/lib/text";
import { updateStore } from "@/lib/updateStore";
import { publishedSources } from "@/lib/updateSources";
import type { ChangeSet, Cite, Source } from "@/lib/types";

// Publishing creates update U00n in the update store. The baseline is never touched.
export async function POST(req: Request) {
  const denied = guard(req, "write");
  if (denied) return denied;
  let draftId: string, changeset: unknown;
  try {
    const body = await req.json();
    if (
      !body ||
      typeof body.draftId !== "string" ||
      !/^[\w-]+$/.test(body.draftId)
    )
      throw new Error("Identifiant de brouillon invalide.");
    draftId = body.draftId;
    changeset = body.changeset;
  } catch {
    return Response.json(
      { error: "Demande de publication invalide." },
      { status: 400 },
    );
  }
  const store = updateStore();
  const loaded = await store.loadDraft(String(draftId).replace(/[^\w-]/g, ""));
  if (!loaded)
    return Response.json(
      {
        error:
          "Brouillon introuvable ou expiré (conservation : 1 heure). Téléversez à nouveau le fichier.",
      },
      { status: 404 },
    );
  const { draft, files: stored } = loaded;
  let edited: ChangeSet;
  try {
    edited = normalizeChangeSet(changeset, draft.filename);
  } catch {
    return Response.json(
      { error: "Ensemble de modifications invalide. Vérifiez les champs modifiables et les citations." },
      { status: 400 },
    );
  }
  const ups = await updates();
  const k = await getKB();
  const current = await allSegments(ups);
  const conditions = k.conditions.map((c) => ({ ...c }));
  const goLive = { ...k.goLive };
  // Derive authoritative state from this request's published-update snapshot.
  for (const u of ups) {
    for (const ch of u.cs.conditionChanges) {
      const condition = conditions.find((c) => c.id === ch.id);
      if (condition) condition.status = ch.status;
    }
    for (const decision of u.cs.newDecisions) {
      if (!/go-live|go live|mise en production/i.test(decision.text)) continue;
      const dates = datesIn(decision.text, +goLive.date.slice(0, 4));
      if (dates.length === 1)
        Object.assign(goLive, {
          date: dates[0],
          headline: decision.text,
          citations: decision.citations,
        });
    }
  }
  // Keep NEW ids until after the shared guardrail pass (its authority checks use them).
  const guarded = applyGuardrails(edited, current, draft.segments, {
    conditions,
    goLive,
    contractEnd: k.goLive.contractEnd,
  });
  // Formatting and exact citation locators are harmless. All other content changes need review.
  const material = (cs: ChangeSet) =>
    JSON.stringify(
      {
        summary: cs.summary,
        problemStatus: cs.problemStatus,
        priorDecisions: cs.priorDecisions,
        newProposals: cs.newProposals,
        newDecisions: cs.newDecisions,
        conditionChanges: cs.conditionChanges,
        newActions: cs.newActions,
        revisedAnswers: cs.revisedAnswers,
        revisedBrief: cs.revisedBrief,
        affected: cs.affected,
      },
      (key, value) =>
        key === "loc"
          ? undefined
          : typeof value === "string"
            ? plain(value)
            : value,
    );
  const warnings = dedupeWarnings([
    ...(guarded.guardrails.reviewWarnings ?? []),
    ...(material(edited) !== material(guarded)
      ? [
          "Les garde-fous ont modifié les changements proposés. Vérifiez la version corrigée avant de publier.",
        ]
      : []),
  ]);
  if (warnings.length) {
    return Response.json(
      { ok: false, reviewRequired: true, warnings, guardedChangeSet: guarded },
      { status: 409 },
    );
  }
  const id = `U${String(ups.length + 1).padStart(3, "0")}`;
  const srcId = `${id}-S1`;
  const rename = (s: string) => s.replace(/^NEW/, srcId);
  let sources: Source[];
  try {
    sources = publishedSources(id, draft, stored, await allSources(ups));
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 409 });
  }
  const segments = draft.segments.map((s) => ({ ...s, src: rename(s.src) }));
  const cs: ChangeSet = JSON.parse(
    JSON.stringify(guarded).replace(/"src":"NEW/g, `"src":"${srcId}`),
  );
  // Fill exact locators for every citation (new file + baseline).
  const idx = indexSegments([...current, ...segments]);
  const fix = (cites: Cite[] = []) =>
    cites.map((c) => ({ ...c, loc: resolveCite(c, idx).loc || c.loc }));
  for (const k of [
    "problemStatus",
    "priorDecisions",
    "newProposals",
    "newDecisions",
  ] as const)
    cs[k] = cs[k].map((x) => ({ ...x, citations: fix(x.citations) }));
  cs.conditionChanges = cs.conditionChanges.map((x) => ({
    ...x,
    citations: fix(x.citations),
  }));
  cs.newActions = cs.newActions.map((x) => ({
    ...x,
    citations: fix(x.citations),
  }));
  cs.revisedAnswers = (cs.revisedAnswers ?? []).map((x) => ({
    ...x,
    citations: fix(x.citations),
  }));
  cs.revisedBrief = (cs.revisedBrief ?? []).map((x) => ({
    ...x,
    citations: fix(x.citations),
  }));
  cs.id = id;
  cs.publishedAt = new Date().toISOString();
  cs.filename = draft.filename;
  await store.publish(id, { cs, sources, segments }, stored);
  await store.deleteDraft(draftId);
  return Response.json({ ok: true, id });
}
