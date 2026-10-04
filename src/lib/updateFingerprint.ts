import { createHash } from "node:crypto";
import type { Update } from "./updateStore";

// Shared with question freshness. Include persisted evidence even when source SHAs are absent.
export function updateFingerprint(u: Update): string {
  return createHash("sha256").update(JSON.stringify({ cs: u.cs, sources: u.sources, segments: u.segments })).digest("hex");
}
