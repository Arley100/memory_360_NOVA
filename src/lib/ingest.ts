// Parsers for every format a project's information can arrive in. Each returns citable segments with
// locators (see SPEC.md section 15.3). Used by scripts/ingest.ts and by the live upload API.
// Supported: .eml (with attachments), .txt/.log, .md, .csv/.tsv, .pdf, .xlsx/.xls/.xlsm/.ods, .docx, .pptx,
// .ics (calendar), .json (e.g. Teams export), .html/.htm, images (.png/.jpg/.jpeg/.webp/.gif via vision).
// Anything else that contains readable text is read as text; true binaries are kept for manual review.
import { simpleParser } from "mailparser";
import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import JSZip from "jszip";
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

const EXT_KIND: Record<string, Kind> = {
  eml: "eml", txt: "txt", log: "txt", md: "md", markdown: "md", csv: "csv", tsv: "csv", pdf: "pdf",
  xlsx: "xlsx", xls: "xlsx", xlsm: "xlsx", ods: "xlsx", png: "png", jpg: "jpg", jpeg: "jpg", webp: "webp", gif: "gif",
  docx: "docx", pptx: "pptx", ics: "ics", json: "json", html: "html", htm: "html", rtf: "rtf", zip: "zip",
};
const IMAGE_MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

export function kindOf(filename: string): Kind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return EXT_KIND[ext] ?? "other";
}

// Decode text robustly: UTF-8 first (BOM removed), Windows-1252 if the file is not valid UTF-8 (common for French
// files saved on Windows), UTF-16 if it has a UTF-16 BOM.
export function decodeText(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf.subarray(2));
  const utf8 = new TextDecoder("utf-8").decode(buf).replace(/^\uFEFF/, "");
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("windows-1252").decode(buf);
}

function looksLikeText(buf: Buffer): boolean {
  const sample = buf.subarray(0, 4096);
  if (sample.includes(0) && !(sample[0] === 0xff || sample[0] === 0xfe)) return false;
  const t = decodeText(sample);
  const printable = t.replace(/[\x00-\x08\x0E-\x1F\x7F]/g, "").length;
  return t.length > 0 && printable / t.length > 0.95;
}

function lines(text: string, prefix: (n: number) => string) {
  return text.split(/\r?\n/).flatMap((t, i) => (t.trim() ? [{ loc: prefix(i + 1), text: t }] : []));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", rsquo: "’", laquo: "«", raquo: "»" };
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|blockquote)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
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

// Rich text (.rtf): strip control words and header groups, decode \'xx escapes (Windows-1252).
export function rtfToText(rtf: string): string {
  return rtf
    .replace(/\{\\(fonttbl|colortbl|stylesheet|info|\*)[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, "")
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => new TextDecoder("windows-1252").decode(Uint8Array.of(parseInt(h, 16))))
    .replace(/\\(par|line)d?\b ?/g, "\n")
    .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(+n < 0 ? +n + 65536 : +n))
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .trim();
}

// Calendar (.ics): one segment per event field, e.g. "event-1:DTSTART".
function parseIcs(text: string) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const out: { loc: string; text: string }[] = [];
  const LABEL: Record<string, string> = { SUMMARY: "Titre", DTSTART: "Début", DTEND: "Fin", LOCATION: "Lieu", ORGANIZER: "Organisateur", ATTENDEE: "Participant", DESCRIPTION: "Description", STATUS: "Statut" };
  let n = 0;
  for (const block of unfolded.split(/BEGIN:VEVENT/).slice(1)) {
    n++;
    for (const line of block.split(/\r?\n/)) {
      const m = /^([A-Z-]+)(;[^:]*)?:(.*)$/.exec(line);
      if (!m || !LABEL[m[1]]) continue;
      let v = m[3].replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").replace(/^mailto:/i, "");
      const cn = /CN=([^;:]+)/.exec(m[2] ?? "")?.[1];
      if (cn) v = `${cn.replace(/"/g, "")} <${v}>`;
      const dt = /^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2}))?/.exec(v);
      if ((m[1] === "DTSTART" || m[1] === "DTEND") && dt) v = `${dt[1]}-${dt[2]}-${dt[3]}${dt[4] ? ` ${dt[5]}:${dt[6]}` : ""}${v.endsWith("Z") ? " UTC" : ""}`;
      out.push({ loc: `event-${n}:${m[1]}`, text: `${LABEL[m[1]]}: ${v}` });
    }
  }
  return out;
}

// JSON (e.g. Teams/Slack export): message-like objects become "time - author : text"; other values are flattened.
function parseJson(text: string) {
  const out: { loc: string; text: string }[] = [];
  const pick = (o: Record<string, unknown>, keys: string[]): unknown => {
    for (const k of keys) {
      const v = k.split(".").reduce<unknown>((a, p) => (a && typeof a === "object" ? (a as Record<string, unknown>)[p] : undefined), o);
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };
  const walk = (v: unknown, p: string) => {
    if (out.length > 3000) return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return; }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const body = pick(o, ["body.content", "content", "text", "message", "body"]);
      const who = pick(o, ["from.user.displayName", "from.displayName", "from.name", "author.name", "author", "sender", "user", "from"]);
      const when = pick(o, ["createdDateTime", "timestamp", "date", "time", "ts", "created_at"]);
      if (typeof body === "string" && (who || when)) {
        out.push({ loc: p || "$", text: `${when ? `${when} - ` : ""}${typeof who === "string" ? who : JSON.stringify(who)} : ${htmlToText(body).trim()}` });
        return;
      }
      for (const [k, x] of Object.entries(o)) walk(x, `${p}.${k}`);
      return;
    }
    if (v !== null && v !== undefined && String(v).trim()) out.push({ loc: p || "$", text: `${p.split(".").pop()}: ${typeof v === "string" ? htmlToText(v).trim() : v}` });
  };
  walk(JSON.parse(text), "$");
  return out;
}

// PowerPoint (.pptx): text of each slide (and its speaker notes), one segment per paragraph.
async function parsePptx(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf);
  const num = (n: string) => +(/(\d+)\.xml$/.exec(n)?.[1] ?? 0);
  const out: { loc: string; text: string }[] = [];
  const paras = (xml: string) => (xml.match(/<a:p>[\s\S]*?<\/a:p>/g) ?? [])
    .map((p) => (p.match(/<a:t>([\s\S]*?)<\/a:t>/g) ?? []).map((t) => t.replace(/<\/?a:t>/g, "")).join(""))
    .map((t) => htmlToText(t).trim()).filter(Boolean);
  const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => num(a) - num(b));
  for (const f of slides) paras(await zip.file(f)!.async("string")).forEach((t, i) => out.push({ loc: `slide=${num(f)}:P${i + 1}`, text: t }));
  const notes = Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f)).sort((a, b) => num(a) - num(b));
  for (const f of notes) paras(await zip.file(f)!.async("string")).forEach((t, i) => out.push({ loc: `notes=${num(f)}:P${i + 1}`, text: `[Notes] ${t}` }));
  return out;
}

export async function parseFile(
  buf: Buffer,
  filename: string,
  opts: { transcription?: Transcription | null; vision?: (b: Buffer, mime: string) => Promise<Transcription | null> } = {},
): Promise<Parsed> {
  let kind = kindOf(filename);
  const res: Parsed = { kind, segments: [], attachments: [] };

  try {
    if (kind === "eml") {
      const m = await simpleParser(buf);
      if (m.subject) res.segments.push({ loc: "header:Subject", text: `Objet : ${m.subject}` });
      if (m.from?.text) res.segments.push({ loc: "header:From", text: `De : ${m.from.text}` });
      const to = Array.isArray(m.to) ? m.to.map((x) => x.text).join(", ") : m.to?.text;
      if (to) res.segments.push({ loc: "header:To", text: `À : ${to}` });
      const cc = Array.isArray(m.cc) ? m.cc.map((x) => x.text).join(", ") : m.cc?.text;
      if (cc) res.segments.push({ loc: "header:Cc", text: `Cc : ${cc}` });
      if (m.date) {
        res.contentDate = m.date.toISOString();
        const line = m.headerLines.find((h) => h.key === "date")?.line ?? `Date : ${m.date.toISOString()}`;
        res.segments.push({ loc: "header:Date", text: line });
      }
      res.title = m.subject ?? filename;
      const body = m.text ?? (typeof m.html === "string" ? htmlToText(m.html) : "");
      body.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean)
        .forEach((p, i) => res.segments.push({ loc: `body:P${i + 1}`, text: p }));
      for (const a of m.attachments) {
        const name = a.filename ?? "piece-jointe";
        res.attachments.push({ filename: name, content: a.content });
        res.segments.push({ loc: `att:${name}`, text: `Pièce jointe : ${name}` });
      }
    } else if (kind === "txt" || kind === "md") {
      res.segments = lines(decodeText(buf), (n) => `L${n}`);
    } else if (kind === "csv") {
      res.segments = lines(decodeText(buf), (n) => `row=${n}`);
    } else if (kind === "html") {
      res.segments = lines(htmlToText(decodeText(buf)), (n) => `L${n}`);
    } else if (kind === "ics") {
      res.segments = parseIcs(decodeText(buf));
    } else if (kind === "json") {
      res.segments = parseJson(decodeText(buf));
    } else if (kind === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: false });
      (text as string[]).forEach((t, i) => res.segments.push({ loc: `page=${i + 1}`, text: t }));
      if (res.segments.every((s) => !s.text.trim())) res.segments = [{ loc: "page=1", text: "[PDF numérisé sans couche de texte : exportez une page en image pour la faire lire]" }];
    } else if (kind === "xlsx") {
      const wb = XLSX.read(buf);
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        for (const addr of Object.keys(ws).filter((k) => !k.startsWith("!"))) {
          const cell = ws[addr] as XLSX.CellObject & { c?: { t: string }[] };
          const v = cell.w ?? String(cell.v ?? "");
          if (v.trim()) res.segments.push({ loc: `${name}!${addr}`, text: v });
          if (cell.c?.length) res.segments.push({ loc: `${name}!${addr}#note`, text: `Commentaire : ${cell.c.map((x) => x.t).join(" ")}` });
        }
      }
    } else if (kind in IMAGE_MIME) {
      let t = opts.transcription ?? null;
      if (!t && opts.vision) t = await opts.vision(buf, IMAGE_MIME[kind]);
      res.segments = t ? transcriptionSegments(t) : [{ loc: "region=image", text: "[Image sans transcription : configurez un fournisseur d’IA pour la lire]" }];
    } else if (kind === "docx") {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      value.split(/\r?\n/).map((p) => p.trim()).filter(Boolean).forEach((p, i) => res.segments.push({ loc: `P${i + 1}`, text: p }));
    } else if (kind === "pptx") {
      res.segments = await parsePptx(buf);
    } else if (kind === "rtf") {
      res.segments = lines(rtfToText(decodeText(buf)), (n) => `L${n}`);
    } else if (kind === "zip") {
      // Several files at once: each entry is handled like an attachment.
      const zip = await JSZip.loadAsync(buf);
      for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir || name.startsWith("__MACOSX") || name.split("/").pop()!.startsWith(".")) continue;
        res.attachments.push({ filename: name.split("/").pop()!, content: Buffer.from(await entry.async("uint8array")) });
        res.segments.push({ loc: `att:${name.split("/").pop()}`, text: `Entrée de l’archive : ${name}` });
      }
    } else if (looksLikeText(buf)) {
      kind = res.kind = "txt";
      res.segments = lines(decodeText(buf), (n) => `L${n}`);
    } else {
      res.segments = [{ loc: "file", text: `[Format binaire non pris en charge : ${filename}. Conservé pour vérification manuelle. Exportez en PDF, texte ou image.]` }];
    }
  } catch (e) {
    res.segments = [{ loc: "file", text: `[Lecture impossible de ${filename}: ${(e as Error).message}. Conservé pour vérification manuelle.]` }];
  }
  if (res.segments.length === 0) res.segments = [{ loc: "file", text: `[Aucun texte lisible dans ${filename}.]` }];
  return res;
}
