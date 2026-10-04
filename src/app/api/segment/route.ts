import { allSegments, allSources, updates } from "@/lib/store";

// Evidence preview: the cited passage with the passages just before and after it.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const src = u.searchParams.get("src") ?? "";
  const loc = u.searchParams.get("loc") ?? "";
  const ups = await updates();
  const source = (await allSources(ups)).find((s) => s.id === src);
  if (!source) return Response.json({ error: "Unknown source" }, { status: 404 });
  const segs = (await allSegments(ups)).filter((s) => s.src === src);
  const range = /^L(\d+)-L(\d+)$/.exec(loc);
  let i = segs.findIndex((s) => s.loc === loc);
  if (i < 0 && range) i = segs.findIndex((s) => s.loc === `L${range[1]}`);
  if (i < 0) i = 0;
  const pick = (j: number) => (segs[j] ? { loc: segs[j].loc, text: segs[j].text } : null);
  return Response.json({
    src, title: source.title, kind: source.kind, authority: source.authority, role: source.role,
    contentDate: source.contentDate?.slice(0, 10), path: source.path.split("#")[0], duplicateOf: source.duplicateOf ?? null,
    before: pick(i - 1), at: pick(i), after: pick(i + 1),
  });
}
