import crypto from "crypto";
import { guard } from "@/lib/access";
import { updateStore, type StoredFile } from "@/lib/updateStore";
import { parseFile } from "@/lib/ingest";
import { llmJSON, llmProvider, visionTranscribe } from "@/lib/llm";
import { askContext } from "@/lib/ask";
import { CITATION_FORMAT, RULES } from "@/lib/prompts";
import { allSegments, kb } from "@/lib/store";
import { applyGuardrails, emptyChangeSet } from "@/lib/update";
import type { ChangeSet, Segment } from "@/lib/types";

const safe = (n: string) => n.replace(/[^\w.\-À-ÿ ]/g, "_");

// Accepts one file or several (form field "file", repeated). The first file is the primary source ("NEW");
// other files, email attachments and .zip entries become "NEW>name" (parsed up to two levels deep).
export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = guard(req, "analyze");
  if (denied) return denied;
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return Response.json({ error: "No file" }, { status: 400 });
  const draftId = crypto.randomUUID().slice(0, 8);
  const stored: StoredFile[] = [];

  const vision = llmProvider() ? visionTranscribe : undefined;
  const segments: Segment[] = [];
  const names: string[] = [];
  let contentDate: string | undefined;
  const ingestOne = async (buf: Buffer, name: string, src: string, depth: number) => {
    const p = await parseFile(buf, name, { vision });
    if (src === "NEW") contentDate = p.contentDate;
    segments.push(...p.segments.map((s) => ({ src, ...s })));
    if (depth < 2) for (const a of p.attachments) await ingestOne(a.content, a.filename, `NEW>${safe(a.filename)}`, depth + 1);
  };
  for (const [i, f] of files.entries()) {
    const name = safe(f.name);
    const buf = Buffer.from(await f.arrayBuffer());
    stored.push({ name, data: buf });
    names.push(name);
    await ingestOne(buf, name, i === 0 ? "NEW" : `NEW>${name}`, 0);
  }
  const filename = names.join(" + ");
  await updateStore().saveDraft(draftId, { filename, files: names, contentDate, segments }, stored);

  if (!llmProvider()) {
    const cs = emptyChangeSet(filename);
    cs.guardrails.notes.push("No LLM key configured: fill the three columns by hand (manual mode). The file was parsed and is citable as NEW.");
    return Response.json({ draftId, segments, changeset: cs });
  }

  const k = kb();
  const system = `You analyze NEW information for project NOVA against the frozen baseline (2026-09-30 09:00).\n${RULES}
Classify the new information exactly as the jury expects:
- problemStatus: changes in the state of a problem (ticket reopened/closed, failed retest, new defect), citing the NEW file.
- priorDecisions: earlier decisions that REMAIN IN FORCE unless the NEW file quotes the proper authority (steering committee / project manager) changing them.
- newProposals: suggestions such as a new date, with the proposer. A proposal is NOT approved unless an approval is quoted.
- newDecisions: ONLY if the NEW file quotes the proper authority deciding. Otherwise leave empty.
- conditionChanges: go-live conditions are 1 = SEC-210 security validation (validating owner Sophie Lambert), 2 = ACC-303 closure (Mélissa Gagnon), 3 = runbook approval incl. rollback (Olivier Côté). Mark "met" ONLY if the NEW file quotes that owner closing/validating it. Never close other conditions.
- affected: answer ids Q01-Q10, condition ids 1-3, action ids A1-A12 that this changes.
- newActions: owner (ownerStatus confirmed|proposed), type COMMITMENT (documented) or RECOMMENDATION (yours), due date only if stated else "TBC".
- revisedAnswers: for EACH affected answer id, the full updated answer in English (same precision as the baseline answer:
  dates, owners, amounts, proposal vs decision, delivery vs validation), stating what changed. Keep what is still true.
- revisedBrief: for each brief theme whose content changes (themes: ${k.brief.sections.map((x) => `"${x.theme}"`).join(", ")}),
  the full updated text (1-3 sentences, English). Do not include unchanged themes.
Never present a proposal as approved, and never close a condition, in revisedAnswers or revisedBrief either.
Citations: {"src", "loc", "quote"}. New file ids start with NEW (e.g. [[NEW#body:P2]] → "src": "NEW", "loc": "body:P2").
${CITATION_FORMAT}
Return JSON only: {"summary": string (1-2 sentences, English), "problemStatus": [{"text","citations"}], "priorDecisions": [{"text","citations"}],
"newProposals": [{"text","proposer","citations"}], "newDecisions": [{"text","authority","citations"}],
"conditionChanges": [{"id","status","text","citations"}], "affected": {"answers": [], "conditions": [], "actions": []},
"newActions": [{"title","owner","ownerStatus","type","due","citations"}],
"revisedAnswers": [{"id","text","citations"}], "revisedBrief": [{"theme","text","citations"}]}`;
  const baselineAnswers = `BASELINE ANSWERS AND BRIEF (to revise if affected):\n${JSON.stringify({ answers: k.answers.map((a) => ({ id: a.id, question: a.question_en, answer: a.answer_en })), brief: k.brief.sections.map((x) => ({ theme: x.theme, text: x.text })) })}`;
  const user = `${baselineAnswers}\n\nNEW INFORMATION "${filename}":\n${segments.map((s) => `[[${s.src}#${s.loc}]] ${s.text}`).join("\n")}`;
  try {
    const raw = (await llmJSON({ task: "update", system, context: await askContext(), user, maxTokens: 32000 })) as Partial<ChangeSet>;
    const cs = applyGuardrails({ ...emptyChangeSet(filename), ...raw } as ChangeSet, await allSegments(), segments);
    return Response.json({ draftId, segments, changeset: cs });
  } catch (e) {
    const cs = emptyChangeSet(filename);
    cs.guardrails.notes.push(`Analysis failed (${(e as Error).message}). Fill the columns by hand.`);
    return Response.json({ draftId, segments, changeset: cs });
  }
}
