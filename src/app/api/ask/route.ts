import { askProject } from "@/lib/ask";
import { llmProvider } from "@/lib/llm";

export async function POST(req: Request) {
  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) return Response.json({ error: "Empty question" }, { status: 400 });
  if (!llmProvider()) {
    return Response.json({ error: "No LLM key configured. Add ANTHROPIC_API_KEY (or OPENAI_API_KEY + LLM_MODEL) to .env.local. All other pages and evidence work without it." }, { status: 503 });
  }
  try {
    const { usage, ...result } = await askProject(question);
    void usage;
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
