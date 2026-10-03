// Provider-agnostic LLM adapter. Server-side only; the key never reaches the browser.
// Anthropic:          ANTHROPIC_API_KEY (+ optional LLM_MODEL)
// OpenAI-compatible:  OPENAI_API_KEY + LLM_MODEL (+ optional OPENAI_BASE_URL for Mistral, Groq, local servers...)
import type { Transcription } from "./ingest";

type Img = { data: Buffer; mime: string };

export function llmProvider(): "anthropic" | "openai" | null {
  const forced = process.env.LLM_PROVIDER;
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

function extractJSON(text: string): unknown {
  const t = text.replace(/```json|```/g, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Model did not return JSON");
  return JSON.parse(t.slice(start, end + 1));
}

export async function llmJSON(system: string, user: string, images: Img[] = []): Promise<unknown> {
  const provider = llmProvider();
  if (!provider) throw new Error("No LLM key configured");

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "claude-sonnet-5-5",
        max_tokens: 4000,
        temperature: 0,
        system,
        messages: [{
          role: "user",
          content: [
            ...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mime, data: i.data.toString("base64") } })),
            { type: "text", text: user },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
    return extractJSON(text);
  }

  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            ...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.data.toString("base64")}` } })),
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return extractJSON(data.choices?.[0]?.message?.content ?? "");
}

export async function visionTranscribe(buf: Buffer, mime: string): Promise<Transcription | null> {
  if (!llmProvider()) return null;
  const out = (await llmJSON(
    "You transcribe screenshots from project NOVA exactly. Never infer anything that is not visible. Keep French text verbatim with accents.",
    `Return JSON only: {"header": string (app header line, e.g. version/build/environment), "title": string,
"rows": [string] (each visible row or list item in order; for tables use "a | b | c"; for label/value use "label : value"),
"notes": [string] (annotations, red notes, QA observations, verbatim), "description": string (1-2 neutral sentences in English)}`,
    [{ data: buf, mime }],
  )) as Transcription;
  return { header: out.header, title: out.title, rows: out.rows ?? [], notes: out.notes ?? [], description: out.description };
}
