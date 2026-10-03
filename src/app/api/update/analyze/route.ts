import fs from "fs";
import path from "path";
import crypto from "crypto";
import { parseFile } from "@/lib/ingest";
import { llmJSON, llmProvider, visionTranscribe } from "@/lib/llm";
import { CITATION_FORMAT, corpusContext, kbContext, RULES } from "@/lib/prompts";
import { allSegments, ROOT } from "@/lib/store";
import { applyGuardrails, emptyChangeSet } from "@/lib/update";
import type { ChangeSet, Segment } from "@/lib/types";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });
  const filename = file.name.replace(/[^\w.\-À-ÿ ]/g, "_");
  const buf = Buffer.from(await file.arrayBuffer());
  const draftId = crypto.randomUUID().slice(0, 8);
  const dir = path.join(ROOT, "data", "updates", "_pending", draftId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buf);

  const vision = llmProvider() ? visionTranscribe : undefined;
  const parsed = await parseFile(buf, filename, { vision });
  const segments: Segment[] = parsed.segments.map((s) => ({ src: "NEW", ...s }));
  for (const a of parsed.attachments) {
    const p = await parseFile(a.content, a.filename, { vision });
    segments.push(...p.segments.map((s) => ({ src: `NEW>${a.filename}`, ...s })));
  }
  const draft = { filename, kind: parsed.kind, contentDate: parsed.contentDate, attachments: parsed.attachments.map((a) => a.filename), segments };
  fs.writeFileSync(path.join(dir, "draft.json"), JSON.stringify(draft, null, 1));

  if (!llmProvider()) {
    const cs = emptyChangeSet(filename);
    cs.guardrails.notes.push("No LLM key configured: fill the three columns by hand (manual mode). The file was parsed and is citable as NEW.");
    return Response.json({ draftId, segments, changeset: cs });
  }

  const system = `You analyze NEW information for project NOVA against the frozen baseline (2026-09-30 09:00).\n${RULES}
Classify the new information exactly as the jury expects:
- problemStatus: changes in the state of a problem (ticket reopened/closed, failed retest, new defect), citing the NEW file.
- priorDecisions: earlier decisions that REMAIN IN FORCE unless the NEW file quotes the proper authority (steering committee / project manager) changing them.
- newProposals: suggestions such as a new date, with the proposer. A proposal is NOT approved unless an approval is quoted.
- newDecisions: ONLY if the NEW file quotes the proper authority deciding. Otherwise leave empty.
- conditionChanges: go-live conditions are 1 = SEC-210 security validation (validating owner Sophie Lambert), 2 = ACC-303 closure (Mélissa Gagnon), 3 = runbook approval incl. rollback (Olivier Côté). Mark "met" ONLY if the NEW file quotes that owner closing/validating it. Never close other conditions.
- affected: answer ids Q01-Q10, condition ids 1-3, action ids A1-A12 that this changes.
- newActions: owner (ownerStatus confirmed|proposed), type COMMITMENT (documented) or RECOMMENDATION (yours), due date only if stated else "TBC".
Citations: {"src", "loc", "quote"}. New file ids start with NEW (e.g. [[NEW#body:P2]] → "src": "NEW", "loc": "body:P2").
${CITATION_FORMAT}
Return JSON only: {"summary": string (1-2 sentences, English), "problemStatus": [{"text","citations"}], "priorDecisions": [{"text","citations"}],
"newProposals": [{"text","proposer","citations"}], "newDecisions": [{"text","authority","citations"}],
"conditionChanges": [{"id","status","text","citations"}], "affected": {"answers": [], "conditions": [], "actions": []},
"newActions": [{"title","owner","ownerStatus","type","due","citations"}]}`;
  const context = `KNOWLEDGE BASE (curated, verified):\n${kbContext()}\n\nCORPUS SEGMENTS:\n${corpusContext()}`;
  const user = `NEW FILE "${filename}":\n${segments.map((s) => `[[${s.src}#${s.loc}]] ${s.text}`).join("\n")}`;
  try {
    const raw = (await llmJSON({ task: "update", system, context, user })) as Partial<ChangeSet>;
    const cs = applyGuardrails({ ...emptyChangeSet(filename), ...raw } as ChangeSet, allSegments(), segments);
    return Response.json({ draftId, segments, changeset: cs });
  } catch (e) {
    const cs = emptyChangeSet(filename);
    cs.guardrails.notes.push(`Analysis failed (${(e as Error).message}). Fill the columns by hand.`);
    return Response.json({ draftId, segments, changeset: cs });
  }
}
