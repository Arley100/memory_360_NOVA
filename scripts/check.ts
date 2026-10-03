// Preflight before a demo: npm run check
// Verifies the key, pings each configured model, warms the prompt cache with one real question,
// and verifies that the answer's citations exist in the corpus. Never prints the key.
import fs from "fs";
import path from "path";

// Load .env.local / .env (scripts don't get Next.js env loading).
for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && m[2] && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const ok = (s: string) => console.log(`  \u2713 ${s}`);
const bad = (s: string) => { console.log(`  \u2717 ${s}`); process.exitCode = 1; };

async function main() {
  const { llmProvider, modelFor, effortFor, llmJSON, lastUsage } = await import("../src/lib/llm");
  console.log("\nMémoire 360 preflight\n");
  const provider = llmProvider();
  if (!provider) { bad("No API key found in .env.local (ANTHROPIC_API_KEY or OPENAI_API_KEY). The app still works in evidence-only mode."); return; }
  const key = provider === "anthropic" ? process.env.ANTHROPIC_API_KEY! : process.env.OPENAI_API_KEY!;
  ok(`Provider: ${provider} · key loaded (${key.slice(0, 7)}…, ${key.length} chars, value hidden)`);
  if (/\s/.test(key)) bad("The key contains spaces or quotes: re-paste it with nothing around it.");

  for (const task of ["ask", "update", "vision"] as const) {
    const t0 = Date.now();
    try {
      const out = (await llmJSON({ task, system: "Reply with JSON only.", user: 'Return exactly {"ok": true}', maxTokens: 2000 })) as { ok?: boolean };
      if (out.ok) ok(`${task.padEnd(6)} → ${modelFor(task)} (effort ${effortFor(task)}) answered in ${Date.now() - t0} ms`);
      else bad(`${task} → ${modelFor(task)} returned unexpected output`);
    } catch (e) { bad(`${task} → ${modelFor(task)}: ${(e as Error).message}`); }
  }

  console.log("\nWarming the cache with a real question…");
  const { corpusContext, kbContext, RULES, CITATION_FORMAT } = await import("../src/lib/prompts");
  const { resolver } = await import("../src/lib/store");
  const context = `KNOWLEDGE BASE (curated, verified):\n${kbContext()}\n\nCORPUS SEGMENTS:\n${corpusContext()}`;
  const system = `You are Mémoire 360.\n${RULES}\nAnswer ONLY from the context.\n${CITATION_FORMAT}\nReturn JSON: {"answer": string, "citations": [{"src": string, "loc": string, "quote": string}]}`;
  for (const round of [1, 2]) {
    try {
      const out = (await llmJSON({ task: "ask", system, context, user: "QUESTION: Quelle est la date de mise en production actuellement approuvée, et avec quelle réserve?" })) as { answer: string; citations?: { src: string; quote: string }[] };
      const r = resolver();
      const cites = (out.citations ?? []).map(r);
      const v = cites.filter((c) => c.verified).length;
      const u = (await import("../src/lib/llm")).lastUsage ?? lastUsage;
      ok(`Round ${round}: ${u?.ms} ms · cache write ${u?.cacheWrite} · cache read ${u?.cacheRead} tokens · ${v}/${cites.length} citations verified`);
      if (round === 1) console.log(`    "${out.answer.slice(0, 160)}…"`);
      if (v < cites.length) {
        console.log("    Rejected citations (quote not found in the cited file):");
        cites.filter((c) => !c.verified).slice(0, 3).forEach((c) => console.log(`      - ${JSON.stringify({ src: c.src, quote: c.quote })}`));
      }
      if (cites.length && v / cites.length < 0.8) bad(`Only ${v}/${cites.length} citations verified.`);
      if (!/22/.test(out.answer)) bad("The answer does not mention Oct 22: check the model output.");
    } catch (e) { bad(`Round ${round}: ${(e as Error).message}`); }
  }
  console.log(process.exitCode ? "\nSome checks failed (see above).\n" : "\nAll good: ready to demo. The cache stays warm ~5 min (set LLM_CACHE_TTL=1h on demo day).\n");
}
main();
