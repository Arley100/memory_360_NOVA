"use client";
import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/Chip";
import { CodeGate } from "@/components/CodeGate";
import type { ResolvedCite } from "@/lib/types";

const SUGGESTIONS = [
  "Quelle est la date de livraison actuellement prévue et pourquoi?",
  "Is security accepted?",
  "Quels engagements ne sont toujours pas complétés?",
  "Existe-t-il des informations contradictoires?",
  "If I took over the project tomorrow morning, what should I know?",
  "Who approved the move to October 22?",
];

type Res = { needCode?: boolean; answer?: string; citations?: ResolvedCite[]; dropped?: number; missing?: string[]; recommendations?: string[]; status?: string; error?: string };

export function AskClient({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState("");          // the question the displayed answer belongs to
  const latest = useRef(0);                         // only the most recent request may update the screen
  const lastInitial = useRef<string | null>(null);  // ask once per question from the header (no double run)
  async function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    const id = ++latest.current;
    setQ(text); setAsked(text); setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text }) });
      const j = (await r.json()) as Res;
      if (id === latest.current) setRes(j);
    } catch (e) { if (id === latest.current) setRes({ error: String(e) }); }
    if (id === latest.current) setBusy(false);
  }
  useEffect(() => {
    if (initial && initial !== lastInitial.current) { lastInitial.current = initial; ask(initial); }
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
        <label htmlFor="ask" className="sr-only">Question</label>
        <input id="ask" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-lg" placeholder="Ask in English or French…" />
        <button disabled={busy} className="rounded-md bg-primary px-5 font-semibold text-white disabled:opacity-50">{busy ? "Reading the files…" : "Ask"}</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => <button key={s} disabled={busy} onClick={() => ask(s)} className="rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-primary disabled:opacity-50">{s}</button>)}
      </div>
      {res?.needCode && <CodeGate onUnlocked={() => ask(asked)} />}
      {res?.error && !res.needCode && <p className="rounded-md border border-blocker/40 bg-blocker/5 p-3 text-blocker">{res.error}</p>}
      {res?.answer && (
        <section className="rounded-lg border border-line bg-surface p-5" aria-live="polite">
          <p className="mb-3 border-b border-line pb-2 text-sm text-muted">Answer to: <span className="font-semibold text-ink">{asked}</span></p>
          <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{res.answer}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{res.citations?.map((c, i) => <Chip key={i} c={c} />)}</div>
          <p className="mt-2 text-sm text-muted">
            Evidence check: {res.status === "full" ? "every citation was found verbatim in the cited file." : res.status === "partial" ? `${res.dropped} citation(s) could not be found in the files and were removed.` : "no citation could be verified; treat this answer with caution."}
          </p>
          {!!res.missing?.length && <div className="mt-3"><p className="font-semibold">Not documented in the corpus</p><ul className="list-disc pl-5">{res.missing.map((m) => <li key={m}>{m}</li>)}</ul></div>}
          {!!res.recommendations?.length && <div className="mt-3"><p className="font-semibold">Our recommendations (not documented commitments)</p><ul className="list-disc pl-5">{res.recommendations.map((m) => <li key={m}>{m}</li>)}</ul></div>}
        </section>
      )}
    </div>
  );
}
