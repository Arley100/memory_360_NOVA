// Build the knowledge base from the raw corpus: npm run analyze
// Writes data/generated/kb.json (commit it so every deployment starts from an AI-generated knowledge base).
import { loadEnv } from "./env";
loadEnv();

async function main() {
  const { runAnalysis } = await import("../src/lib/analyze");
  const { llmProvider } = await import("../src/lib/llm");
  const { updateStore } = await import("../src/lib/updateStore");
  if (!llmProvider()) { console.log("No API key in .env.local."); process.exitCode = 1; return; }
  console.log("\nBuilding the knowledge base from the raw files…\n");
  const t0 = Date.now();
  const kb = await runAnalysis((p) => {
    const count = p.total ? ` (${p.done}/${p.total})` : "";
    if (p.status === "done") console.log(`  \u2713 ${p.label}${p.detail ? ` · ${p.detail}` : ""}`);
    else if (p.status === "error") console.log(`  \u2717 ${p.label}: ${p.detail}`);
    else if (p.total) process.stdout.write(`\r  … ${p.label}${count}   `);
  });
  await updateStore().saveKB(kb);
  const m = kb.meta!;
  console.log(`\nDone in ${Math.round((Date.now() - t0) / 1000)} s · ${m.citations?.verified} citations verified, ${m.citations?.dropped} removed · answer key ${m.answerKey?.score ?? "n/a"}`);
  m.answerKey?.details.filter((d) => !d.pass).forEach((d) => console.log(`  ${d.id} misses: ${d.missing.join(" ; ")}`));
  console.log(updateStore().kind === "file" ? "Saved to data/generated/kb.json\n" : "Saved to the hosted store\n");
}
main();
