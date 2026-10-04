// Text normalization shared by search, citation checks and highlighting.
export function norm(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/[«»“”]/g, '"')
    .replace(/\*/g, "")
    .replace(/[\s\u00A0\u202F]+/g, " ")
    .trim()
    .toLowerCase();
}

// Accent-insensitive variant for search ("echeance" finds "échéance").
export function fold(s: string): string {
  return norm(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function prettyLoc(loc: string): string {
  if (/^L\d+(-L\d+)?$/.test(loc)) return loc.replace("-L", "–");
  if (loc.startsWith("body:P")) return "¶" + loc.slice(6);
  if (loc.startsWith("header:")) return ({ From: "De", To: "À", Cc: "Cc", Subject: "Objet", Date: "Date" } as Record<string, string>)[loc.slice(7)] ?? loc.slice(7);
  if (loc.startsWith("page=")) return "p." + loc.slice(5);
  if (loc.startsWith("row=")) return "rangée " + loc.slice(4);
  if (loc.startsWith("region=row-")) return "row " + loc.slice(11);
  if (loc.startsWith("region=")) return loc.slice(7);
  if (loc.startsWith("att:")) return "pièce jointe " + loc.slice(4);
  if (/^P\d+$/.test(loc)) return "¶" + loc.slice(1);
  let m = /^(slide|notes)=(\d+):P(\d+)$/.exec(loc);
  if (m) return `${m[1] === "slide" ? "diapositive" : "notes"} ${m[2]} ¶${m[3]}`;
  m = /^event-(\d+):([A-Z]+)$/.exec(loc);
  if (m) return `événement ${m[1]} · ${m[2].toLowerCase()}`;
  if (loc.startsWith("$")) return loc.length > 28 ? "…" + loc.slice(-27) : loc;
  if (loc === "file") return "fichier";
  if (loc.includes("!")) return loc.split("!")[1];
  return loc;
}

export const money = (n: number) =>
  n.toLocaleString("fr-CA").replace(/\u202f|\u00a0/g, " ") + " $";

// Plain text for display: removes Markdown emphasis/headers/bullets a model may add.
export function plain(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1")
    .replace(/(^|\s)\*(\S[^*]*?)\*(?=[\s.,;:!?)]|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "").replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*\*/g, "").trim();
}

// Dates and times are always shown in the project's time zone (Montréal, Eastern Time), whatever the machine:
// laptop, browser or hosted server (Vercel servers run in UTC).
export const PROJECT_TZ = "America/Toronto";
const DT = new Intl.DateTimeFormat("fr-CA", { timeZone: PROJECT_TZ, dateStyle: "medium", timeStyle: "short" });
export function fmtDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(+d) ? iso : `${DT.format(d)} HE`;
}
// A calendar day "YYYY-MM-DD" -> "Oct 22, 2026", with no time-zone conversion (it can never shift by a day).
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc."];
export function fmtDay(ymd?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? "");
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : ymd ?? "À confirmer";
}
// "Q01. What is…" -> "What is…" (the question number is shown separately).
export const stripQ = (q: string) => q.replace(/^\s*Q\d{1,2}[.):]\s*/i, "");
