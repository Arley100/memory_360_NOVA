// Builds the whole knowledge base from the raw corpus with an LLM: answers to the README questions, go-live state,
// conditions, budget, people, timeline, decisions, contradictions, actions and the one-page brief.
// Every citation is checked by the same verifier as the rest of the app; unverifiable ones are dropped.
// The hand-curated knowledge base is only used afterwards, as an answer key, to score the generated answers.
import { llmJSON, modelFor } from "./llm";
import { CITATION_FORMAT, corpusContext, RULES } from "./prompts";
import { readmeQuestions } from "./readme";
import { scoreAgainstKey } from "./answerKey";
import { allSegments, allSources, resolver, type KB } from "./store";
import type { Cite } from "./types";
import { plain, stripQ } from "./text";
import { indexSegments } from "./cite";
import { resolveDecisionEvidence } from "./decisionEvidence";

export type Progress = { stage: string; status: "start" | "done" | "error"; label: string; detail?: string; done?: number; total?: number };

const ANALYST = `Tu es le moteur d’analyse de Mémoire 360. Tu lis chaque fichier du dossier d’un projet et construis sa mémoire
opérationnelle pour la personne qui en reprend la responsabilité. Date de référence du dossier : 2026-09-30 09:00, Montréal, UTC-04:00.\n${RULES}
${CITATION_FORMAT}
Chaque élément produit doit comporter des citations. Rédige tous les champs textuels en français, y compris les champs historiques "question_en" et "answer_en". Conserve les clés JSON et les valeurs techniques énumérées exactement comme indiquées. Reproduis chaque citation mot pour mot dans sa langue d’origine. Utilise uniquement du texte brut (sans Markdown, astérisques ni puces). N’invente jamais de décision, de date, de montant, de responsable ou d’approbation ; écris "À confirmer" ou
"Non documenté" lorsque les fichiers ne précisent rien. Distingue toujours proposition, décision, livraison et validation.
Renvoie uniquement du JSON.`;

const model = () => process.env.LLM_MODEL_ANALYSIS || modelFor("ask");

async function call<T>(task: string, context: string, maxTokens = 16000): Promise<T> {
  return (await llmJSON({ task: "ask", system: ANALYST, context, user: task, model: model(), maxTokens })) as T;
}

export async function runAnalysis(onProgress: (p: Progress) => void = () => {}): Promise<KB> {
  const started = Date.now();
  const step = async <T,>(stage: string, label: string, fn: () => Promise<T>, detail?: (r: T) => string): Promise<T> => {
    onProgress({ stage, status: "start", label });
    try { const r = await fn(); onProgress({ stage, status: "done", label, detail: detail?.(r) }); return r; }
    catch (e) { onProgress({ stage, status: "error", label, detail: (e as Error).message }); throw e; }
  };

  const sources = await allSources([]);
  const segments = await allSegments([]);
  onProgress({ stage: "read", status: "done", label: "Lecture du dossier", detail: `${sources.filter((s) => !s.parent).length} fichiers, ${segments.length} passages` });
  // Rebuild only the frozen dossier. Published updates are overlaid separately by the store.
  const context = `PASSAGES DU CORPUS (fichiers de référence du projet, date de référence 2026-09-30 09:00) :\n${await corpusContext([])}`;
  const questions = readmeQuestions(sources, segments);
  onProgress({ stage: "questions", status: "done", label: "Questions à traiter trouvées", detail: `${questions.length} questions dans le README` });

  // 1. Answers to the README questions (parallel, 4 at a time) + state + history.
  let answered = 0;
  const answerOne = async (q: { id: string; fr: string }) => {
    const out = await call<{ question_en: string; answer_en: string; answer_fr: string; citations: Cite[]; traps: string[] }>(
      `Réponds à cette question du README pour la personne qui reprend le projet : "${q.id}. ${q.fr}"
Sois précis et nuancé : dates, responsables, montants et distinction entre proposition, décision, livraison et validation.
Utilise au moins deux sources distinctes lorsque c’est possible. Énumère les pièges de lecture (documents périmés, doublons, déclarations du fournisseur...).
JSON : {"question_en": texte en français, "answer_en": texte en français (3 à 6 phrases), "answer_fr": texte en français (1 à 2 phrases), "citations": [{"src","loc","quote"}], "traps": [texte en français]}`, context, 8000);
    answered++;
    onProgress({ stage: "answers", status: "start", label: "Réponses aux questions du README", done: answered, total: questions.length });
    return { id: q.id, question_fr: q.fr, ...out };
  };
  const answersP = (async () => {
    onProgress({ stage: "answers", status: "start", label: "Réponses aux questions du README", done: 0, total: questions.length });
    const out: Awaited<ReturnType<typeof answerOne>>[] = [];
    const queue = [...questions];
    await Promise.all(Array.from({ length: 4 }, async () => { for (let q = queue.shift(); q; q = queue.shift()) out.push(await answerOne(q)); }));
    out.sort((a, b) => a.id.localeCompare(b.id));
    onProgress({ stage: "answers", status: "done", label: "Réponses aux questions du README", detail: `${out.length} réponses` });
    return out;
  })();

  const stateP = step("state", "Établissement de l’état actuel, des conditions, du budget et des intervenants", () => call<{
    goLive: KB["goLive"]; conditions: KB["conditions"]; budget: KB["budget"]; people: KB["people"];
  }>(`Détermine l’état actuel du projet à la date de référence.
JSON: {
 "goLive": {"date": "YYYY-MM-DD (cible actuellement approuvée)", "approvedOn": "YYYY-MM-DD", "status": "conditional|confirmed|at risk|unknown",
   "headline": "une phrase : date approuvée, autorité et date d’approbation, personne qui l’a proposée et principale réserve", "citations": [...],
   "contractEnd": "YYYY-MM-DD ou À confirmer", "contractEndNote": "une phrase sur le risque de report", "contractEndCitations": [...]},
 "conditions": [{"id": 1, "title": "titre court", "owner": "responsable de validation (et responsable de livraison)", "status": "open|met", "state": "une ligne sur l’état actuel", "citations": [...]}],
 "budget": {"authorized": number, "components": [{"label": "par exemple : contrat initial / demande de changement approuvée", "amount": number, "citations": [...]}],
   "invoices": [{"id","date","amount": number,"status"}], "paid": number, "invoicedReceived": number, "invoicedValid": number,
   "unapproved": number, "unapprovedLabel": "éléments facturés sans approbation, ou texte vide", "unapprovedCitations": [...], "remaining": number},
 "people": [{"name","role","since","owns"}]
}
Montants en dollars canadiens avant taxes, sous forme de nombres. Distingue autorisé, facturé et payé. Exclus les documents concernant d’autres projets.`, context),
    (r) => `${r.conditions?.length ?? 0} conditions de mise en production · ${r.people?.length ?? 0} intervenants · budget ${r.budget?.authorized ?? "?"} $`);

  const historyP = step("history", "Reconstitution de la chronologie et des décisions", () => call<{ timeline: KB["timeline"]; decisions: KB["decisions"] }>(
    `Reconstitue l’historique du projet jusqu’à la date de référence.
JSON: {"timeline": [{"date": "YYYY-MM-DD", "tag": "PROPOSAL|DECISION|DELIVERY|VALIDATION|ISSUE|FINANCE|ORG|REPORT|STATUS", "title": "titre court", "citations": [...]}] (25 à 35 événements clés, par ordre chronologique),
"decisions": [{"id": "D1", "subject", "proposed": "qui, quand", "decided": "qui, quand", "delivered": "qui, quand ou —", "validated": "qui, quand ou —", "status": "statut court",
"evidence": {"proposed": [...], "decided": [...], "delivered": [...], "validated": [...]}}] (6 à 9 décisions)
Chaque tableau de preuves contient uniquement les citations propres à cette étape, avec src, loc et quote reproduit mot pour mot.
Utilise [] si l’étape n’est pas documentée. Une proposition ne vaut pas approbation ; une livraison ne vaut pas validation.
La facturation ou le paiement ne prouve pas la livraison ou la validation technique. Conserve les propositions historiques à côté des décisions qui les remplacent.`, context),
    (r) => `${r.timeline?.length ?? 0} événements · ${r.decisions?.length ?? 0} décisions`);

  const [answers, state, history] = await Promise.all([answersP, stateP, historyP]);

  // 2. Contradictions and actions (need the conditions found above).
  const issues = await step("issues", "Résolution des contradictions et planification des actions", () => call<{ contradictions: KB["contradictions"]; actions: KB["actions"] }>(
    `Conditions de mise en production relevées : ${JSON.stringify(state.conditions.map((c) => ({ id: c.id, title: c.title, owner: c.owner })))}.
1) Repère les contradictions entre les sources et résous-les selon l’autorité de la source ou la date des faits
   (plans, registres des risques et rapports d’état périmés ; déclarations du fournisseur et validations ; les doublons ne sont pas des confirmations).
2) Énumère les actions à entreprendre : lie chacune à une condition lorsque c’est pertinent ; ownerStatus vaut "confirmed" uniquement si le responsable est nommé dans les fichiers, sinon "proposed" ;
   type vaut "COMMITMENT" pour un engagement documenté, "RECOMMENDATION" pour ta suggestion ; échéance uniquement si elle est indiquée, sinon "À confirmer".
JSON: {"contradictions": [{"id": "C1", "topic", "a": "ce qu’affirme une source", "aCit": [...], "b": "ce qu’affirme l’autre source", "bCit": [...],
 "resolution", "rule": "authority|date|authority+date", "planOrRegister": boolean}] (4-8),
 "actions": [{"id": "A1", "title", "condition": nombre ou null, "owner", "ownerStatus": "confirmed|proposed", "type": "COMMITMENT|RECOMMENDATION", "due", "citations": [...]}] (8 à 12)}`, context),
    (r) => `${r.contradictions?.length ?? 0} contradictions · ${r.actions?.length ?? 0} actions`);

  // 3. The one-page brief, from everything above.
  const brief = await step("brief", "Rédaction de la fiche de passation", () => call<{ sections: KB["brief"]["sections"] }>(
    `Rédige la fiche de passation d’une page demandée par le README, à partir du dossier et de cette analyse :
${JSON.stringify({ goLive: state.goLive, conditions: state.conditions, budget: state.budget, actions: issues.actions.slice(0, 8) })}
JSON: {"sections": [{"theme": "Responsable|Date approuvée et conditions|Périmètre|Budget|Factures|Priorités", "text": "1 à 3 phrases", "citations": [...]}]}
Présente tes suggestions comme des recommandations.`, context, 8000),
    (r) => `${r.sections?.length ?? 0} sections`);

  // 4. Verify every citation (drop the ones whose quote is not in the cited file).
  onProgress({ stage: "verify", status: "start", label: "Vérification de chaque citation dans les fichiers" });
  const r = await resolver([], []);
  let verified = 0, dropped = 0;
  const clean = (cs: Cite[] = []) => cs.map(r).filter((c) => { if (c.verified) verified++; else dropped++; return c.verified; })
    .map(({ src, loc, quote }) => ({ src, loc, quote }));
  const decisionIndex = indexSegments(segments);
  const cleanDecision = (cs: Cite[] = []) => {
    const cites = resolveDecisionEvidence(cs, decisionIndex);
    verified += cites.length;
    dropped += cs.length - cites.length;
    return cites.map(({ src, loc, quote }) => ({ src, loc, quote }));
  };
  const kb: KB = {
    version: "generated",
    asOf: "2026-09-30T09:00:00-04:00",
    goLive: { ...state.goLive, headline: plain(state.goLive.headline), contractEndNote: plain(state.goLive.contractEndNote), citations: clean(state.goLive.citations), contractEndCitations: clean(state.goLive.contractEndCitations) },
    answers: answers.map((a) => ({ id: a.id, question_fr: a.question_fr, question_en: stripQ(plain(a.question_en)), answer_en: plain(a.answer_en), answer_fr: plain(a.answer_fr), citations: clean(a.citations), traps: (a.traps ?? []).map(plain) })),
    conditions: state.conditions.map((c) => ({ ...c, title: plain(c.title), state: plain(c.state), citations: clean(c.citations) })),
    actions: issues.actions.map((a) => ({ ...a, title: plain(a.title), condition: a.condition ?? undefined, citations: clean(a.citations) })),
    contradictions: issues.contradictions.map((c) => ({ ...c, a: plain(c.a), b: plain(c.b), resolution: plain(c.resolution), aCit: clean(c.aCit), bCit: clean(c.bCit) })),
    timeline: history.timeline.map((e) => ({ ...e, title: plain(e.title), citations: clean(e.citations) })).sort((a, b) => a.date.localeCompare(b.date)),
    decisions: history.decisions.map((d) => ({ ...d, evidence: {
      proposed: cleanDecision(d.evidence?.proposed), decided: cleanDecision(d.evidence?.decided),
      delivered: cleanDecision(d.evidence?.delivered), validated: cleanDecision(d.evidence?.validated),
    } })),
    budget: { ...state.budget, components: (state.budget.components ?? []).map((x) => ({ ...x, citations: clean(x.citations) })), unapprovedCitations: clean(state.budget.unapprovedCitations) },
    brief: { asOf: "30 sept. 2026, 9 h (Montréal)", sections: brief.sections.map((s) => ({ ...s, text: plain(s.text), citations: clean(s.citations) })) },
    people: state.people,
  };
  onProgress({ stage: "verify", status: "done", label: "Vérification de chaque citation dans les fichiers", detail: `${verified} vérifiées · ${dropped} retirées` });

  const answerKey = scoreAgainstKey(kb.answers);
  if (answerKey) onProgress({ stage: "key", status: "done", label: "Vérification des faits requis validés par l’équipe", detail: `${answerKey.score} réponses contiennent tous les faits requis` });
  kb.meta = { source: "ai", generatedAt: new Date().toISOString(), model: model(), durationMs: Date.now() - started, citations: { verified, dropped }, answerKey };
  return kb;
}
