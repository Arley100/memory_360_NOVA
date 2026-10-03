// Evaluation: npm run eval --model=claude-opus-5-5 --effort=low --only=Q01,T03 --concurrency=3   (works in PowerShell too)
// Runs the exact pipeline the app uses (src/lib/ask.ts) on data/eval/questions.json and checks each answer for
// required facts, forbidden claims and verified citations. Saves a report in data/eval/results/.
import fs from "fs";
import path from "path";
import { loadEnv } from "./env";

loadEnv();

interface Q { id: string; category: string; question: string; mustInclude: string[]; mustNotInclude: string[]; expectNotDocumented: boolean; why?: string }

// List prices per million tokens (USD), used only to estimate the cost of a run.
const PRICE: Record<string, { in: number; out: number; read: number; write: number }> = {
  "claude-sonnet-5-5": { in: 2, out: 10, read: 0.2, write: 2.5 },
  "claude-opus-5-5": { in: 4, out: 20, read: 0.2, write: 5 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5, read: 0.1, write: 1.25 },
  "claude-fable-5-1": { in: 10, out: 50, read: 0.25, write: 12.5 },
};

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? process.env[`npm_config_${name}`] ?? process.env[`EVAL_${name.toUpperCase()}`];
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2019\u2018]/g, "'").replace(/[\s\u00A0\u202F]+/g, " ").toLowerCase();

async function main() {
  const { askProject } = await import("../src/lib/ask");
  const { llmProvider, modelFor, effortFor } = await import("../src/lib/llm");
  if (!llmProvider()) { console.log("No API key in .env.local: cannot run the evaluation."); process.exitCode = 1; return; }
  const model = arg("model") || modelFor("ask");
  const effort = arg("effort") || effortFor("ask");
  const only = arg("only")?.split(",");
  const concurrency = Number(arg("concurrency") || 3);
  const all: Q[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/eval/questions.json"), "utf8"));
  const qs = only ? all.filter((q) => only.includes(q.id)) : all;
  console.log(`\nEvaluating ${qs.length} questions · model ${model} · effort ${effort} · ${concurrency} in parallel\n`);

  const results: Record<string, unknown>[] = [];
  let cost = 0;
  const queue = [...qs];
  async function worker() {
    for (let q = queue.shift(); q; q = queue.shift()) {
      const t0 = Date.now();
      try {
        const r = await askProject(q.question, { model, effort });
        const text = fold([r.answer, ...r.missing].join(" \n "));
        const missingFacts = q.mustInclude.filter((p) => !new RegExp(p, "i").test(text));
        const forbidden = q.mustNotInclude.filter((p) => new RegExp(p, "i").test(text));
        const needsCite = !q.expectNotDocumented;
        const citeOk = !needsCite || r.citations.length > 0;
        const pass = missingFacts.length === 0 && forbidden.length === 0 && citeOk;
        const u = r.usage;
        const p = PRICE[model];
        if (u && p) cost += (u.input * p.in + u.output * p.out + u.cacheRead * p.read + u.cacheWrite * p.write) / 1e6;
        results.push({ id: q.id, category: q.category, pass, ms: Date.now() - t0, verified: r.citations.length, dropped: r.dropped,
          missingFacts, forbidden, citeOk, question: q.question, answer: r.answer, missing: r.missing, citations: r.citations.map((c) => `${c.label} « ${c.quote} »`) });
        console.log(`${pass ? "PASS" : "FAIL"}  ${q.id.padEnd(4)} ${String(Date.now() - t0).padStart(6)} ms  citations ${r.citations.length}/${r.citations.length + r.dropped}${pass ? "" : `  ← ${[
          missingFacts.length ? `missing: ${missingFacts.join(" ; ")}` : "", forbidden.length ? `forbidden: ${forbidden.join(" ; ")}` : "", citeOk ? "" : "no verified citation"].filter(Boolean).join(" | ")}`}`);
      } catch (e) {
        results.push({ id: q.id, category: q.category, pass: false, error: (e as Error).message });
        console.log(`ERR   ${q.id.padEnd(4)} ${(e as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, qs.length) }, worker));

  results.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const passed = results.filter((r) => r.pass).length;
  const byCat = Array.from(new Set(qs.map((q) => q.category))).map((c) => {
    const rs = results.filter((r) => r.category === c);
    return `${c} ${rs.filter((r) => r.pass).length}/${rs.length}`;
  });
  const times = results.map((r) => Number(r.ms)).filter(Boolean).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : 0;
  const cites = results.reduce((n, r) => n + Number(r.verified ?? 0), 0);
  const dropped = results.reduce((n, r) => n + Number(r.dropped ?? 0), 0);
  console.log(`\nScore ${passed}/${results.length} · ${byCat.join(" · ")}`);
  console.log(`Median answer time ${(median / 1000).toFixed(1)} s · citations verified ${cites}/${cites + dropped} · estimated cost $${cost.toFixed(2)}`);

  const dir = path.join(process.cwd(), "data/eval/results");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}_${model}_${effort}.json`);
  fs.writeFileSync(file, JSON.stringify({ model, effort, score: `${passed}/${results.length}`, byCategory: byCat, medianMs: median, citations: { verified: cites, dropped }, estimatedCostUSD: +cost.toFixed(3), results }, null, 1));
  console.log(`Report: ${path.relative(process.cwd(), file)}  (open it to read every answer and its citations)\n`);
  if (passed < results.length) process.exitCode = 1;
}
main();
