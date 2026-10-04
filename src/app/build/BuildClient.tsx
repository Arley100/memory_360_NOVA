"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CodeGate } from "@/components/CodeGate";

type Stage = { stage: string; label: string; status: "pending" | "start" | "done" | "error"; detail?: string; done?: number; total?: number };
type Meta = { generatedAt?: string; model?: string; durationMs?: number; citations?: { verified: number; dropped: number }; answerKey?: { score: string } };

// The pipeline's stages, in order. Labels match what the server reports.
const PLAN: Stage[] = [
  { stage: "read", label: "Read the dossier", status: "pending" },
  { stage: "questions", label: "Found the questions to answer", status: "pending" },
  { stage: "answers", label: "Answering the README questions", status: "pending" },
  { stage: "state", label: "Working out the current state, conditions, budget and people", status: "pending" },
  { stage: "history", label: "Rebuilding the timeline and the decisions", status: "pending" },
  { stage: "issues", label: "Resolving contradictions and planning actions", status: "pending" },
  { stage: "brief", label: "Writing the one-page handover brief", status: "pending" },
  { stage: "verify", label: "Checking every citation against the files", status: "pending" },
  { stage: "key", label: "Comparing with the curated answer key", status: "pending" },
];

type Mood = "idle" | "reading" | "thinking" | "checking" | "done" | "error";
const MOOD_TEXT: Record<Mood, string> = {
  idle: "Ready to read the raw files.", reading: "Reading every file…", thinking: "Connecting the facts…",
  checking: "Checking every quote against the files…", done: "The memory is built.", error: "Something went wrong.",
};

function Memo({ mood }: { mood: Mood }) {
  const color = { idle: "#8aa0b8", reading: "#0e4c92", thinking: "#3b6fd4", checking: "#e0a800", done: "#1e7a4c", error: "#b42318" }[mood];
  const busy = mood === "reading" || mood === "thinking" || mood === "checking";
  return (
    <div className="relative mx-auto h-40 w-40" aria-hidden>
      <div className={`absolute inset-0 rounded-full blur-2xl transition-colors duration-700 ${busy ? "memo-breathe" : ""}`} style={{ background: color, opacity: 0.35 }} />
      <div className={`absolute inset-4 rounded-full transition-colors duration-700 ${busy ? "memo-breathe" : ""}`}
        style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${color} 55%, #0b1a33 100%)`, boxShadow: `0 0 40px ${color}66` }} />
      {busy && <div className="memo-orbit absolute inset-0 rounded-full border-2 border-dashed" style={{ borderColor: `${color}88` }} />}
      {mood === "done" && <div className="absolute inset-0 flex items-center justify-center text-5xl text-white">✓</div>}
    </div>
  );
}

export function BuildClient({ current, hasKey }: { current: { source: string; meta?: Meta } ; hasKey: boolean }) {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>(PLAN);
  const [running, setRunning] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const [result, setResult] = useState<Meta | null>(null);
  const [error, setError] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [t0, setT0] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const log = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (t0 === null) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [t0]);

  function apply(p: Stage) {
    setStages((list) => list.map((s) => (s.stage === p.stage ? { ...s, ...p } : s)));
    if (p.stage === "verify" || p.stage === "key") setMood("checking");
    else if (p.stage === "read" || p.stage === "questions") setMood("reading");
    else setMood("thinking");
  }

  async function build() {
    if (running) return;
    setRunning(true); setError(""); setResult(null); setStages(PLAN); setMood("reading"); setT0(Date.now()); setElapsed(0);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      if (res.status === 401) { setNeedCode(true); setMood("idle"); return; }
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `Server error ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const m = JSON.parse(line);
          if (m.type === "progress") apply(m);
          else if (m.type === "done") { setResult(m.meta); setMood("done"); router.refresh(); }
          else if (m.type === "error") throw new Error(m.message);
        }
      }
    } catch (e) {
      setError((e as Error).message); setMood("error");
    } finally {
      setRunning(false); setT0(null);
    }
  }

  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "");
  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <div className="space-y-4 text-center">
        <Memo mood={mood} />
        <p className="text-lg font-semibold" aria-live="polite">{MOOD_TEXT[mood]}</p>
        {running && <p className="tabular-nums text-muted">{elapsed} s · usually 1 to 2 minutes</p>}
        <button onClick={build} disabled={running || !hasKey}
          className="w-full rounded-md bg-primary px-5 py-3 text-lg font-semibold text-white disabled:opacity-50">
          {running ? "Building…" : "Build from sources"}
        </button>
        {!hasKey && <p className="text-sm text-muted">Needs an API key (see the usage guide).</p>}
        {needCode && <CodeGate onUnlocked={() => { setNeedCode(false); build(); }} />}
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Currently shown in the app</p>
          {current.source === "ai" && current.meta ? (
            <p className="mt-1"><strong>AI-generated knowledge base</strong> · built {when(current.meta.generatedAt)} with {current.meta.model} ·{" "}
              {current.meta.citations?.verified} citations verified · answer key <strong>{current.meta.answerKey?.score ?? "n/a"}</strong></p>
          ) : (
            <p className="mt-1"><strong>Hand-curated answer key</strong> (no AI analysis yet). Build from sources to replace it with the system&apos;s own analysis.</p>
          )}
        </div>

        <ol ref={log} className="divide-y divide-line rounded-lg border border-line bg-surface" aria-label="Analysis steps">
          {stages.map((s) => (
            <li key={s.stage} className={`flex items-start gap-3 p-3 transition-colors ${s.status === "start" ? "bg-primary/5" : ""}`}>
              <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                s.status === "done" ? "bg-validation text-white" : s.status === "error" ? "bg-blocker text-white" : s.status === "start" ? "memo-breathe bg-primary text-white" : "border border-line text-muted"}`}>
                {s.status === "done" ? "✓" : s.status === "error" ? "!" : s.status === "start" ? "…" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className={s.status === "pending" ? "text-muted" : "font-semibold"}>{s.label}</p>
                {s.total !== undefined && s.status === "start" && (
                  <div className="mt-1 h-2 overflow-hidden rounded bg-canvas" role="progressbar" aria-valuenow={s.done} aria-valuemax={s.total}>
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((s.done ?? 0) / Math.max(1, s.total)) * 100}%` }} />
                  </div>
                )}
                {s.detail && <p className="text-sm text-muted">{s.detail}</p>}
              </div>
            </li>
          ))}
        </ol>

        {error && <p className="rounded-md border border-blocker/40 bg-blocker/5 p-3 text-blocker">{error}</p>}
        {result && (
          <div className="rounded-lg border-2 border-validation bg-validation/5 p-4">
            <p className="text-lg font-bold">Built in {Math.round((result.durationMs ?? 0) / 1000)} s from the raw files.</p>
            <p>{result.citations?.verified} citations verified word for word, {result.citations?.dropped} removed. Answer key: <strong>{result.answerKey?.score}</strong> answers contain every key fact.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/questions" className="rounded-md bg-primary px-4 py-2 font-semibold text-white">See the answers</Link>
              <Link href="/" className="rounded-md border border-line px-4 py-2">Open the overview</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
