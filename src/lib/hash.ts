import { createHash } from "node:crypto";

// Fingerprint original bytes, before decoding, extraction or storage limits.
export const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
