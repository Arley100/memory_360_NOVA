"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Chips } from "@/components/Chip";
import { Icon } from "@/components/UI";
import { CodeGate } from "@/components/CodeGate";
import type { QuestionRecomputeResult, QuestionView } from "@/lib/questionTypes";

const dateTime = (iso: string) => new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" });
const changeLabels = { added: "Added", modified: "Modified", removed: "Removed from current context", changed: "Context changed" };

export function QuestionsClient({ initialRows }: { initialRows: QuestionView[] }) {
  const [computed, setComputed] = useState<Record<string, QuestionView>>({});
  const rows = initialRows.map((row) => computed[row.id]?.computation.computedAt > row.computation.computedAt ? computed[row.id] : row);
  const [selected, setSelected] = useState<string[]>([]);
  const [running, setRunning] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [unlockIds, setUnlockIds] = useState<string[] | null>(null);
  const [unlockMode, setUnlockMode] = useState<"incremental" | "full">("incremental");
  const requestActive = useRef(false);
  const received = useRef(new Set<string>());

  async function recompute(ids: string[], mode: "incremental" | "full" = "incremental") {
    if (!ids.length || requestActive.current) return;
    requestActive.current = true;
    received.current = new Set();
    setRunning(ids); setProgress({ done: 0, total: ids.length }); setUnlockIds(null);
    setErrors((old) => Object.fromEntries(Object.entries(old).filter(([id]) => !ids.includes(id))));
    const apply = (result: QuestionRecomputeResult) => {
      if (!ids.includes(result.id) || received.current.has(result.id)) return;
      received.current.add(result.id);
      if (result.ok) {
        setComputed((old) => ({ ...old, [result.id]: result.question }));
        setSelected((old) => old.filter((id) => id !== result.id));
      } else setErrors((old) => ({ ...old, [result.id]: result.error }));
      setRunning((old) => old.filter((id) => id !== result.id));
      setProgress({ done: received.current.size, total: ids.length });
    };
    try {
      const response = await fetch("/api/questions/recompute", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify({ ids, mode }) });
      if (!response.ok) {
        const body = await response.json() as { error?: string; needCode?: boolean };
        if (response.status === 401 && body.needCode) { setUnlockIds(ids); setUnlockMode(mode); return; }
        throw new Error(body.error ?? "Unable to recompute. Try again.");
      }
      if (response.headers.get("content-type")?.includes("application/x-ndjson") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "", done = false;
        const receive = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line);
          if (event.type === "result") apply(event as QuestionRecomputeResult);
          if (event.type === "error") throw new Error(event.error);
          if (event.type === "done") done = true;
        };
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
          lines.forEach(receive);
        }
        receive(buffer + decoder.decode());
        if (!done || received.current.size !== ids.length) throw new Error("Connection ended before all questions finished. Try again.");
      } else {
        const body = await response.json() as { results: QuestionRecomputeResult[] };
        body.results.forEach(apply);
        if (received.current.size !== ids.length) throw new Error("Some questions did not finish. Try again.");
      }
    } catch (error) {
      const unfinished = ids.filter((id) => !received.current.has(id));
      setErrors((old) => ({ ...old, ...Object.fromEntries(unfinished.map((id) => [id, (error as Error).message])) }));
    } finally { requestActive.current = false; setRunning([]); setProgress(null); }
  }

  return <>
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 text-xs">
      <button className="button-secondary" onClick={() => setSelected(rows.filter((row) => row.freshness.status === "stale").map((row) => row.id))}>Select stale</button>
      <button className="button-secondary" onClick={() => setSelected(rows.map((row) => row.id))}>Select all</button>
      <span className="text-muted" aria-live="polite">{selected.length} selected</span>
      <button className="button-primary ml-auto inline-flex items-center gap-2 disabled:opacity-50" disabled={!selected.length || !!progress} onClick={() => void recompute(selected)}><Icon name="refresh" size={14} />Recompute selected ({selected.length})</button>
      {progress && <span className="w-full text-primary" role="status">Recomputing {progress.done} / {progress.total}…</span>}
      {unlockIds && <div className="w-full"><CodeGate onUnlocked={() => void recompute(unlockIds, unlockMode)} /></div>}
    </div>
    {rows.map((row) => {
      const isRunning = running.includes(row.id);
      const error = errors[row.id];
      const stale = row.freshness.status === "stale";
      const review = row.computation.result === "uncertain";
      const badge = isRunning ? "Recomputing…" : error ? "Recompute failed" : review ? "Requires review" : stale ? "Needs recompute" : "Up to date";
      const tone = isRunning ? "text-primary" : error || review ? "text-blocker" : stale ? "text-delivery" : "text-validation";
      return <section key={row.id} id={row.id} className="question-section" aria-busy={isRunning}>
        <div className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" aria-label={`Select ${row.id} for recomputation`} checked={selected.includes(row.id)} onChange={(e) => setSelected((old) => e.target.checked ? [...new Set([...old, row.id])] : old.filter((id) => id !== row.id))} />
          <h2 className="min-w-0 flex-1 text-lg font-semibold"><span className="text-muted">{row.id}.</span> {row.question}</h2>
          <button className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line text-primary hover:bg-canvas disabled:opacity-50" disabled={!!progress} title="Recompute from changes" aria-label={`Recompute ${row.id} from changes`} onClick={() => void recompute([row.id])}><span className={isRunning ? "inline-flex animate-spin motion-reduce:animate-none" : "inline-flex"}><Icon name="refresh" size={16} /></span></button>
          <details className="relative shrink-0 text-xs">
            <summary className="inline-flex h-8 cursor-pointer items-center rounded border border-line px-2 text-muted" aria-label={`More recomputation options for ${row.id}`}>More</summary>
            <div className="absolute right-0 z-10 mt-1 w-64 rounded border border-line bg-surface p-2 shadow-lg">
              <button disabled={!!progress} className="w-full rounded p-2 text-left text-primary hover:bg-canvas disabled:opacity-50" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); void recompute([row.id], "full"); }}>Recompute from all sources<span className="mt-1 block text-muted">Slower, complete verification</span></button>
            </div>
          </details>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className={`inline-flex items-center gap-1.5 ${tone}`} role="status" title={isRunning ? "Recomputing using the previous answer, supporting evidence and relevant changes." : error ? "Recomputation failed; the previous cached answer is preserved." : review ? "Incremental verification was uncertain; full recomputation is recommended." : stale ? "Relevant project information changed after this answer was last computed." : "Computed using all currently published information relevant to this question."}><Icon name={isRunning ? "refresh" : error || review || stale ? "warning" : "check"} size={13} />{badge}</span>
          <span className="text-muted" title={row.computation.origin === "existing-state" ? "Initial cache imported from the existing resolved answer without an LLM call." : undefined}>{row.computation.origin === "existing-state" ? "Last computed (initial cache)" : "Last recomputed"}: <time dateTime={row.computation.computedAt}>{dateTime(row.computation.computedAt)}</time></span>
        </div>
        {stale && <div className="mt-3 border-l-2 border-delivery pl-3 text-xs">
          <p className="font-semibold text-delivery">Relevant changes since computation</p>
          <ul className="mt-2 space-y-2">{row.freshness.changedSources.map((source) => <li key={`${source.changeType}:${source.path}:${source.updateId}`}>
            <span className="font-semibold">{source.changeType === "added" ? "+ " : source.changeType === "removed" ? "− " : "~ "}{source.filename}</span><span className="ml-2 text-muted">{changeLabels[source.changeType]} {source.changeType === "removed" ? "· previously in" : "in"} {source.updateId}{source.publishedAt ? ` · ${dateTime(source.publishedAt)}` : ""}</span>
            {source.changeType !== "removed" && <Link href={`/sources/${encodeURIComponent(source.id)}`} className="ml-2 text-primary underline">Open source</Link>}
          </li>)}</ul>
          {!row.freshness.changedSources.length && <p className="mt-1 text-muted">Changed updates: {[...row.freshness.changedUpdates, ...row.freshness.removedUpdates].join(", ")}. No source files are recorded for these updates.</p>}
        </div>}
        {row.computation.mode && <div className="mt-2 text-xs text-muted">
          <p>Method: {row.computation.mode === "incremental" ? "Incremental" : "Full"} · Changes considered: {row.computation.consideredSources?.length ?? 0}</p>
          {!!row.computation.consideredSources?.length && <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{row.computation.consideredSources.map((s) => <li key={`${s.changeType}:${s.path}`}>
            {s.changeType !== "removed" && !row.unavailableCitationSources.includes(s.id) ? <Link className="text-primary underline" href={`/sources/${encodeURIComponent(s.id)}`}>{s.filename}</Link> : <span>{s.filename} (removed)</span>}
          </li>)}</ul>}
          {row.computation.changeSummary && <p className="mt-1">{row.computation.changeSummary}</p>}
          {row.computation.fullRecomputeReason && <p className="mt-1">{row.computation.fullRecomputeReason}</p>}
        </div>}
        {review && <button disabled={!!progress} className="button-secondary mt-3 text-xs disabled:opacity-50" onClick={() => void recompute([row.id], "full")}>Recompute from all sources</button>}
        {error && <p role="alert" className="mt-3 text-xs text-blocker">Recompute failed — previous answer preserved. {error}</p>}
        {stale && <p className="mt-3 text-xs font-semibold text-muted">Current cached answer · potentially outdated</p>}
        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed">{row.computation.answer}</p>
        <div className="mt-3"><Chips cites={row.citations.filter((c) => !row.unavailableCitationSources.includes(c.src))} /></div>
        {row.citations.filter((c) => row.unavailableCitationSources.includes(c.src)).map((cite, i) => <details key={`${cite.src}:${i}`} className="mt-2 text-xs text-muted"><summary className="cursor-pointer">{cite.src} · {cite.loc} · evidence removed from current context</summary><blockquote className="quote mt-1">{cite.quote}</blockquote></details>)}
        {!review && row.computation.previousAnswerChanged !== undefined && <p className="mt-2 text-xs text-muted">Answer {row.computation.previousAnswerChanged ? "changed" : "unchanged"} after recomputation</p>}
        {!!row.computation.missing?.length && <div className="answer-supplement"><p className="font-semibold">Not documented in the corpus</p><ul className="list-disc pl-5">{row.computation.missing.map((m) => <li key={m}>{m}</li>)}</ul></div>}
        {!!row.computation.recommendations?.length && <div className="answer-supplement"><p className="font-semibold">Recommendations (not documented commitments)</p><ul className="list-disc pl-5">{row.computation.recommendations.map((m) => <li key={m}>{m}</li>)}</ul></div>}
        <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer font-semibold text-primary">Original dossier answer and traps</summary>
          <p className="mt-2 italic">{row.questionFr}</p><p className="mt-2">{row.baseline.answer}</p><p className="mt-2"><strong>FR:</strong> {row.baseline.answerFr}</p><div className="mt-2"><Chips cites={row.baseline.citations} /></div><ul className="mt-2 list-disc pl-5">{row.traps.map((trap) => <li key={trap}>{trap}</li>)}</ul>
        </details>
      </section>;
    })}
  </>;
}
