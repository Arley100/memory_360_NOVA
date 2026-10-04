import { sha256 } from "./hash";
import { kindOf } from "./ingest";
import { logicalSourcePath, sourceLogicalPath } from "./questionFreshness";
import type { Source } from "./types";
import type { Draft, StoredFile } from "./updateStore";

export function publishedSources(id: string, draft: Draft, files: StoredFile[], previous: Source[]): Source[] {
  const srcId = `${id}-S1`;
  const relPath = `data/updates/${id}/${draft.files[0]}`;
  const hashes = new Map(files.map((f) => [f.name, sha256(f.data)]));
  // Include empty/unreadable uploaded files too; segments alone are not a file inventory.
  const subIds = [...new Set([
    ...draft.files.map((name, i) => i === 0 ? "NEW" : `NEW>${name}`),
    ...Object.keys(draft.sourceHashes ?? {}), ...draft.segments.map((s) => s.src),
  ])];
  const primaryPath = logicalSourcePath(relPath);
  const identity = (p: string, name: string, ownFile: boolean): string => {
    const key = logicalSourcePath(p);
    const existing = previous.findLast((s) => logicalSourcePath(s.path) === key);
    if (existing) return sourceLogicalPath(existing);
    // Uploads have no directory picker. Only an unambiguous baseline filename can identify a replacement.
    const matches = previous.filter((s) => s.version === "baseline" && !s.parent && s.path.replace(/\\/g, "/").split("/").at(-1) === name);
    if (ownFile && matches.length === 1) return sourceLogicalPath(matches[0]);
    return key;
  };
  const primaryIdentity = identity(relPath, draft.files[0], true);
  return subIds.map((sid) => {
    const name = sid === "NEW" ? draft.files[0] : sid.split(">").pop()!;
    const ownFile = sid === "NEW" || draft.files.includes(name);
    const p = ownFile ? `data/updates/${id}/${name}` : `${relPath}#att:${name}`;
    // Stored bytes take precedence. Draft metadata also covers attachments and oversized hosted originals.
    const hash = (ownFile ? hashes.get(name) : undefined) ?? draft.sourceHashes?.[sid];
    if (!hash || !/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Original fingerprint unavailable for ${name}. Upload the file again.`);
    const logicalPath = ownFile ? identity(p, name, true) : logicalSourcePath(p).replace(primaryPath, primaryIdentity);
    return {
      id: sid.replace(/^NEW/, srcId), path: p, logicalPath, kind: kindOf(name),
      title: ownFile ? `New information: ${name}` : `Attachment ${name}`, authority: "NEW", role: "CORE",
      contentDate: draft.contentDate, sha256: hash, version: id, parent: ownFile ? undefined : srcId,
    };
  });
}
