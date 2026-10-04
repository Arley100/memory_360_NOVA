import { updateFingerprint } from "./updateFingerprint";
import type { Update } from "./updateStore";
import type { Source } from "./types";
import type { QuestionComputation, QuestionContextDelta, QuestionContextChange, QuestionFreshness, QuestionSourceSnapshot } from "./questionTypes";

// Update directories are storage versions, not part of a file's logical path. Preserve all other directories/attachment paths.
export const logicalSourcePath = (p: string) => p.replace(/\\/g, "/").replace(/^data\/updates\/U\d+\//, "data/updates/");
export const sourceLogicalPath = (s: Source) => logicalSourcePath(s.logicalPath ?? s.path);
const filename = (p: string) => p.split("#att:").at(-1)!.split("/").at(-1)!;

export function snapshotSources(sources: Source[], updates: Update[]): Record<string, QuestionSourceSnapshot> {
  const updateOf = new Map(updates.flatMap((u) => u.sources.map((s) => [s.id, u.cs] as const)));
  return Object.fromEntries(sources.map((s) => {
    const u = updateOf.get(s.id);
    return [sourceLogicalPath(s), { sha256: s.sha256, version: s.version, id: s.id, path: s.path, ...(u ? { updateId: u.id, publishedAt: u.publishedAt } : {}) }];
  }));
}

export function snapshotUpdates(updates: Update[]): Record<string, string> {
  // IDs can be reused after reset. Fingerprint the actual update too; timestamps alone never decide freshness.
  return Object.fromEntries(updates.map((u) => [u.cs.id, updateFingerprint(u)]));
}

export function getQuestionFreshness(questionId: string, computation: QuestionComputation, updates: Update[], sources?: Source[]): QuestionFreshness {
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
  const changedSources = getQuestionContextChanges(computation, updates, changedUpdates, removedUpdates);
  if (sources) {
    const currentSources = snapshotSources(sources, updates);
    for (const [key, old] of Object.entries(computation.sourceSnapshot)) {
      if (old.updateId) continue;
      const now = currentSources[key];
      if (now?.updateId) continue; // Published replacements use the ChangeSet relevance mapping below.
      if (!now || old.sha256 !== now.sha256 || old.version !== now.version) changedSources.push({ id: now?.id ?? old.id, path: now?.path ?? old.path, filename: filename(old.path), changeType: now ? "modified" : "removed", updateId: "baseline", sha256: now?.sha256, version: now?.version, previousSourceId: old.id });
    }
    for (const [key, now] of Object.entries(currentSources)) {
      if (!now.updateId && !computation.sourceSnapshot[key]) changedSources.push({ id: now.id, path: now.path, filename: filename(now.path), changeType: "added", updateId: "baseline", sha256: now.sha256, version: now.version });
    }
  }
  return { status: changedUpdates.length || removedUpdates.length || changedSources.length || computation.result === "uncertain" ? "stale" : "fresh", changedUpdates, removedUpdates, changedSources };
}

export function getQuestionContextChanges(computation: QuestionComputation, updates: Update[], changedIds: string[], removedIds: string[]): QuestionContextChange[] {
  const changes = new Map<string, QuestionContextChange>();
  for (const u of updates.filter((u) => changedIds.includes(u.cs.id))) {
    for (const s of u.sources) {
      const key = sourceLogicalPath(s);
      const previous = computation.sourceSnapshot[key];
      if (previous?.sha256 && s.sha256 && previous.sha256 === s.sha256) { changes.delete(key); continue; }
      const changeType = !previous ? "added" : previous.sha256 && s.sha256 ? "modified" : "changed";
      changes.set(key, { id: s.id, path: s.path, logicalPath: key, filename: filename(s.path), changeType, updateId: u.cs.id, publishedAt: u.cs.publishedAt, sha256: s.sha256, version: s.version, previousSourceId: previous?.id });
    }
  }
  for (const [key, s] of Object.entries(computation.sourceSnapshot)) {
    const replacedWithoutFile = s.updateId && changedIds.includes(s.updateId) && !updates.find((u) => u.cs.id === s.updateId)?.sources.some((source) => sourceLogicalPath(source) === key);
    const stillPresent = updates.some((u) => u.sources.some((source) => sourceLogicalPath(source) === key));
    if (s.updateId && (removedIds.includes(s.updateId) || replacedWithoutFile) && !stillPresent) changes.set(`removed:${key}`, { id: s.id, path: s.path, logicalPath: key, filename: filename(s.path), changeType: "removed", updateId: s.updateId, publishedAt: s.publishedAt, sha256: s.sha256, version: s.version });
  }
  return [...changes.values()];
}

export function getQuestionContextDelta(questionId: string, computation: QuestionComputation, updates: Update[], sources: Source[]): QuestionContextDelta {
  const freshness = getQuestionFreshness(questionId, computation, updates, sources);
  const changed = freshness.changedSources;
  const current = snapshotSources(sources, updates);
  // Even an update formerly unrelated to this question may replace a file directly used by it.
  for (const [key, old] of Object.entries(computation.sourceSnapshot)) {
    if (!computation.citations.some((c) => c.src === old.id)) continue;
    const now = current[key];
    if (!now || now.sha256 !== old.sha256 || ((!now.sha256 || !old.sha256) && (now.id !== old.id || now.version !== old.version))) {
      if (!changed.some((c) => logicalSourcePath(c.logicalPath ?? c.path) === key)) changed.push({ id: now?.id ?? old.id, path: now?.path ?? old.path, logicalPath: key, filename: filename(old.path), changeType: now ? old.sha256 && now.sha256 ? "modified" : "changed" : "removed", updateId: now?.updateId ?? old.updateId ?? "baseline", publishedAt: now?.publishedAt, sha256: now?.sha256, version: now?.version, previousSourceId: old.id });
    }
  }
  const relevantUpdateIds = [...new Set([...freshness.changedUpdates, ...freshness.removedUpdates, ...changed.map((c) => c.updateId).filter((id) => id !== "baseline")])];
  const uncertainReason = changed.some((c) => c.updateId === "baseline" && c.changeType === "added") ? "New baseline files have no question relevance mapping." : relevantUpdateIds.some((id) => !changed.some((c) => c.updateId === id)) ? "A changed update has no identifiable source delta." : changed.some((c) => c.changeType !== "removed" && (c.changeType === "changed" || !c.sha256 || !c.version)) ? "Changed source fingerprints are incomplete." : undefined;
  return { addedSources: changed.filter((c) => c.changeType === "added"), modifiedSources: changed.filter((c) => c.changeType === "modified" || c.changeType === "changed"), removedSources: changed.filter((c) => c.changeType === "removed"), relevantUpdateIds, uncertainReason };
}
