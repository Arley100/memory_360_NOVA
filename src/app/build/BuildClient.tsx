"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CodeGate } from "@/components/CodeGate";
import { Icon } from "@/components/UI";

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
  return (
    <div className="upload-icon mx-auto" aria-hidden="true">
      <Icon name={mood === "done" ? "check" : mood === "error" ? "warning" : "sources"} size={24} />
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
      let completed = false;
      const receive = (line: string) => {
        if (!line.trim()) return;
        const m = JSON.parse(line);
        if (m.type === "progress") apply(m);
        else if (m.type === "done") { completed = true; setResult(m.meta); setMood("done"); router.refresh(); }
        else if (m.type === "error") throw new Error(m.message);
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) receive(line);
      }
      receive(buf + dec.decode());
      if (!completed) throw new Error("The connection ended before the build completed. Try again.");
    } catch (e) {
      setError((e as Error).message); setMood("error");
    } finally {
      setRunning(false); setT0(null);
    }
  }

  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "");
  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <div className="panel h-fit space-y-4 p-5 text-center">
        <Memo mood={mood} />
        <p className="text-lg font-semibold" aria-live="polite">{MOOD_TEXT[mood]}</p>
        {running && <p className="tabular-nums text-muted">{elapsed} s · usually 1 to 2 minutes</p>}
        <button onClick={build} disabled={running || !hasKey}
          className="button-primary w-full disabled:opacity-50">
          {running ? "Building…" : "Build from sources"}
        </button>
        {!hasKey && <p className="text-sm text-muted">Needs an API key (see the usage guide).</p>}
        {needCode && <CodeGate onUnlocked={() => { setNeedCode(false); build(); }} />}
      </div>

      <div className="space-y-4">
        <div className="panel p-5 text-xs">
          <p className="text-sm text-muted">Currently shown in the app</p>
          {current.source === "ai" && current.meta ? (
            <p className="mt-1"><strong>AI-generated knowledge base</strong> · built {when(current.meta.generatedAt)} with {current.meta.model} ·{" "}
              {current.meta.citations?.verified} citations verified · answer key <strong>{current.meta.answerKey?.score ?? "n/a"}</strong></p>
          ) : (
            <p className="mt-1"><strong>Hand-curated answer key</strong> (no AI analysis yet). Build from sources to replace it with the system&apos;s own analysis.</p>
          )}
        </div>

        <ol ref={log} className="panel divide-y divide-line" aria-label="Analysis steps">
          {stages.map((s) => (
            <li key={s.stage} className={`flex items-start gap-3 p-4 text-xs transition-colors ${s.status === "start" ? "bg-primary/5" : ""}`}>
              <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                s.status === "done" ? "bg-validation text-white" : s.status === "error" ? "bg-blocker text-white" : s.status === "start" ? "bg-primary text-white" : "border border-line text-muted"}`}>
                {s.status === "done" ? "✓" : s.status === "error" ? "!" : s.status === "start" ? "…" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className={s.status === "pending" ? "text-muted" : "font-semibold"}>{s.label}</p>
                {s.total !== undefined && s.status === "start" && (
                  <div className="mt-1 h-2 overflow-hidden rounded bg-canvas" role="progressbar" aria-label={s.label} aria-valuemin={0} aria-valuenow={s.done ?? 0} aria-valuemax={s.total}>
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((s.done ?? 0) / Math.max(1, s.total)) * 100}%` }} />
                  </div>
                )}
                {s.detail && <p className="text-sm text-muted">{s.detail}</p>}
              </div>
            </li>
          ))}
        </ol>

        {error && <p role="alert" className="rounded-md border border-blocker/40 bg-blocker/5 p-3 text-blocker">{error}</p>}
        {result && (
          <div className="rounded-lg border-2 border-validation bg-validation/5 p-4">
            <p className="text-lg font-bold">Built in {Math.round((result.durationMs ?? 0) / 1000)} s from the raw files.</p>
            <p>{result.citations?.verified} citations verified word for word, {result.citations?.dropped} removed. Answer key: <strong>{result.answerKey?.score}</strong> answers contain every key fact.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/questions" className="button-primary">See the answers</Link>
              <Link href="/" className="button-secondary">Open the overview</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
