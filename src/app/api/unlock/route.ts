import { accessCookie, accessRequired, codeMatches } from "@/lib/access";

export async function POST(req: Request) {
  if (!accessRequired()) return Response.json({ ok: true });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  await new Promise((r) => setTimeout(r, 400)); // slows down guessing
  if (!code || !codeMatches(code.trim())) return Response.json({ error: "Wrong code." }, { status: 401 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": accessCookie(code.trim()) } });
}
