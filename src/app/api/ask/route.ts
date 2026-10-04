import { askProject } from "@/lib/ask";
import { guard } from "@/lib/access";
import { llmProvider } from "@/lib/llm";
import { allSegments, allSources, updates } from "@/lib/store";

export const maxDuration = 120;

// Streams newline-delimited JSON: {"type":"stage",...} while working, then {"type":"result",...} or {"type":"error",...}.
export async function POST(req: Request) {
  const denied = guard(req, "ask");
  if (denied) return denied;
  const { question } = (await req.json()) as { question: string };
  if (typeof question !== "string" || !question.trim()) return Response.json({ error: "Question vide" }, { status: 400 });
  if (!llmProvider()) {
    return Response.json({ error: "Aucun fournisseur d’IA configuré. Ajoutez ANTHROPIC_API_KEY (ou OPENAI_API_KEY et LLM_MODEL) dans .env.local. Les autres pages et les preuves restent accessibles." }, { status: 503 });
  }
  const snapshot = await updates();
  if (!req.headers.get("accept")?.includes("application/x-ndjson")) {
    try { const { usage, ...result } = await askProject(question, { updates: snapshot }); void usage; return Response.json(result); }
    catch (e) { return Response.json({ error: (e as Error).message }, { status: 500 }); }
  }
  let closed = false;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => { if (!closed) { try { controller.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { closed = true; } } };
      try {
        const [srcs, segs] = await Promise.all([allSources(snapshot), allSegments(snapshot)]);
        send({ type: "stage", stage: "read", detail: `${segs.length} passages provenant de ${srcs.filter((s) => !s.parent).length} fichiers` });
        const { usage, ...result } = await askProject(question, { updates: snapshot, onStage: (s) => send({ type: "stage", ...s }) });
        void usage;
        send({ type: "result", ...result });
      } catch (e) {
        send({ type: "error", error: (e as Error).message });
      } finally {
        if (!closed) { closed = true; controller.close(); }
      }
    },
    cancel() { closed = true; },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
