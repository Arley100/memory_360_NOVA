import { guard } from "@/lib/access";
import { chatProject, parseChatRequest } from "@/lib/chat";
import { llmProvider } from "@/lib/llm";
import { allSegments, allSources, updates } from "@/lib/store";
export const maxDuration = 120;

// Limit bytes while reading, including requests without a Content-Length header.
async function body(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  const decoder = new TextDecoder(); let size = 0, text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 100_000) throw new Error("Conversation payload is too large.");
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export async function POST(req: Request) {
  const denied = guard(req, "ask"); if (denied) return denied;
  let input;
  try { input = parseChatRequest(await body(req)); }
  catch (e) { return Response.json({ error: e instanceof SyntaxError ? "Invalid JSON request." : (e as Error).message }, { status: 400 }); }
  if (!llmProvider()) return Response.json({ error: "AI answering is not configured. Project evidence remains available elsewhere in Mémoire 360." }, { status: 503 });
  const snapshot = input.mode === "baseline" ? [] : await updates();
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, 110_000);
  const abort = () => ctrl.abort();
  req.signal.addEventListener("abort", abort, { once: true });
  if (req.signal.aborted) ctrl.abort();
  let closed = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (v: unknown) => { if (!closed) try { controller.enqueue(encoder.encode(JSON.stringify(v) + "\n")); } catch { closed = true; ctrl.abort(); } };
      try {
        const [sources, segments] = await Promise.all([allSources(snapshot), allSegments(snapshot)]);
        send({ type: "stage", stage: "read", detail: `${segments.length} passages from ${sources.filter((s) => !s.parent).length} files` });
        const answer = await chatProject(input.question, input.mode, input.history, { snapshot, signal: ctrl.signal, onStage: (stage) => send({ type: "stage", stage }) });
        send({ type: "result", answer });
      } catch { send({ type: "error", error: !timedOut && ctrl.signal.aborted ? "Generation stopped." : "Unable to answer right now. The provider timed out or returned an invalid response. Please retry." }); }
      finally { clearTimeout(timer); req.signal.removeEventListener("abort", abort); if (!closed) { closed = true; controller.close(); } }
    },
    cancel() { closed = true; ctrl.abort(); clearTimeout(timer); req.signal.removeEventListener("abort", abort); },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
