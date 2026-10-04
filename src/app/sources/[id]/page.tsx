import { frenchText } from "@/lib/frenchContent";
import { frenchLabel } from "@/lib/locale";
import { Icon } from "@/components/UI";
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
        className={`source-passage ${hit ? "is-cited" : ""}`}>
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
          <p className="px-3 py-2 font-semibold">Feuille «{sh}»</p>
          <table className="source-grid">
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
    <div className="space-y-5">
      <ScrollToMark />
      <Link href="/sources" className="source-breadcrumb">Sources / {s.id}</Link>
      <div className="page-header"><div><p className="section-label mb-2">Atelier des preuves</p><h1>{s.id}</h1><p className="mt-2 text-muted">{frenchText(s.title)}</p></div>{!s.parent && <a className="button-secondary flex items-center gap-2" href={`/api/raw?path=${encodeURIComponent(rawPath)}`} target="_blank" rel="noreferrer"><Icon name="link" size={15} />Ouvrir le fichier original</a>}</div>
      <div className="source-workbench">
        <div className="min-w-0 space-y-5">
          {IMAGE_KINDS.includes(s.kind) && <section className="panel source-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/raw?path=${encodeURIComponent(rawPath)}`} alt={`Capture d’écran ${s.id}`} />
            {s.version === "baseline" && <div className="watch-note"><Icon name="warning" size={16} /><p>Une capture montre un état passé ; le statut du ticket prévaut.</p></div>}
          </section>}
          <div className="panel source-document">
            <div className="section-header"><h2>{s.kind === "xlsx" ? "Contenu du tableur" : "Passages sources"}</h2><span className="text-xs text-muted">{segs.length} passages</span></div>
            <div className="py-3">{grid ?? segs.map((x) => row(x, prettyLoc(x.loc)))}{segs.length === 0 && <p className="p-4 text-muted">Aucun texte extrait pour cet élément.</p>}</div>
          </div>
        </div>
        <aside className="panel context-rail source-metadata" aria-label="Métadonnées de la source">
          <div className="section-header"><h2>Détails de la source</h2><Icon name="file" size={16} /></div>
          <dl>
            <div><dt>Type de source</dt><dd>{s.kind}</dd></div>
            <div><dt>Autorité</dt><dd>{frenchLabel(s.authority)}</dd></div>
            <div><dt>Rôle</dt><dd>{frenchLabel(s.role)}</dd></div>
            <div><dt>Version</dt><dd>{frenchLabel(s.version)}</dd></div>
            {s.contentDate && <div><dt>Date du contenu</dt><dd>{s.contentDate.slice(0, 10)}</dd></div>}
            {loc && <div><dt>Repère exact</dt><dd className="text-primary">{prettyLoc(loc)}</dd></div>}
            <div><dt>Chemin du fichier</dt><dd><code>{s.path}</code></dd></div>
          </dl>
          {s.note && <p className="metadata-note">Note : {frenchText(s.note)}</p>}
          {target && <div className="watch-note mx-4 mb-4"><Icon name="warning" size={15} /><p>Identique à <Link className="underline" href={`/sources/${encodeURIComponent(target.id)}`}>{target.id}</Link> : aucune confirmation indépendante.</p></div>}
          {children.length > 0 && <div className="metadata-note"><h3 className="mb-2">Pièces jointes</h3><ul className="space-y-3">{children.map((c) => <li key={c.id}><Link className="text-primary hover:underline" href={`/sources/${encodeURIComponent(c.id)}`}>{frenchText(c.title)}</Link>{c.duplicateOf && <> · même fichier que <Link className="text-primary underline" href={`/sources/${encodeURIComponent(c.duplicateOf)}`}>{c.duplicateOf}</Link></>}</li>)}</ul></div>}
        </aside>
      </div>
    </div>
  );
}
