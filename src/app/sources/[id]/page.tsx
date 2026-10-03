import Link from "next/link";
import { notFound } from "next/navigation";
import { ScrollToMark } from "@/components/ScrollToMark";
import { allSegments, allSources, updates } from "@/lib/store";
import { norm, prettyLoc } from "@/lib/text";
import { IMAGE_KINDS, type Segment } from "@/lib/types";

function highlight(text: string, q: string) {
  if (!q) return text;
  const t = text.replace(/\u2019/g, "'").toLowerCase();
  const qq = q.replace(/\u2019/g, "'").trim().toLowerCase();
  const i = t.indexOf(qq);
  if (i >= 0) return <>{text.slice(0, i)}<mark>{text.slice(i, i + qq.length)}</mark>{text.slice(i + qq.length)}</>;
  return <mark>{text}</mark>;
}

function isHit(s: Segment, loc: string, q: string) {
  if (loc) {
    const m = /^L(\d+)-L(\d+)$/.exec(loc);
    const l = /^L(\d+)$/.exec(s.loc);
    if (m && l) return +l[1] >= +m[1] && +l[1] <= +m[2];
    if (s.loc === loc) return true;
  }
  return Boolean(q) && norm(s.text).includes(norm(q));
}

export default async function SourceView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ loc?: string; q?: string }> }) {
  const { id: raw } = await params;
  const { loc = "", q = "" } = await searchParams;
  const id = decodeURIComponent(raw);
  const ups = await updates();
  const sources = await allSources(ups);
  const s = sources.find((x) => x.id === id);
  if (!s) notFound();
  const segs = (await allSegments(ups)).filter((x) => x.src === id);
  const rawPath = s.path.split("#")[0];
  const children = sources.filter((x) => x.parent === s.id);
  const target = s.duplicateOf ? sources.find((x) => x.id === s.duplicateOf) : undefined;
  let firstHit = true;
  const row = (x: Segment, label: string) => {
    const hit = isHit(x, loc, q);
    const flag = hit && firstHit ? "1" : "0";
    if (hit) firstHit = false;
    return (
      <div key={x.loc} id={x.loc} data-hit={flag}
        className={`grid grid-cols-[6rem_1fr] gap-3 px-3 py-1 ${hit ? "bg-marker/40" : ""}`}>
        <span className="select-none text-right text-sm text-muted">{label}</span>
        <span className="quote whitespace-pre-wrap">{hit ? highlight(x.text, q) : x.text}</span>
      </div>
    );
  };

  // Spreadsheet: render as a grid with the cited cell highlighted.
  let grid: React.ReactNode = null;
  if (s.kind === "xlsx") {
    const cells = segs.filter((x) => !x.loc.endsWith("#note")).map((x) => {
      const [sheet, addr] = x.loc.split("!");
      const m = /^([A-Z]+)(\d+)$/.exec(addr)!;
      return { sheet, col: m[1], row: +m[2], x };
    });
    const sheets = Array.from(new Set(cells.map((c) => c.sheet)));
    grid = sheets.map((sh) => {
      const cs = cells.filter((c) => c.sheet === sh);
      const cols = Array.from(new Set(cs.map((c) => c.col))).sort();
      const rows = Array.from(new Set(cs.map((c) => c.row))).sort((a, b) => a - b);
      return (
        <div key={sh} className="overflow-x-auto">
          <p className="px-3 py-2 font-semibold">Sheet “{sh}”</p>
          <table className="text-sm">
            <thead><tr><th className="p-1" />{cols.map((c) => <th key={c} className="p-1 text-muted">{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r}>
                  <th className="p-1 text-muted">{r}</th>
                  {cols.map((c) => {
                    const cell = cs.find((x) => x.col === c && x.row === r);
                    const hit = cell && loc === cell.x.loc;
                    return <td key={c} id={cell?.x.loc} data-hit={hit ? "1" : "0"}
                      className={`border border-line p-1.5 ${hit ? "bg-marker font-semibold outline-2 outline-primary" : "bg-surface"}`}>{cell?.x.text}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    });
  }

  return (
    <div className="space-y-4">
      <ScrollToMark />
      <Link href="/sources" className="text-primary underline">← All sources</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{s.id}</h1>
        <span className="text-muted">{s.title}</span>
      </div>
      <p className="text-sm text-muted">
        <code>{s.path}</code> · {s.kind} · authority: {s.authority.toLowerCase()} · role: {s.role.toLowerCase()}
        {s.contentDate ? ` · content date ${s.contentDate.slice(0, 10)}` : ""}
        {loc ? ` · locator ${prettyLoc(loc)}` : ""}
      </p>
      {s.note && <p className="rounded-md border border-line bg-surface p-2 text-sm">Note: {s.note}</p>}
      {target && <p className="rounded-md border border-delivery/40 bg-delivery/5 p-2 text-sm">Identical to <Link className="underline" href={`/sources/${encodeURIComponent(target.id)}`}>{target.id}</Link>: not an independent confirmation.</p>}
      {IMAGE_KINDS.includes(s.kind) && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/raw?path=${encodeURIComponent(rawPath)}`} alt={`Screenshot ${s.id}`} className="max-h-[480px] rounded border border-line" />
          {s.version === "baseline" && <p className="text-sm text-delivery">A screenshot shows a past state; the ticket status prevails.</p>}
        </>
      )}
      {!s.parent && <a className="inline-block text-sm text-primary underline" href={`/api/raw?path=${encodeURIComponent(rawPath)}`} target="_blank">Open original file</a>}
      <div className="rounded-lg border border-line bg-surface py-2">
        {grid ?? segs.map((x) => row(x, prettyLoc(x.loc)))}
        {segs.length === 0 && <p className="p-3 text-muted">No extracted text for this item.</p>}
      </div>
      {children.length > 0 && (
        <div>
          <p className="font-semibold">Attachments</p>
          <ul className="list-disc pl-5">{children.map((c) => (
            <li key={c.id}>{c.title}{c.duplicateOf && <> · same file as <Link className="text-primary underline" href={`/sources/${encodeURIComponent(c.duplicateOf)}`}>{c.duplicateOf}</Link></>}</li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}
