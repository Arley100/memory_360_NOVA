"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const ctrl = useRef<AbortController | null>(null);
  const analyzing = startedAt !== null;

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
    if (!files.length || analyzing) return;
    const total = files.reduce((n, f) => n + f.size, 0);
    if (total > 4.3 * 1024 * 1024 && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      setError("These files are larger than the hosted demo accepts (4.5 MB per upload). Compress them, upload fewer at once, or use the local version.");
      return;
    }
    setError(""); setRes(null); setElapsed(0); setStartedAt(Date.now()); setStages(PLAN);
    setNames(files.map((f) => f.name).join(" + ")); setMood("reading"); setCaption(CAPTION.read);
    const fd = new FormData(); files.forEach((f) => fd.append("file", f));
    const c = new AbortController(); ctrl.current = c;
    try {
      const r = await fetch("/api/update/analyze", { method: "POST", body: fd, signal: c.signal });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        if (r.status === 401 && j.needCode) { setNeedCode(() => () => upload(files)); setMood("idle"); return; }
        throw new Error(j.error ?? (r.status === 504 ? "The server timed out. Try again, or use fewer files." : `Server error ${r.status}.`));
      }
      await readStream(r, (m) => {
        if (ctrl.current !== c) return;
        if (m.type === "stage") {
          const st = String(m.stage);
          setStages((list) => list.map((s) => (s.stage === st ? { ...s, status: m.status as StageItem["status"], detail: (m.detail as string) ?? s.detail } : s)));
          if (m.status === "start") { setCaption(CAPTION[st] ?? ""); setMood(st === "guard" ? "checking" : st === "read" ? "reading" : "thinking"); }
        } else if (m.type === "result") { setMood("done"); setRes(m as unknown as Result); }
        else if (m.type === "error") throw new Error(String(m.error));
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") { setError((e as Error).message || String(e)); setMood("error"); }
    } finally {
      if (ctrl.current === c) { ctrl.current = null; setStartedAt(null); }
    }
  }

  async function publish() {
    if (!res || publishing) return;
    setPublishing(true);
    const r = await fetch("/api/update/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draftId: res.draftId, changeset: res.changeset }) });
    const j = await r.json();
    setPublishing(false);
    if (r.status === 401 && j.needCode) { setNeedCode(() => publish); return; }
    if (!r.ok) { setError(j.error); return; }
    router.push(`/?changed=${encodeURIComponent(j.id)}`); // the Overview highlights what this update changed
  }

  const edit = (k: "problemStatus" | "priorDecisions" | "newProposals", text: string) => {
    if (!res) return;
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
  const flagged = (label: string) => res?.changeset.guardrails.notes.some((n) => n.startsWith(label)) ?? false;
  const showWork = analyzing || (mood !== "idle" && !res);

  return (
    <div className="space-y-5">
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(Array.from(e.dataTransfer.files)); }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center ${analyzing ? "pointer-events-none cursor-wait opacity-50" : "cursor-pointer"} ${drag ? "border-primary bg-primary/5" : "border-line bg-surface"}`}>
        <span className="text-lg font-semibold">Drop the new information here (select all the files at once), or click to choose</span>
        <span className="text-sm text-muted">Any source: email (.eml), Word, PDF, Excel, PowerPoint, calendar invite (.ics), Teams/chat export (.json, .html), text, CSV, a screenshot, or a .zip of several files</span>
        <input type="file" multiple disabled={analyzing} className="sr-only" onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </label>
      {needCode && <CodeGate onUnlocked={() => { const retry = needCode; setNeedCode(null); retry(); }} />}

      {showWork && (
        <section className="grid gap-6 rounded-lg border border-primary/20 bg-primary/5 p-5 md:grid-cols-[12rem_1fr]" aria-live="polite">
          <div className="space-y-2 text-center">
            <Memo mood={mood} />
            <p className="font-semibold">{mood === "error" ? "Something went wrong." : caption}</p>
            {analyzing && <p className="text-sm text-muted"><span className="tabular-nums">{elapsed} s</span> · {elapsed < 60 ? "usually 30 to 90 seconds" : elapsed < 150 ? "still working" : "unusually long: wait or cancel"}</p>}
            {analyzing && <button onClick={cancel} className="rounded border border-line bg-white px-3 py-1 text-sm hover:border-blocker">Cancel</button>}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted">New information: <span className="font-semibold text-ink">{names}</span></p>
            <StageList stages={stages} />
          </div>
        </section>
      )}
      {error && <p className="rounded-md border border-blocker/40 bg-blocker/5 p-3 text-blocker">{error}</p>}

      {res && (
        <section className="reveal space-y-4 rounded-lg border-2 border-marker bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Memo mood="done" size="sm" />
            <h2 className="text-2xl font-bold">Review before publishing: {res.changeset.filename}</h2>
          </div>
          <ChangeSetView cs={res.changeset} animate />
          <details className="rounded-md border border-line p-3">
            <summary className="cursor-pointer font-semibold">Edit the three columns (one item per line)</summary>
            {(["problemStatus", "priorDecisions", "newProposals"] as const).map((k) => (
              <label key={k} className="mt-2 block text-sm font-semibold">{k}
                <textarea className="mt-1 w-full rounded border border-line p-2 font-normal" rows={3}
                  defaultValue={res.changeset[k].map((x) => x.text).join("\n")} onBlur={(e) => edit(k, e.target.value)} />
              </label>
            ))}
          </details>
          {((res.changeset.revisedAnswers?.length ?? 0) + (res.changeset.revisedBrief?.length ?? 0)) > 0 && (
            <details className="rounded-md border border-line p-3" open={res.changeset.guardrails.notes.some((n) => /^(Q\d\d|brief)/.test(n))}>
              <summary className="cursor-pointer font-semibold">Review the new state (edit or remove any revised text)</summary>
              {(["revisedBrief", "revisedAnswers"] as const).map((k) => (res.changeset[k] ?? []).map((x, i) => {
                const label = "id" in x ? (x as { id: string }).id : `brief "${(x as { theme: string }).theme}"`;
                return (
                  <div key={`${k}${i}`} className={`mt-3 rounded border p-2 ${flagged(label) ? "border-blocker bg-blocker/5" : "border-line"}`}>
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                      <span>{label}{flagged(label) && <span className="ml-2 text-blocker">flagged by guardrails</span>}</span>
                      <button onClick={() => editRevised(k, i, null)} className="rounded border border-line px-2 py-0.5 font-normal hover:border-blocker">Remove</button>
                    </div>
                    <textarea className="mt-1 w-full rounded border border-line p-2 text-sm" rows={3} defaultValue={x.text}
                      onBlur={(e) => editRevised(k, i, e.target.value)} />
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
            <button onClick={publish} disabled={publishing} className="rounded-md bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50">{publishing ? "Publishing…" : "Publish as a new version"}</button>
            <button onClick={() => { setRes(null); setMood("idle"); }} className="rounded-md border border-line px-5 py-2">Discard</button>
          </div>
        </section>
      )}
    </div>
  );
}
