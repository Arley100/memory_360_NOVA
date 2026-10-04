// Live provider rehearsal. Uses the configured ask model; does not publish updates or alter baseline.
import { loadEnv } from "./env";
import { chatProject } from "../src/lib/chat";
import { updates } from "../src/lib/store";
import { llmProvider } from "../src/lib/llm";
import type { ChatAnswer } from "../src/lib/chatTypes";
import fs from "node:fs/promises";
import path from "node:path";

const questions = ["What currently blocks go-live?", "Is security accepted?", "Why was October 22 approved?", "Is mobile work approved?", "What is the authorized budget and how much has been paid?", "Which documents contradict each other about launch date?", "What changed since the baseline?", "What should I do next?", "Who owns the security validation and when is it due?", "La sécurité a-t-elle été officiellement acceptée?"];
async function main() {
  loadEnv();
  if (!llmProvider()) throw new Error("No answering provider configured.");
  const snapshot = await updates();
  const results: { question: string; answer?: ChatAnswer; error?: string }[] = [];
  const queue = [...questions];
  await Promise.all(Array.from({ length: 2 }, async () => {
    for (let question = queue.shift(); question; question = queue.shift()) {
      try {
        const answer = await chatProject(question, "current", [], { snapshot });
        results.push({ question, answer });
        console.log(JSON.stringify({ question, evidence: answer.evidenceStatus, citations: answer.citations.length, unsupported: answer.blocks.filter((b) => b.evidence === "unsupported").length, text: answer.blocks.map((b) => b.text).join("\n") }));
      } catch (e) { results.push({ question, error: (e as Error).message }); console.log(JSON.stringify({ question, error: (e as Error).message.slice(0, 300) })); }
    }
  }));
  const previous = results.find((r) => r.question === questions[2])?.answer;
  for (const mode of ["current", "baseline"] as const) {
    const question = mode === "current" ? "Who approved that?" : "Is security accepted?";
    try {
      const history = mode === "current" && previous ? [{ role: "user" as const, text: questions[2] }, { role: "assistant" as const, text: previous.blocks.map((b) => b.text).join("\n") }] : [];
      const answer = await chatProject(question, mode, history, { snapshot }); results.push({ question, answer });
      console.log(JSON.stringify({ question, context: answer.context.contextKey, evidence: answer.evidenceStatus, citations: answer.citations.length, text: answer.blocks.map((b) => b.text).join("\n") }));
    } catch (e) { results.push({ question, error: (e as Error).message }); console.log(JSON.stringify({ question, error: (e as Error).message.slice(0, 300) })); }
  }
  const report = path.join(process.cwd(), ".next", "chat-rehearsal.json");
  await fs.mkdir(path.dirname(report), { recursive: true }); await fs.writeFile(report, JSON.stringify(results, null, 2));
  console.log(`Live rehearsal: ${results.filter((r) => r.answer).length}/${results.length} completed. Report: .next/chat-rehearsal.json`);
  if (results.some((r) => r.error)) process.exitCode = 1;
}
main().catch((e) => { console.error((e as Error).message); process.exitCode = 1; });
