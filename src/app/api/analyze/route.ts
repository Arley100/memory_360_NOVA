import { guard } from "@/lib/access";
import { runAnalysis } from "@/lib/analyze";
import { llmProvider } from "@/lib/llm";
import { invalidateGeneratedFile } from "@/lib/store";
import { updateStore } from "@/lib/updateStore";

export const maxDuration = 300;

// Builds the knowledge base from the raw files and streams progress as newline-delimited JSON:
// {"type":"progress", ...} lines, then {"type":"done", meta} or {"type":"error", message}.
export async function POST(req: Request) {
  const denied = guard(req, "analyze");
  if (denied) return denied;
  if (!llmProvider()) return Response.json({ error: "No LLM key configured." }, { status: 503 });
  const enc = new TextEncoder();
  let disconnected = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => {
        if (!disconnected) controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      };
      const ping = setInterval(() => send({ type: "ping" }), 10_000); // keeps the connection alive
      try {
        const kb = await runAnalysis((p) => send({ type: "progress", ...p }));
        await updateStore().saveKB(kb);
        invalidateGeneratedFile();
        send({ type: "done", meta: kb.meta });
      } catch (e) {
        send({ type: "error", message: (e as Error).message });
      } finally {
        clearInterval(ping);
        if (!disconnected) controller.close();
      }
    },
    cancel() { disconnected = true; },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
