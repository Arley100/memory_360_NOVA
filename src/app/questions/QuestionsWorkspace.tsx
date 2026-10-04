"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/UI";
import { Chips } from "@/components/Chip";
import { CodeGate } from "@/components/CodeGate";
import { readStream } from "@/lib/stream";
import type { ResolvedCite } from "@/lib/types";

type Answer = { needCode?: boolean; answer?: string; citations?: ResolvedCite[]; dropped?: number; missing?: string[]; recommendations?: string[]; status?: string; error?: string };
type Entry = { id: string; question: string; stage?: string; result?: Answer };
const STORAGE = "nova-additional-questions";

export function QuestionsWorkspace({ initial, questions, children }: {
  initial: string; questions: { id: string; question: string }[]; children: ReactNode;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<Entry[]>([]);
  const initialized = useRef(false);
  const consumed = useRef("");
  const inFlight = useRef(false);
  const scrollTo = useRef<string | null>(null);

  const update = useCallback((next: Entry[]) => {
    history.current = next;
    setEntries(next);
    // Keep answers across header navigation without modifying the project knowledge base.
    try { sessionStorage.setItem(STORAGE, JSON.stringify(next.filter((e) => e.result?.answer))); } catch { /* Storage may be disabled. */ }
  }, []);

  const nextBaseId = Math.max(0, ...questions.map((e) => Number(e.id.replace(/^Q/, "")) || 0));
  const ask = useCallback(async (question: string, retryId?: string) => {
    const text = question.trim();
    if (!text || inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setQ("");
    const nextId = Math.max(nextBaseId, ...history.current.map((e) => Number(e.id.replace(/^Q/, "")) || 0)) + 1;
    const id = retryId ?? `Q${String(nextId).padStart(2, "0")}`;
    scrollTo.current = id;
    update(retryId ? history.current.map((e) => e.id === id ? { id, question: text } : e) : [...history.current, { id, question: text }]);
    try {
      const response = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify({ question: text }) });
      let result: Answer | undefined;
      if (response.ok && response.headers.get("content-type")?.includes("application/x-ndjson")) {
        await readStream(response, (m) => {
          if (m.type === "stage") update(history.current.map((e) => e.id === id ? { ...e, stage: m.stage === "read" ? "Lecture des fichiers NOVA…" : m.stage === "think" ? "Mise en relation des faits documentés…" : "Vérification des citations…" } : e));
          else if (m.type === "result") result = m as Answer;
          else if (m.type === "error") throw new Error(String(m.error));
        });
        if (!result) throw new Error("Connexion interrompue avant la fin de la réponse. Réessayez.");
      } else result = await response.json() as Answer;
      if (!response.ok && !result.error) result.error = `Réponse impossible (${response.status}). Réessayez.`;
      update(history.current.map((e) => e.id === id ? { ...e, result } : e));
    } catch (error) {
      update(history.current.map((e) => e.id === id ? { ...e, result: { error: (error as Error).message } } : e));
    } finally { inFlight.current = false; setBusy(false); }
  }, [nextBaseId, update]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE) ?? "[]") as Entry[];
        if (Array.isArray(saved)) update(saved.filter((e) => e && typeof e.id === "string" && typeof e.question === "string" && typeof e.result?.answer === "string"));
      } catch { /* Start a fresh list if storage is unavailable. */ }
    }
    if (initial.trim() && initial !== consumed.current) {
      consumed.current = initial;
      void ask(initial);
      router.replace("/questions", { scroll: false });
    }
  }, [initial, ask, router, update]);

  useEffect(() => {
    if (scrollTo.current) {
      document.getElementById(scrollTo.current)?.scrollIntoView({ block: "start" });
      scrollTo.current = null;
    }
  }, [entries]);

  return <div className="questions-workspace">
    <nav aria-label="Index des questions" className="question-index">
      <p className="section-label mb-3">Index des réponses</p>
      {[...questions, ...entries].map((e) => <a key={e.id} href={`#${e.id}`}><span>{e.id}</span><span>{e.question}</span></a>)}
      <a href="#new-question"><Icon name="questions" /><span>Poser une autre question</span></a>
    </nav>
    <div className="answer-document">
      {children}
      {entries.map((entry) => <section key={entry.id} id={entry.id} className="question-section" aria-live="polite">
        <h2 className="text-lg font-semibold"><span className="text-muted">{entry.id}.</span> {entry.question}</h2>
        {!entry.result && <p className="loading-status mt-3" role="status">{entry.stage ?? "Lecture des fichiers NOVA et vérification des preuves…"}</p>}
        {entry.result?.needCode && <CodeGate onUnlocked={() => void ask(entry.question, entry.id)} />}
        {entry.result?.error && !entry.result.needCode && <div className="mt-3"><p role="alert" className="text-sm text-blocker">{entry.result.error}</p><button disabled={busy} onClick={() => void ask(entry.question, entry.id)} className="button-secondary mt-3 disabled:opacity-50">Réessayer</button></div>}
        {entry.result?.answer && <>
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed">{entry.result.answer}</p>
          <div className="mt-3"><Chips cites={entry.result.citations ?? []} /></div>
          <p className="evidence-check">Vérification des preuves : {entry.result.status === "full" ? "chaque citation a été retrouvée mot pour mot dans le fichier cité." : entry.result.status === "partial" ? `${entry.result.dropped} citation(s) introuvable(s) ont été retirées.` : "aucune citation vérifiable ; interprétez cette réponse avec prudence."}</p>
          {!!entry.result.missing?.length && <div className="answer-supplement"><p className="font-semibold">Non documenté dans le corpus</p><ul className="list-disc pl-5">{entry.result.missing.map((m) => <li key={m}>{m}</li>)}</ul></div>}
          {!!entry.result.recommendations?.length && <div className="answer-supplement"><p className="font-semibold">Recommandations (sans engagement documenté)</p><ul className="list-disc pl-5">{entry.result.recommendations.map((m) => <li key={m}>{m}</li>)}</ul></div>}
        </>}
      </section>)}
      <section id="new-question" className="question-section">
        <h2 className="text-lg font-semibold">Poser une autre question</h2>
        <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="ask-search mt-3">
          <Icon name="search" size={20} />
          <label htmlFor="additional-question" className="sr-only">Question sur NOVA</label>
          <input id="additional-question" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm" placeholder="Posez votre question en français ou en anglais…" />
          <button disabled={busy || !q.trim()} className="button-primary disabled:opacity-50">{busy ? "Lecture des fichiers…" : "Demander"}</button>
        </form>
      </section>
    </div>
  </div>;
}
