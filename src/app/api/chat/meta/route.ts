import { chatMeta } from "@/lib/chat";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await chatMeta(), { headers: { "cache-control": "no-store" } });
}
