import fs from "fs";
import path from "path";
import { ROOT } from "@/lib/store";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8", ".csv": "text/plain; charset=utf-8", ".eml": "text/plain; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Serves original files from corpus/ and data/updates/ only.
export async function GET(req: Request) {
  const rel = new URL(req.url).searchParams.get("path") ?? "";
  const abs = path.resolve(ROOT, rel);
  const allowed = [path.join(ROOT, "corpus"), path.join(ROOT, "data", "updates")];
  if (!allowed.some((a) => abs.startsWith(a + path.sep)) || !fs.existsSync(abs)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(abs), { headers: { "content-type": TYPES[path.extname(abs).toLowerCase()] ?? "application/octet-stream" } });
}
