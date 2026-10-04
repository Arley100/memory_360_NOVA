import crypto from "crypto";
import { guard } from "@/lib/access";
import { updateStore, type StoredFile } from "@/lib/updateStore";
import { parseFile } from "@/lib/ingest";
import { sha256 } from "@/lib/hash";
import { llmJSON, llmProvider, modelFor, visionTranscribe } from "@/lib/llm";
import { askContext } from "@/lib/ask";
import { CITATION_FORMAT, RULES } from "@/lib/prompts";
import { allSegments, getKB, updates } from "@/lib/store";
import { applyGuardrails, emptyChangeSet } from "@/lib/update";
import type { ChangeSet, Segment } from "@/lib/types";

const safe = (n: string) => n.replace(/[^\w.\-À-ÿ ]/g, "_");

// Accepts one file or several (form field "file", repeated). The first file is the primary source ("NEW");
// other files, email attachments and .zip entries become "NEW>name" (parsed up to two levels deep).
export const maxDuration = 300;

const SYSTEM = (condList: string, themes: string) => `Tu analyses les NOUVELLES informations du projet NOVA par rapport à la situation de référence figée (2026-09-30 09:00).\n${RULES}
Classe les nouvelles informations selon les attentes du jury :
- problemStatus : changements de l’état d’un problème (billet rouvert ou fermé, reprise d’essai en échec, nouvelle anomalie), avec citation du NOUVEAU fichier.
- priorDecisions : décisions antérieures qui RESTENT EN VIGUEUR, sauf si le NOUVEAU fichier cite leur modification par l’autorité compétente (comité de pilotage / responsable du projet).
- newProposals : suggestions, par exemple une nouvelle date, avec la personne qui les propose. Une proposition n’est PAS approuvée sans citation d’approbation.
- newDecisions : UNIQUEMENT si le NOUVEAU fichier cite une décision de l’autorité compétente. Sinon, laisse le tableau vide.
- conditionChanges : les conditions de mise en production sont ${condList}. Utilise "met" UNIQUEMENT si le NOUVEAU fichier cite la fermeture ou validation par ce responsable de validation. Ne ferme jamais d’autres conditions.
- affected : identifiants des réponses Q01-Q10, des conditions 1-3 et des actions A1-A12 modifiées.
- newActions : responsable (ownerStatus confirmed|proposed), type COMMITMENT (documenté) ou RECOMMENDATION (ta suggestion), échéance uniquement si indiquée, sinon "À confirmer".
- revisedAnswers : pour CHAQUE réponse concernée, donne la réponse actualisée complète en français, avec la précision de la réponse de référence :
  dates, responsables, montants, proposition ou décision, livraison ou validation. Précise les changements et conserve ce qui reste vrai.
- revisedBrief : pour chaque thème de la fiche dont le contenu change (thèmes : ${themes}),
  donne le texte actualisé complet (1 à 3 phrases en français). N’inclus pas les thèmes inchangés.
Ne présente jamais une proposition comme approuvée et ne ferme jamais une condition sans preuve, y compris dans revisedAnswers et revisedBrief.
Rédige tous les champs textuels en français ; conserve les clés JSON, les valeurs techniques énumérées et les thèmes fournis exactement comme indiqués. Reproduis les citations mot pour mot dans leur langue d’origine. Utilise uniquement du texte brut : sans Markdown, astérisques ni puces.
Citations : {"src", "loc", "quote"}. Les identifiants des nouveaux fichiers commencent par NEW (exemple : [[NEW#body:P2]] → "src": "NEW", "loc": "body:P2").
${CITATION_FORMAT}
Renvoie uniquement du JSON : {"summary": texte en français (1 à 2 phrases), "problemStatus": [{"text","citations"}], "priorDecisions": [{"text","citations"}],
"newProposals": [{"text","proposer","citations"}], "newDecisions": [{"text","authority","citations"}],
"conditionChanges": [{"id","status","text","citations"}], "affected": {"answers": [], "conditions": [], "actions": []},
"newActions": [{"title","owner","ownerStatus","type","due","citations"}],
"revisedAnswers": [{"id","text","citations"}], "revisedBrief": [{"theme","text","citations"}]}`;

export async function POST(req: Request) {
  const denied = guard(req, "analyze");
  if (denied) return denied;
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return Response.json({ error: "Aucun fichier" }, { status: 400 });
  const inputs = await Promise.all(files.map(async (f) => ({ name: safe(f.name), buf: Buffer.from(await f.arrayBuffer()) })));

  // Streams newline-delimited JSON: {"type":"stage",stage,status,detail} while working, then {"type":"result",...}.
  const snapshot = await updates();
  let closed = false;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => { if (!closed) { try { controller.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { closed = true; } } };
      const stage = (stage: string, status: "start" | "done", detail?: string) => send({ type: "stage", stage, status, detail });
      const ping = setInterval(() => send({ type: "ping" }), 10_000);
      try {
        stage("read", "start");
        const draftId = crypto.randomUUID().slice(0, 8);
        const stored: StoredFile[] = [];
        const vision = llmProvider() ? visionTranscribe : undefined;
        const segments: Segment[] = [];
        const sourceHashes: Record<string, string> = {};
        const names: string[] = [];
        let contentDate: string | undefined;
        const ingestOne = async (buf: Buffer, name: string, src: string, depth: number) => {
          sourceHashes[src] = sha256(buf);
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
        await updateStore().saveDraft(draftId, { filename, files: names, contentDate, segments, sourceHashes }, stored);
        stage("read", "done", `${names.length} fichier(s) · ${segments.length} passages lus`);

        if (!llmProvider()) {
          const cs = emptyChangeSet(filename);
          cs.guardrails.notes.push("Aucun fournisseur d’IA configuré : vérifiez les passages extraits et modifiez les textes de statut, de décisions antérieures et de propositions. Vous pouvez publier les sources et ces notes, mais cet éditeur ne permet pas d’ajouter d’impacts structurés, d’actions, de révisions, de décisions formelles ou de citations. Des champs d’impact vides indiquent une absence d’analyse. La transcription de nouvelles images nécessite un fournisseur avec vision.");
          send({ type: "result", draftId, segments, changeset: cs });
          return;
        }

        const k = await getKB();
        const condList = k.conditions.map((c) => `${c.id} = ${c.title} (responsable de validation : ${c.owner})`).join("; ");
        const system = SYSTEM(condList, k.brief.sections.map((x) => `"${x.theme}"`).join(", "));
        const baselineAnswers = `RÉPONSES ET FICHE DE RÉFÉRENCE (à réviser si concernées) :\n${JSON.stringify({ answers: k.answers.map((a) => ({ id: a.id, question: a.question_en, answer: a.answer_en })), brief: k.brief.sections.map((x) => ({ theme: x.theme, text: x.text })) })}`;
        const user = `${baselineAnswers}\n\nNOUVELLES INFORMATIONS "${filename}" :\n${segments.map((x) => `[[${x.src}#${x.loc}]] ${x.text}`).join("\n")}`;
        stage("compare", "start", `avec ${modelFor("update")}`);
        let cs: ChangeSet;
        try {
          const raw = (await llmJSON({ task: "update", system, context: await askContext(undefined, snapshot), user, maxTokens: 32000 })) as Partial<ChangeSet>;
          stage("compare", "done", `${(raw.problemStatus ?? []).length} changement(s) de problème · ${(raw.newProposals ?? []).length} proposition(s) · ${(raw.revisedAnswers ?? []).length} réponse(s) à réviser`);
          stage("guard", "start");
          cs = applyGuardrails({ ...emptyChangeSet(filename), ...raw } as ChangeSet, await allSegments(snapshot), segments,
            { conditions: k.conditions, goLive: { date: k.goLive.date, headline: k.goLive.headline, citations: k.goLive.citations }, contractEnd: k.goLive.contractEnd });
          const flagged = cs.guardrails.notes.length;
          stage("guard", "done", flagged ? `${flagged} point(s) à vérifier` : "rien à signaler");
        } catch (e) {
          cs = emptyChangeSet(filename);
          cs.guardrails.notes.push(`Échec de l’analyse (${(e as Error).message}). Remplissez les colonnes manuellement.`);
          stage("compare", "done", "échec de l’analyse : mode manuel");
        }
        send({ type: "result", draftId, segments, changeset: cs });
      } catch (e) {
        send({ type: "error", error: (e as Error).message });
      } finally {
        clearInterval(ping);
        if (!closed) { closed = true; controller.close(); }
      }
    },
    cancel() { closed = true; },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
