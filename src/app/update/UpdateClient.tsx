"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/UI";
import { ChangeSetView } from "@/components/ChangeSetView";
import { CodeGate } from "@/components/CodeGate";
import { Memo, StageList, readStream, type Mood, type StageItem } from "@/components/Memo";
import type { ChangeSet, Segment } from "@/lib/types";

type Result = { draftId: string; segments: Segment[]; changeset: ChangeSet };

// The update's stages, in order. The server reports when each one starts and finishes.
const PLAN: StageItem[] = [
  { stage: "read", label: "Reading the new information", status: "pending" },
  { stage: "compare", label: "Comparing it with the whole project", status: "pending" },
  { stage: "guard", label: "Checking the guardrails", status: "pending" },
];
const CAPTION: Record<string, string> = {
  read: "Reading the new information…", compare: "Comparing it with everything the project already knows…", guard: "Checking that nothing is invented…",
};

export function UpdateClient() {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [needCode, setNeedCode] = useState<null | (() => void)>(null);
  const [stages, setStages] = useState<StageItem[]>(PLAN);
  const [mood, setMood] = useState<Mood>("idle");
  const [caption, setCaption] = useState("");
  const [names, setNames] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [review, setReview] = useState<{ warnings: string[]; guardedChangeSet: ChangeSet } | null>(null);
  const [columnText, setColumnText] = useState<Partial<Record<"problemStatus" | "priorDecisions" | "newProposals", string>>>({});
  const ctrl = useRef<AbortController | null>(null);
  const analyzing = startedAt !== null;
  const busy = analyzing || publishing;

  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [startedAt]);

  function cancel() {
    ctrl.current?.abort();
    ctrl.current = null;
    setStartedAt(null); setMood("idle"); setStages(PLAN);
    setError("Analysis cancelled. Nothing was published; you can upload again.");
  }

  async function upload(files: File[]) {
    if (!files.length || ctrl.current || busy) return;
    const total = files.reduce((n, f) => n + f.size, 0);
    if (total > 4.3 * 1024 * 1024 && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      setError("These files are larger than the hosted demo accepts (4.5 MB per upload). Compress them, upload fewer at once, or use the local version.");
      return;
    }
    setError(""); setRes(null); setReview(null); setColumnText({}); setElapsed(0); setStartedAt(Date.now()); setStages(PLAN);
    setNames(files.map((f) => f.name).join(" + ")); setMood("reading"); setCaption(CAPTION.read);
    const fd = new FormData(); files.forEach((f) => fd.append("file", f));
    const c = new AbortController(); ctrl.current = c;
    try {
      const r = await fetch("/api/update/analyze", { method: "POST", body: fd, signal: c.signal });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        if (r.status === 401 && j.needCode) { setMood("idle"); setNeedCode(() => () => upload(files)); return; }
        throw new Error(j.error ?? (r.status === 504 ? "The server timed out. Try fewer files." : `Server error ${r.status}.`));
      }
      let completed = false;
      await readStream(r, (m) => {
        if (c.signal.aborted || ctrl.current !== c) return;
        if (m.type === "stage") {
          const item = m as unknown as StageItem;
          setStages((list) => list.map((s) => s.stage === item.stage ? { ...s, ...item } : s));
          setMood(item.stage === "read" ? "reading" : item.stage === "guard" ? "checking" : "thinking");
          setCaption(CAPTION[item.stage] ?? "Analyzing the update...");
        } else if (m.type === "result") { completed = true; setRes(m as unknown as Result); setMood("done"); }
        else if (m.type === "error") throw new Error(String(m.error));
      });
      if (!completed && !c.signal.aborted) throw new Error("The connection ended before analysis completed. Try again.");
    } catch (e) {
      if (!c.signal.aborted && ctrl.current === c && (e as Error).name !== "AbortError") { setError((e as Error).message || String(e)); setMood("error"); }
    } finally {
      if (ctrl.current === c) { ctrl.current = null; setStartedAt(null); }
    }
  }

  async function publish() {
    if (!res || publishing) return;
    setPublishing(true);
    setError("");
    try {
      const r = await fetch("/api/update/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draftId: res.draftId, changeset: res.changeset }) });
      const j = await r.json();
      if (r.status === 401 && j.needCode) { setNeedCode(() => publish); return; }
      if (r.status === 409 && j.reviewRequired) {
        setReview({ warnings: j.warnings, guardedChangeSet: j.guardedChangeSet });
        setError("Publish stopped for guardrail review. Your edits and uploaded files are retained. Correct the flagged content and retry.");
        return;
      }
      if (!r.ok) throw new Error(j.error ?? `Server error ${r.status}.`);
      setRes(null); setReview(null); setMood("idle");
      router.push(`/?changed=${encodeURIComponent(j.id)}`);
    } catch (e) { setError((e as Error).message); }
    finally { setPublishing(false); }
  }

  const edit = (k: "problemStatus" | "priorDecisions" | "newProposals", text: string) => {
    if (!res) return;
    setColumnText((old) => ({ ...old, [k]: text }));
    const lines = text.split("\n").map((t) => t.trim()).filter(Boolean);
    const old = res.changeset[k];
    setRes({ ...res, changeset: { ...res.changeset, [k]: lines.map((t, i) => ({ ...(old[i] ?? { citations: [] }), text: t })) } });
  };
  const editRevised = (k: "revisedAnswers" | "revisedBrief", i: number, text: string | null) => {
    if (!res) return;
    const list = [...(res.changeset[k] ?? [])];
    if (text === null) list.splice(i, 1); else list[i] = { ...list[i], text };
    setRes({ ...res, changeset: { ...res.changeset, [k]: list } });
  };
  const flagged = (label: string) => [...(res?.changeset.guardrails.notes ?? []), ...(review?.warnings ?? [])].some((n) => n.startsWith(label));
  const showWork = analyzing || (mood !== "idle" && !res);

  const activeStep = publishing ? 3 : res ? 2 : busy ? 1 : 0;

  return (
    <div className="space-y-5">
      <ol className="workflow-steps" aria-label="Update workflow">
        {["Add file", "Analyze", "Review impact", "Publish version"].map((step, i) => <li key={step} aria-current={i === activeStep ? "step" : undefined}><span>{String(i + 1).padStart(2, "0")}</span>{step}</li>)}
      </ol>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(Array.from(e.dataTransfer.files)); }}
        className={`upload-zone ${busy ? "pointer-events-none cursor-wait opacity-50" : ""} ${drag ? "is-dragging" : "border-line bg-surface"}`}>
        <span className="upload-icon"><Icon name="upload" size={24} /></span>
        <span className="text-base font-semibold">Drop the new information here (one file or several), or click to choose</span>
        <span className="mt-2 max-w-3xl text-xs text-muted">Any source: email (.eml), Word, PDF, Excel, PowerPoint, calendar invite (.ics), Teams/chat export (.json, .html), text, CSV, a screenshot, or a .zip of several files</span>
        <input type="file" multiple disabled={!!busy} className="sr-only" onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </label>
      {needCode && <CodeGate onUnlocked={() => { const retry = needCode; setNeedCode(null); retry(); }} />}
      {analyzing && <div role="status" className="loading-status flex flex-wrap items-center gap-3"><Memo mood={mood} size="sm" /><span>{caption}{names && <span className="ml-2 text-muted">{names}</span>}</span><span className="tabular-nums">{elapsed} s</span><span>{elapsed < 60 ? "Analysis usually takes 30 to 90 seconds." : elapsed < 150 ? "Still working: long files take longer." : "Taking unusually long. You can wait or cancel."}</span><button onClick={cancel} className="button-secondary ml-auto">Cancel</button></div>}
      {publishing && <p role="status" className="loading-status">Publishing the new version...</p>}
      {showWork && <StageList stages={stages} />}
      {error && <p role="alert" className="rounded-md border border-blocker/40 bg-blocker/5 p-3 text-blocker">{error}</p>}
      {res && (
        <section className="review-result space-y-5">
          <h2 className="text-xl font-semibold">Review before publishing: {res.changeset.filename}</h2>
          <ChangeSetView cs={res.changeset} animate />
          {review && <div role="alert" className="rounded-md border border-blocker/40 bg-blocker/5 p-3 space-y-3">
            <p className="font-semibold">Publish-time guardrail review</p>
            <ul className="list-disc pl-5 text-sm">{review.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            <details><summary className="cursor-pointer font-semibold">View the guarded version</summary><ChangeSetView cs={review.guardedChangeSet} /></details>
            <button disabled={busy} className="button-secondary" onClick={() => {
              setRes({ ...res, changeset: review.guardedChangeSet }); setColumnText({}); setReview(null); setError("");
            }}>Use guarded version for further editing</button>
          </div>}
          <details className="rounded-md border border-line p-3">
            <summary className="cursor-pointer font-semibold">Edit the three columns (one item per line)</summary>
            {(["problemStatus", "priorDecisions", "newProposals"] as const).map((k) => (
              <label key={k} className="mt-2 block text-sm font-semibold">{k}
                <textarea disabled={publishing} className="mt-1 w-full rounded border border-line p-2 font-normal" rows={3}
                  value={columnText[k] ?? res.changeset[k].map((x) => x.text).join("\n")} onChange={(e) => edit(k, e.target.value)} />
              </label>
            ))}
          </details>
          {((res.changeset.revisedAnswers?.length ?? 0) + (res.changeset.revisedBrief?.length ?? 0)) > 0 && (
            <details className="rounded-md border border-line p-3" open={[...res.changeset.guardrails.notes, ...(review?.warnings ?? [])].some((n) => /^(Q\d\d|brief)/.test(n))}>
              <summary className="cursor-pointer font-semibold">Review the new state (edit or remove any revised text)</summary>
              {(["revisedBrief", "revisedAnswers"] as const).map((k) => (res.changeset[k] ?? []).map((x, i) => {
                const label = "id" in x ? (x as { id: string }).id : `brief "${(x as { theme: string }).theme}"`;
                return (
                  <div key={`${k}${i}`} className={`mt-3 rounded border p-2 ${flagged(label) ? "border-blocker bg-blocker/5" : "border-line"}`}>
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                      <span>{label}{flagged(label) && <span className="ml-2 text-blocker">flagged by guardrails</span>}</span>
                      <button disabled={publishing} onClick={() => editRevised(k, i, null)} className="rounded border border-line px-2 py-0.5 font-normal hover:border-blocker">Remove</button>
                    </div>
                    <textarea disabled={publishing} className="mt-1 w-full rounded border border-line p-2 text-sm" rows={3} value={x.text}
                      onChange={(e) => editRevised(k, i, e.target.value)} />
                  </div>
                );
              }))}
            </details>
          )}
          <details className="rounded-md border border-line p-3">
            <summary className="cursor-pointer font-semibold">What the system read in the file ({res.segments.length} passages)</summary>
            <ul className="quote mt-2 max-h-64 overflow-auto text-sm">{res.segments.map((s, i) => <li key={i}><span className="text-muted">{s.src} · {s.loc}</span> {s.text}</li>)}</ul>
          </details>
          <div className="flex gap-3">
            <button onClick={publish} disabled={!!busy} className="button-primary disabled:opacity-50">Publish as a new version</button>
            <button disabled={busy} onClick={() => { setRes(null); setReview(null); setMood("idle"); }} className="button-secondary">Discard</button>
          </div>
        </section>
      )}
    </div>
  );
}
