"use client";
import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/Chip";
import { CodeGate } from "@/components/CodeGate";
import { Memo, readStream, type Mood } from "@/components/Memo";
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
    setMood("reading"); setCaption("Reading the project files…"); setT0(Date.now()); setElapsed(0);
    const mine = () => id === latest.current;
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text }) });
      if (!r.ok) { const j = (await r.json()) as Res; if (mine()) { setRes(j); setMood("idle"); } return; }
      await readStream(r, (m) => {
        if (!mine()) return;
        if (m.type === "stage") {
          if (m.stage === "read") { setMood("reading"); setCaption(`Reading ${m.detail}…`); }
          if (m.stage === "think") { setMood("thinking"); setCaption("Connecting the facts…"); }
          if (m.stage === "verify") { setMood("checking"); setCaption(`Checking ${m.detail} against the files…`); }
        } else if (m.type === "result") { setRes(m as unknown as Res); setMood("done"); }
        else if (m.type === "error") { setRes({ error: String(m.error) }); setMood("error"); }
      });
    } catch (e) { if (mine()) { setRes({ error: String(e) }); setMood("error"); } }
    finally { if (mine()) { setBusy(false); setT0(null); } }
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
      {busy && (
        <div role="status" aria-live="polite" className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Memo mood={mood} size="sm" />
          <div>
            <p className="font-semibold">{caption}</p>
            <p className="text-sm text-muted"><span className="tabular-nums">{elapsed} s</span> · answers usually take 5 to 15 seconds</p>
          </div>
        </div>
      )}
      {res?.needCode && <CodeGate onUnlocked={() => ask(asked)} />}
      {res?.error && !res.needCode && <p className="rounded-md border border-blocker/40 bg-blocker/5 p-3 text-blocker">{res.error}</p>}
      {res?.answer && (
        <section className="rounded-lg border border-line bg-surface p-5" aria-live="polite">
          <p className="mb-3 border-b border-line pb-2 text-sm text-muted">Answer to: <span className="font-semibold text-ink">{asked}</span></p>
          <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{res.answer}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{res.citations?.map((c, i) => <Chip key={i} c={c} />)}</div>
          <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${res.status === "full" ? "memo-pop bg-validation/10 text-validation" : res.status === "partial" ? "bg-delivery/10 text-delivery" : "bg-blocker/10 text-blocker"}`}>
            {res.status === "full" ? `✓ ${res.citations?.length ?? 0} of ${res.citations?.length ?? 0} quotes found word for word in the files`
              : res.status === "partial" ? `△ ${res.citations?.length ?? 0} quotes verified; ${res.dropped} could not be found and were removed`
              : "✗ No quote could be verified: treat this answer with caution"}
          </p>
          <p className="mt-1 text-xs text-muted">Hover a chip to see the passage; click it to open the file.</p>
          {!!res.missing?.length && <div className="mt-3"><p className="font-semibold">Not documented in the corpus</p><ul className="list-disc pl-5">{res.missing.map((m) => <li key={m}>{m}</li>)}</ul></div>}
          {!!res.recommendations?.length && <div className="mt-3"><p className="font-semibold">Our recommendations (not documented commitments)</p><ul className="list-disc pl-5">{res.recommendations.map((m) => <li key={m}>{m}</li>)}</ul></div>}
        </section>
      )}
    </div>
  );
}
