import { askProject } from "@/lib/ask";
import { guard } from "@/lib/access";
import { llmProvider } from "@/lib/llm";
import { allSegments, allSources } from "@/lib/store";

export const maxDuration = 120;

// Streams newline-delimited JSON: {"type":"stage",...} while working, then {"type":"result",...} or {"type":"error",...}.
export async function POST(req: Request) {
  const denied = guard(req, "ask");
  if (denied) return denied;
  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) return Response.json({ error: "Empty question" }, { status: 400 });
  if (!llmProvider()) {
    return Response.json({ error: "No LLM key configured. Add ANTHROPIC_API_KEY (or OPENAI_API_KEY + LLM_MODEL) to .env.local. All other pages and evidence work without it." }, { status: 503 });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        const [srcs, segs] = await Promise.all([allSources(), allSegments()]);
        send({ type: "stage", stage: "read", detail: `${segs.length} passages from ${srcs.filter((s) => !s.parent).length} files` });
        const { usage, ...result } = await askProject(question, { onStage: (s) => send({ type: "stage", ...s }) });
        void usage;
        send({ type: "result", ...result });
      } catch (e) {
        send({ type: "error", error: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
