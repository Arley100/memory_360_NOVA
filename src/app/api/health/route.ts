import { effortFor, llmProvider, modelFor } from "@/lib/llm";

// Reports configuration only (never the key). Use `npm run check` to test connectivity.
export async function GET() {
  const provider = llmProvider();
  return Response.json({
    ok: true, llmConfigured: Boolean(provider), provider,
    models: provider ? { ask: modelFor("ask"), update: modelFor("update"), vision: modelFor("vision") } : null,
    effort: provider ? { ask: effortFor("ask"), update: effortFor("update"), vision: effortFor("vision") } : null,
  });
}
