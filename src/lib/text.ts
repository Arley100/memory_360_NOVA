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
  if (loc.startsWith("header:")) return loc.slice(7);
  if (loc.startsWith("page=")) return "p." + loc.slice(5);
  if (loc.startsWith("row=")) return "row " + loc.slice(4);
  if (loc.startsWith("region=row-")) return "row " + loc.slice(11);
  if (loc.startsWith("region=")) return loc.slice(7);
  if (loc.startsWith("att:")) return "attachment " + loc.slice(4);
  if (/^P\d+$/.test(loc)) return "¶" + loc.slice(1);
  let m = /^(slide|notes)=(\d+):P(\d+)$/.exec(loc);
  if (m) return `${m[1]} ${m[2]} ¶${m[3]}`;
  m = /^event-(\d+):([A-Z]+)$/.exec(loc);
  if (m) return `event ${m[1]} · ${m[2].toLowerCase()}`;
  if (loc.startsWith("$")) return loc.length > 28 ? "…" + loc.slice(-27) : loc;
  if (loc === "file") return "file";
  if (loc.includes("!")) return loc.split("!")[1];
  return loc;
}

export const money = (n: number) =>
  n.toLocaleString("fr-CA").replace(/\u202f|\u00a0/g, " ") + " $";
