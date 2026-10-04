"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/UI";
import { Chip } from "@/components/Chip";
import { CodeGate } from "@/components/CodeGate";
import { Memo, readStream, type Mood } from "@/components/Memo";
import type { ResolvedCite } from "@/lib/types";

const SUGGESTIONS = [
  "Quelle est la date de livraison actuellement prévue et pourquoi?",
  "L’acceptation de sécurité est-elle obtenue ?",
  "Quels engagements ne sont toujours pas complétés?",
  "Existe-t-il des informations contradictoires?",
  "Si je reprenais le projet demain matin, que devrais-je savoir ?",
  "Qui a approuvé le report au 22 octobre ?",
];

type Res = { needCode?: boolean; answer?: string; citations?: ResolvedCite[]; dropped?: number; missing?: string[]; recommendations?: string[]; status?: string; error?: string };

export function AskClient({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState("");          // the question the displayed answer belongs to
  const latest = useRef(0);                         // only the most recent request may update the screen
  const lastInitial = useRef<string | null>(null);  // ask once per question from the header (no double run)
  const [mood, setMood] = useState<Mood>("idle");
  const [caption, setCaption] = useState("");
  const [t0, setT0] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (t0 === null) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [t0]);
  async function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    const id = ++latest.current;
    setQ(text); setAsked(text); setBusy(true); setRes(null);
    setMood("reading"); setCaption("Lecture des fichiers du projet…"); setT0(Date.now()); setElapsed(0);
    const mine = () => id === latest.current;
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify({ question: text }) });
      if (!r.ok) { const j = (await r.json()) as Res; if (mine()) { setRes(j); setMood("idle"); } return; }
      let completed = false;
      await readStream(r, (m) => {
        if (!mine()) return;
        if (m.type === "stage") {
          if (m.stage === "read") { setMood("reading"); setCaption(`Lecture ${m.detail}…`); }
          if (m.stage === "think") { setMood("thinking"); setCaption("Mise en relation des faits…"); }
          if (m.stage === "verify") { setMood("checking"); setCaption(`Vérification de chaque citation dans les fichiers…`); }
        } else if (m.type === "result") { completed = true; setRes(m as unknown as Res); setMood("done"); }
        else if (m.type === "error") { completed = true; setRes({ error: String(m.error) }); setMood("error"); }
      });
      if (!completed && mine()) throw new Error("La connexion a été interrompue avant la fin de la réponse.");
    } catch (e) { if (mine()) { setRes({ error: String(e) }); setMood("error"); } }
    finally { if (mine()) { setBusy(false); setT0(null); } }
  }
  useEffect(() => {
    if (initial && initial !== lastInitial.current) { lastInitial.current = initial; ask(initial); }
  }, [initial]);
  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="ask-search">
        <Icon name="search" size={20} />
        <label htmlFor="ask" className="sr-only">Question</label>
        <input id="ask" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm" placeholder="Posez votre question en français ou en anglais…" />
        <button disabled={busy} className="button-primary disabled:opacity-50">{busy ? "Lecture des fichiers…" : "Demander"}</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => <button key={s} disabled={busy} onClick={() => ask(s)} className="suggested-question disabled:opacity-50">{s}</button>)}
      </div>
      {busy && <div className="loading-status flex items-center gap-3" role="status"><Memo mood={mood} size="sm" /><span>{caption}</span><span className="tabular-nums">{elapsed} s</span></div>}
      {res?.needCode && <CodeGate onUnlocked={() => ask(asked)} />}
      {res?.error && !res.needCode && <p role="alert" className="rounded-md border border-blocker/40 bg-blocker/5 p-3 text-blocker">{res.error}</p>}
      {res?.answer && (
        <section className="panel answer-result p-6" aria-live="polite">
          <p className="mb-3 border-b border-line pb-2 text-sm text-muted">Réponse à : <span className="font-semibold text-ink">{asked}</span></p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{res.answer}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{res.citations?.map((c, i) => <Chip key={i} c={c} />)}</div>
          <p className="evidence-check">
            Vérification des preuves : {res.status === "full" ? "chaque citation a été retrouvée mot pour mot dans le fichier cité." : res.status === "partial" ? `${res.dropped} citation(s) introuvable(s) dans les fichiers ont été retirées.` : "aucune citation vérifiable ; interprétez cette réponse avec prudence."}
          </p>
          {!!res.missing?.length && <div className="answer-supplement"><p className="font-semibold">Non documenté dans le corpus</p><ul className="list-disc pl-5">{res.missing.map((m) => <li key={m}>{m}</li>)}</ul></div>}
          {!!res.recommendations?.length && <div className="answer-supplement"><p className="font-semibold">Nos recommandations (sans engagement documenté)</p><ul className="list-disc pl-5">{res.recommendations.map((m) => <li key={m}>{m}</li>)}</ul></div>}
        </section>
      )}
    </div>
  );
}
