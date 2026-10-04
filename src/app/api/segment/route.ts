import { allSegments, allSources, updates, resolver } from "@/lib/store";

// Evidence preview: the cited passage with the passages just before and after it.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const src = u.searchParams.get("src") ?? "";
  const loc = u.searchParams.get("loc") ?? "";
  const quote = u.searchParams.get("quote") ?? "";
  const ups = await updates();
  const source = (await allSources(ups)).find((s) => s.id === src);
  if (!source) return Response.json({ error: "Unknown source" }, { status: 404 });
  const segs = (await allSegments(ups)).filter((s) => s.src === src);
  const range = /^L(\d+)-L(\d+)$/.exec(loc);
  let i = segs.findIndex((s) => s.loc === loc);
  if (i < 0 && range) i = segs.findIndex((s) => s.loc === `L${range[1]}`);
  if (i < 0 && loc) return Response.json({ error: "Unknown passage" }, { status: 404 });
  if (i < 0) i = 0;
  const end = range ? segs.findIndex((s) => s.loc === `L${range[2]}`) : i;
  if (range && end < i) return Response.json({ error: "Unknown passage range" }, { status: 404 });
  const pick = (j: number) => (segs[j] ? { loc: segs[j].loc, text: segs[j].text } : null);
  return Response.json({
    verified: quote ? (await resolver([], ups))({ src, loc, quote }).verified : false,
    src, title: source.title, kind: source.kind, authority: source.authority, role: source.role,
    contentDate: source.contentDate?.slice(0, 10), path: source.path.split("#")[0], duplicateOf: source.duplicateOf ?? null,
    before: pick(i - 1), at: range ? { loc, text: segs.slice(i, end + 1).map((s) => s.text).join("\n") } : pick(i), after: pick(end + 1),
  }, { headers: { "cache-control": "no-store" }
  });
}
