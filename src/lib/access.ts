// Protects the endpoints that spend API credits or change the state (Ask, update analysis, publish, reset).
// - DEMO_CODE set (hosted): visitors unlock once with the code; a cookie keeps them unlocked for 7 days.
// - DEMO_CODE unset (local): everything is open.
// Plus a simple per-visitor rate limit (per server instance; the prepaid credit cap is the hard limit).
import crypto from "crypto";

export const ACCESS_COOKIE = "m360_access";
const token = (code: string) => crypto.createHash("sha256").update(`memoire360:${code}`).digest("hex");

export function accessRequired(): boolean { return Boolean(process.env.DEMO_CODE); }

export function codeMatches(code: string): boolean {
  const expected = process.env.DEMO_CODE ?? "";
  const a = Buffer.from(token(code)), b = Buffer.from(token(expected));
  return expected.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function accessCookie(code: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ACCESS_COOKIE}=${token(code)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${secure}`;
}

function hasAccess(req: Request): boolean {
  if (!accessRequired()) return true;
  const cookie = req.headers.get("cookie") ?? "";
  const m = new RegExp(`${ACCESS_COOKIE}=([a-f0-9]{64})`).exec(cookie);
  return Boolean(m && m[1] === token(process.env.DEMO_CODE!));
}

const hits = new Map<string, number[]>();
const LIMITS: Record<string, { max: number; windowMs: number }> = {
  ask: { max: 20, windowMs: 5 * 60_000 },
  analyze: { max: 8, windowMs: 5 * 60_000 },
  write: { max: 20, windowMs: 5 * 60_000 },
};

// Returns an error Response, or null when the request may proceed.
export function guard(req: Request, kind: keyof typeof LIMITS): Response | null {
  if (!hasAccess(req)) return Response.json({ error: "Enter the demo code to use this feature.", needCode: true }, { status: 401 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const { max, windowMs } = LIMITS[kind];
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return Response.json({ error: `Too many requests: please wait a few minutes (limit ${max} per ${windowMs / 60000} min).` }, { status: 429 });
  recent.push(now);
  hits.set(key, recent);
  return null;
}
