"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CodeGate } from "@/components/CodeGate";
import type { Mood } from "@/components/Memo";
import { MemoryOrb, type MemoryOrbState } from "@/components/MemoryOrb";
import { Icon } from "@/components/UI";
import { BuildSteps } from "./BuildSteps";
import { fmtDateTime } from "@/lib/text";

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

const MOOD_TEXT: Record<Mood, string> = {
  idle: "Ready to read the raw files.", reading: "Reading every file…", thinking: "Connecting the facts…",
  checking: "Checking every quote against the files…", done: "The memory is built.", error: "Something went wrong.",
};

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
  const stageState = useRef<Stage[]>(PLAN);

  useEffect(() => {
    if (t0 === null) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [t0]);

  function apply(p: Stage) {
    stageState.current = stageState.current.map((s) => s.stage === p.stage ? { ...s, ...p } : s);
    setStages(stageState.current);
    if (stageState.current.some((s) => s.status === "error")) { setMood("error"); return; }
    if (p.stage === "verify" || p.stage === "key") setMood("checking");
    else if (p.stage === "read" || p.stage === "questions") setMood("reading");
    else setMood("thinking");
  }

  async function build() {
    if (running) return;
    setRunning(true); setError(""); setResult(null); setStages(PLAN); setMood("reading"); setT0(Date.now()); setElapsed(0);
    stageState.current = PLAN;
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
      const message = (e as Error).message;
      setError(message); setMood("error");
      // Associate transport/parser errors with a step only when the server has one active step.
      const active = stageState.current.filter((s) => s.status === "start");
      if (active.length === 1 && !stageState.current.some((s) => s.status === "error")) apply({ ...active[0], status: "error", detail: message });
    } finally {
      setRunning(false); setT0(null);
    }
  }

  const when = fmtDateTime;
  const orbState: MemoryOrbState = mood === "error" ? "error" : mood === "done" ? "success" : running ? "building" : "idle";
  const completedSteps = stages.filter((s) => s.status === "done").length;
  return (
    <div className="build-workbench">
      <div className="panel build-console">
        <p className="section-label">Mémoire 360</p>
        <MemoryOrb state={orbState} />
        <p className="build-console__status" role="status" aria-live="polite">{MOOD_TEXT[mood]}</p>
        {running && <div className="build-console__timing"><p className="tabular-nums">{elapsed} s · usually 1 to 2 minutes</p><p>{completedSteps} of {PLAN.length} steps complete</p></div>}
        <button onClick={build} disabled={running || !hasKey} className="button-primary build-action disabled:opacity-50">
          {running ? "Building…" : "Build from sources"}
        </button>
        {!hasKey && <p className="build-console__note">Needs an API key (see the usage guide).</p>}
        {needCode && <CodeGate onUnlocked={() => { setNeedCode(false); build(); }} />}
      </div>

      <section className="panel build-current" aria-label="Currently shown in the app">
        <p className="section-label">Current memory</p>
        {current.source === "ai" && current.meta ? <>
          <div className="build-current__heading"><h2>AI-generated knowledge base</h2>{current.meta.generatedAt && <p>Built <time dateTime={current.meta.generatedAt}>{when(current.meta.generatedAt)}</time></p>}</div>
          <ul className="build-current__facts">
            {current.meta.model && <li>{current.meta.model}</li>}
            {current.meta.citations && <li>{current.meta.citations.verified} citations verified</li>}
            <li><strong>{current.meta.answerKey?.score ?? "n/a"}</strong> key facts</li>
          </ul>
        </> : <><h2>Hand-curated answer key</h2><p className="build-console__note">No AI analysis yet. Build from sources to replace it with the system&apos;s own analysis.</p></>}
      </section>

      <div className="build-process">
        <div className="build-process__heading"><h2>Build process</h2><span>{completedSteps} / {PLAN.length} complete</span></div>
        <BuildSteps stages={stages} />
        {error && <div role="alert" className="build-result build-result--error reveal"><Icon name="warning" size={18} /><div><h2>Build failed</h2><p>{error}</p></div></div>}
        {result && <div className="build-result build-result--success reveal">
          <Icon name="check" size={18} />
          <div className="min-w-0"><h2>Memory rebuilt in {Math.round((result.durationMs ?? 0) / 1000)} s</h2>
            <div className="peek"><p>{result.citations?.verified} citations verified word for word, {result.citations?.dropped} removed.</p><p><strong>{result.answerKey?.score}</strong> answers contain every key fact.</p></div>
            <div className="build-result__actions"><Link href="/questions" className="button-primary build-action">See the answers</Link><Link href="/" className="button-secondary">Open the overview</Link></div>
          </div>
        </div>}
      </div>
    </div>
  );
}
