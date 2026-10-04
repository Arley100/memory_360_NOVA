import { createHash } from "node:crypto";
import type { Update } from "./updateStore";
import type { Source } from "./types";
import type { QuestionComputation, QuestionContextChange, QuestionFreshness, QuestionSourceSnapshot } from "./questionTypes";

// Update directories are storage versions, not part of a file's logical path. Preserve all other directories/attachment paths.
export const logicalSourcePath = (p: string) => p.replace(/\\/g, "/").replace(/^data\/updates\/U\d+\//, "data/updates/");
const filename = (p: string) => p.split("#att:").at(-1)!.split("/").at(-1)!;

export function snapshotSources(sources: Source[], updates: Update[]): Record<string, QuestionSourceSnapshot> {
  const updateOf = new Map(updates.flatMap((u) => u.sources.map((s) => [s.id, u.cs] as const)));
  return Object.fromEntries(sources.map((s) => {
    const u = updateOf.get(s.id);
    return [logicalSourcePath(s.path), { sha256: s.sha256, version: s.version, id: s.id, path: s.path, ...(u ? { updateId: u.id, publishedAt: u.publishedAt } : {}) }];
  }));
}

export function snapshotUpdates(updates: Update[]): Record<string, string> {
  // IDs can be reused after reset. Fingerprint the actual update too; timestamps alone never decide freshness.
  return Object.fromEntries(updates.map((u) => [u.cs.id, createHash("sha256").update(JSON.stringify({ cs: u.cs, sources: u.sources, segments: u.segments })).digest("hex")]));
}

export function getQuestionFreshness(questionId: string, computation: QuestionComputation, updates: Update[]): QuestionFreshness {
  const included = new Set(computation.includedUpdateIds);
  const current = new Set(updates.map((u) => u.cs.id));
  const versions = snapshotUpdates(updates);
  const relevant = updates.filter((u) => u.cs.affected.answers.includes(questionId));
  const changedUpdates = [...new Set([
    ...relevant.filter((u) => !included.has(u.cs.id)).map((u) => u.cs.id),
    // A reused ID may now affect a DIFFERENT question. The old included update still disappeared.
    ...updates.filter((u) => included.has(u.cs.id) && computation.includedUpdateVersions?.[u.cs.id] !== undefined && computation.includedUpdateVersions[u.cs.id] !== versions[u.cs.id]).map((u) => u.cs.id),
  ])];
  const removedUpdates = computation.includedUpdateIds.filter((id) => !current.has(id));
  return { status: changedUpdates.length || removedUpdates.length ? "stale" : "fresh", changedUpdates, removedUpdates, changedSources: getQuestionContextChanges(computation, updates, changedUpdates, removedUpdates) };
}

export function getQuestionContextChanges(computation: QuestionComputation, updates: Update[], changedIds: string[], removedIds: string[]): QuestionContextChange[] {
  const changes = new Map<string, QuestionContextChange>();
  for (const u of updates.filter((u) => changedIds.includes(u.cs.id))) {
    for (const s of u.sources) {
      const key = logicalSourcePath(s.path);
      const previous = computation.sourceSnapshot[key];
      const changeType = !previous ? "added" : previous.sha256 && s.sha256 && previous.sha256 !== s.sha256 ? "modified" : "changed";
      changes.set(key, { id: s.id, path: s.path, filename: filename(s.path), changeType, updateId: u.cs.id, publishedAt: u.cs.publishedAt });
    }
  }
  for (const [key, s] of Object.entries(computation.sourceSnapshot)) {
    const replacedWithoutFile = s.updateId && changedIds.includes(s.updateId) && !updates.find((u) => u.cs.id === s.updateId)?.sources.some((source) => logicalSourcePath(source.path) === key);
    if (s.updateId && (removedIds.includes(s.updateId) || replacedWithoutFile)) changes.set(`removed:${key}`, { id: s.id, path: s.path, filename: filename(s.path), changeType: "removed", updateId: s.updateId, publishedAt: s.publishedAt });
  }
  return [...changes.values()];
}
