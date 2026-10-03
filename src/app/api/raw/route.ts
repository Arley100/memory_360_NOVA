import fs from "fs";
import path from "path";
import { ROOT } from "@/lib/store";
import { updateStore } from "@/lib/updateStore";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8", ".csv": "text/plain; charset=utf-8", ".eml": "text/plain; charset=utf-8",
  ".ics": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8", ".html": "text/plain; charset=utf-8", ".htm": "text/plain; charset=utf-8",
  ".log": "text/plain; charset=utf-8", ".rtf": "text/plain; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

// Serves original files: corpus/ from disk, data/updates/U00n/<file> from the update store.
export async function GET(req: Request) {
  const rel = new URL(req.url).searchParams.get("path") ?? "";
  const type = TYPES[path.extname(rel).toLowerCase()] ?? "application/octet-stream";
  const m = /^data\/updates\/(U\d{3})\/([^/]+)$/.exec(rel);
  if (m) {
    const buf = await updateStore().readFile(m[1], m[2]);
    return buf ? new Response(new Uint8Array(buf), { headers: { "content-type": type } }) : new Response("Not found", { status: 404 });
  }
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(path.join(ROOT, "corpus") + path.sep) || !fs.existsSync(abs)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(abs), { headers: { "content-type": type } });
}
