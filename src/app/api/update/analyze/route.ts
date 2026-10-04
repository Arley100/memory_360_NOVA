import crypto from "crypto";
import { guard } from "@/lib/access";
import { updateStore, type StoredFile } from "@/lib/updateStore";
import { parseFile } from "@/lib/ingest";
import { llmJSON, llmProvider, modelFor, visionTranscribe } from "@/lib/llm";
import { askContext } from "@/lib/ask";
import { CITATION_FORMAT, RULES } from "@/lib/prompts";
import { allSegments, getKB } from "@/lib/store";
import { applyGuardrails, emptyChangeSet } from "@/lib/update";
import type { ChangeSet, Segment } from "@/lib/types";

const safe = (n: string) => n.replace(/[^\w.\-À-ÿ ]/g, "_");

// Accepts one file or several (form field "file", repeated). The first file is the primary source ("NEW");
// other files, email attachments and .zip entries become "NEW>name" (parsed up to two levels deep).
export const maxDuration = 300;

const SYSTEM = (condList: string, themes: string) => `You analyze NEW information for project NOVA against the frozen baseline (2026-09-30 09:00).\n${RULES}
Classify the new information exactly as the jury expects:
- problemStatus: changes in the state of a problem (ticket reopened/closed, failed retest, new defect), citing the NEW file.
- priorDecisions: earlier decisions that REMAIN IN FORCE unless the NEW file quotes the proper authority (steering committee / project manager) changing them.
- newProposals: suggestions such as a new date, with the proposer. A proposal is NOT approved unless an approval is quoted.
- newDecisions: ONLY if the NEW file quotes the proper authority deciding. Otherwise leave empty.
- conditionChanges: the go-live conditions are ${condList}. Mark "met" ONLY if the NEW file quotes that validating owner closing/validating it. Never close other conditions.
- affected: answer ids Q01-Q10, condition ids 1-3, action ids A1-A12 that this changes.
- newActions: owner (ownerStatus confirmed|proposed), type COMMITMENT (documented) or RECOMMENDATION (yours), due date only if stated else "TBC".
- revisedAnswers: for EACH affected answer id, the full updated answer in English (same precision as the baseline answer:
  dates, owners, amounts, proposal vs decision, delivery vs validation), stating what changed. Keep what is still true.
- revisedBrief: for each brief theme whose content changes (themes: ${themes}),
  the full updated text (1-3 sentences, English). Do not include unchanged themes.
Never present a proposal as approved, and never close a condition, in revisedAnswers or revisedBrief either.
Plain text only in every text field: no Markdown, no asterisks, no bullet symbols.
Citations: {"src", "loc", "quote"}. New file ids start with NEW (e.g. [[NEW#body:P2]] → "src": "NEW", "loc": "body:P2").
${CITATION_FORMAT}
Return JSON only: {"summary": string (1-2 sentences, English), "problemStatus": [{"text","citations"}], "priorDecisions": [{"text","citations"}],
"newProposals": [{"text","proposer","citations"}], "newDecisions": [{"text","authority","citations"}],
"conditionChanges": [{"id","status","text","citations"}], "affected": {"answers": [], "conditions": [], "actions": []},
"newActions": [{"title","owner","ownerStatus","type","due","citations"}],
"revisedAnswers": [{"id","text","citations"}], "revisedBrief": [{"theme","text","citations"}]}`;

export async function POST(req: Request) {
  const denied = guard(req, "analyze");
  if (denied) return denied;
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return Response.json({ error: "No file" }, { status: 400 });
  const inputs = await Promise.all(files.map(async (f) => ({ name: safe(f.name), buf: Buffer.from(await f.arrayBuffer()) })));

  // Streams newline-delimited JSON: {"type":"stage",stage,status,detail} while working, then {"type":"result",...}.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const stage = (stage: string, status: "start" | "done", detail?: string) => send({ type: "stage", stage, status, detail });
      const ping = setInterval(() => send({ type: "ping" }), 10_000);
      try {
        stage("read", "start");
        const draftId = crypto.randomUUID().slice(0, 8);
        const stored: StoredFile[] = [];
        const vision = llmProvider() ? visionTranscribe : undefined;
        const segments: Segment[] = [];
        const names: string[] = [];
        let contentDate: string | undefined;
        const ingestOne = async (buf: Buffer, name: string, src: string, depth: number) => {
          const p = await parseFile(buf, name, { vision });
          if (src === "NEW") contentDate = p.contentDate;
          segments.push(...p.segments.map((x) => ({ src, ...x })));
          if (depth < 2) for (const a of p.attachments) await ingestOne(a.content, a.filename, `NEW>${safe(a.filename)}`, depth + 1);
        };
        for (const [i, f] of inputs.entries()) {
          stored.push({ name: f.name, data: f.buf });
          names.push(f.name);
          await ingestOne(f.buf, f.name, i === 0 ? "NEW" : `NEW>${f.name}`, 0);
        }
        const filename = names.join(" + ");
        await updateStore().saveDraft(draftId, { filename, files: names, contentDate, segments }, stored);
        stage("read", "done", `${names.length} file(s) · ${segments.length} passages read`);

        if (!llmProvider()) {
          const cs = emptyChangeSet(filename);
          cs.guardrails.notes.push("No LLM key configured: fill the three columns by hand (manual mode). The file was parsed and is citable as NEW.");
          send({ type: "result", draftId, segments, changeset: cs });
          return;
        }

        const k = await getKB();
        const condList = k.conditions.map((c) => `${c.id} = ${c.title} (validating owner: ${c.owner})`).join("; ");
        const system = SYSTEM(condList, k.brief.sections.map((x) => `"${x.theme}"`).join(", "));
        const baselineAnswers = `BASELINE ANSWERS AND BRIEF (to revise if affected):\n${JSON.stringify({ answers: k.answers.map((a) => ({ id: a.id, question: a.question_en, answer: a.answer_en })), brief: k.brief.sections.map((x) => ({ theme: x.theme, text: x.text })) })}`;
        const user = `${baselineAnswers}\n\nNEW INFORMATION "${filename}":\n${segments.map((x) => `[[${x.src}#${x.loc}]] ${x.text}`).join("\n")}`;
        stage("compare", "start", `with ${modelFor("update")}`);
        let cs: ChangeSet;
        try {
          const raw = (await llmJSON({ task: "update", system, context: await askContext(), user, maxTokens: 32000 })) as Partial<ChangeSet>;
          stage("compare", "done", `${(raw.problemStatus ?? []).length} problem change(s) · ${(raw.newProposals ?? []).length} proposal(s) · ${(raw.revisedAnswers ?? []).length} answer(s) to revise`);
          stage("guard", "start");
          cs = applyGuardrails({ ...emptyChangeSet(filename), ...raw } as ChangeSet, await allSegments(), segments,
            { conditions: k.conditions, goLive: { date: k.goLive.date, headline: k.goLive.headline, citations: k.goLive.citations }, contractEnd: k.goLive.contractEnd });
          const flagged = cs.guardrails.notes.length;
          stage("guard", "done", flagged ? `${flagged} point(s) flagged for your review` : "nothing to flag");
        } catch (e) {
          cs = emptyChangeSet(filename);
          cs.guardrails.notes.push(`Analysis failed (${(e as Error).message}). Fill the columns by hand.`);
          stage("compare", "done", "analysis failed: manual mode");
        }
        send({ type: "result", draftId, segments, changeset: cs });
      } catch (e) {
        send({ type: "error", error: (e as Error).message });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
