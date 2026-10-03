// Parsers for every corpus format. Each returns citable segments with locators
// (see SPEC.md section 15.3). Used by scripts/ingest.ts and by the live upload API.
import { simpleParser } from "mailparser";
import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import type { Kind } from "./types";

export interface Transcription {
  header?: string; title?: string; rows: string[]; notes: string[]; description?: string;
}

export interface Parsed {
  kind: Kind;
  segments: { loc: string; text: string }[];
  attachments: { filename: string; content: Buffer }[];
  contentDate?: string;
  title?: string;
}

export function kindOf(filename: string): Kind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "jpeg") return "jpg";
  return (["eml", "txt", "md", "csv", "pdf", "xlsx", "png", "jpg", "docx"].includes(ext) ? ext : "other") as Kind;
}

function lines(text: string, prefix: (n: number) => string) {
  return text.split(/\r?\n/).flatMap((t, i) => (t.trim() ? [{ loc: prefix(i + 1), text: t }] : []));
}

export function transcriptionSegments(t: Transcription) {
  const out: { loc: string; text: string }[] = [];
  if (t.header) out.push({ loc: "region=header", text: t.header });
  if (t.title) out.push({ loc: "region=title", text: t.title });
  t.rows.forEach((r, i) => out.push({ loc: `region=row-${i + 1}`, text: r }));
  t.notes.forEach((r, i) => out.push({ loc: `region=note-${i + 1}`, text: r }));
  if (t.description) out.push({ loc: "region=description", text: `[Description] ${t.description}` });
  return out;
}

export async function parseFile(
  buf: Buffer,
  filename: string,
  opts: { transcription?: Transcription | null; vision?: (b: Buffer, mime: string) => Promise<Transcription | null> } = {},
): Promise<Parsed> {
  const kind = kindOf(filename);
  const res: Parsed = { kind, segments: [], attachments: [] };

  if (kind === "eml") {
    const m = await simpleParser(buf);
    if (m.subject) res.segments.push({ loc: "header:Subject", text: `Subject: ${m.subject}` });
    if (m.from?.text) res.segments.push({ loc: "header:From", text: `From: ${m.from.text}` });
    const to = Array.isArray(m.to) ? m.to.map((x) => x.text).join(", ") : m.to?.text;
    if (to) res.segments.push({ loc: "header:To", text: `To: ${to}` });
    if (m.date) {
      res.contentDate = m.date.toISOString();
      const line = m.headerLines.find((h) => h.key === "date")?.line ?? `Date: ${m.date.toISOString()}`;
      res.segments.push({ loc: "header:Date", text: line });
    }
    res.title = m.subject ?? filename;
    (m.text ?? "").split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean)
      .forEach((p, i) => res.segments.push({ loc: `body:P${i + 1}`, text: p }));
    for (const a of m.attachments) {
      const name = a.filename ?? "attachment";
      res.attachments.push({ filename: name, content: a.content });
      res.segments.push({ loc: `att:${name}`, text: `Attachment: ${name}` });
    }
  } else if (kind === "txt" || kind === "md") {
    res.segments = lines(buf.toString("utf8"), (n) => `L${n}`);
  } else if (kind === "csv") {
    res.segments = lines(buf.toString("utf8"), (n) => `row=${n}`);
  } else if (kind === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: false });
    (text as string[]).forEach((t, i) => res.segments.push({ loc: `page=${i + 1}`, text: t }));
  } else if (kind === "xlsx") {
    const wb = XLSX.read(buf);
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      for (const addr of Object.keys(ws).filter((k) => !k.startsWith("!"))) {
        const cell = ws[addr] as XLSX.CellObject & { c?: { t: string }[] };
        const v = cell.w ?? String(cell.v ?? "");
        if (v.trim()) res.segments.push({ loc: `${name}!${addr}`, text: v });
        if (cell.c?.length) res.segments.push({ loc: `${name}!${addr}#note`, text: `Comment: ${cell.c.map((x) => x.t).join(" ")}` });
      }
    }
  } else if (kind === "png" || kind === "jpg") {
    let t = opts.transcription ?? null;
    if (!t && opts.vision) t = await opts.vision(buf, kind === "png" ? "image/png" : "image/jpeg");
    res.segments = t ? transcriptionSegments(t) : [{ loc: "region=image", text: "[Image without transcription: configure an LLM key to read it]" }];
  } else if (kind === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    value.split(/\r?\n/).map((p) => p.trim()).filter(Boolean)
      .forEach((p, i) => res.segments.push({ loc: `P${i + 1}`, text: p }));
  } else {
    res.segments = [{ loc: "file", text: `[Unsupported format: ${filename}. Kept for manual review.]` }];
  }
  return res;
}
