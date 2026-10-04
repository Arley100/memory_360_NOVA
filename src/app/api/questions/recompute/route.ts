import { guard } from "@/lib/access";
import { llmProvider } from "@/lib/llm";
import { recomputeQuestions, validateQuestionIds } from "@/lib/questionComputations";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = guard(req, "ask");
  if (denied) return denied;
  let ids: string[];
  try { ids = validateQuestionIds((await req.json()).ids); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
  if (!llmProvider()) return Response.json({ error: "Recomputation requires the configured LLM provider." }, { status: 503 });
  if (!req.headers.get("accept")?.includes("application/x-ndjson")) {
    try { return Response.json({ results: await recomputeQuestions(ids) }); }
    catch (error) { return Response.json({ error: (error as Error).message }, { status: 500 }); }
  }
  const encoder = new TextEncoder();
  let disconnected = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => { if (!disconnected) controller.enqueue(encoder.encode(JSON.stringify(value) + "\n")); };
      const ping = setInterval(() => send({ type: "ping" }), 10_000);
      try {
        await recomputeQuestions(ids, (result) => send({ type: "result", ...result }));
        send({ type: "done" });
      } catch (error) { send({ type: "error", error: (error as Error).message }); }
      finally { clearInterval(ping); if (!disconnected) controller.close(); }
    },
    cancel() { disconnected = true; },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
