// Scores generated answers against the hand-curated answer key (data/eval/questions.json, "readme" questions):
// each answer must contain the required facts and none of the forbidden claims.
import fs from "fs";
import path from "path";

interface KeyQ { id: string; category: string; mustInclude: string[]; mustNotInclude: string[] }
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2019\u2018]/g, "'").replace(/[\s\u00A0\u202F]+/g, " ").toLowerCase();

export function scoreAgainstKey(answers: { id: string; answer_en: string; answer_fr?: string }[]) {
  const p = path.join(process.cwd(), "data", "eval", "questions.json");
  if (!fs.existsSync(p)) return undefined;
  const key = (JSON.parse(fs.readFileSync(p, "utf8")) as KeyQ[]).filter((q) => q.category === "readme");
  const details = key.map((q) => {
    const a = answers.find((x) => x.id === q.id);
    const text = fold(`${a?.answer_en ?? ""} ${a?.answer_fr ?? ""}`);
    const missing = a ? q.mustInclude.filter((r) => !new RegExp(r, "i").test(text)) : ["aucune réponse"];
    const forbidden = q.mustNotInclude.filter((r) => new RegExp(r, "i").test(text));
    return { id: q.id, pass: Boolean(a) && missing.length === 0 && forbidden.length === 0, missing: [...missing, ...forbidden.map((f) => `affirmation interdite : ${f}`)] };
  });
  return { score: `${details.filter((d) => d.pass).length}/${details.length}`, details };
}
