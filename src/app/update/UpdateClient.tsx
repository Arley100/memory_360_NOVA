"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChangeSetView } from "@/components/ChangeSetView";
import { CodeGate } from "@/components/CodeGate";
import type { ChangeSet, Segment } from "@/lib/types";


export function UpdateClient() {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [drag, setDrag] = useState(false);
  const [res, setRes] = useState<{ draftId: string; segments: Segment[]; changeset: ChangeSet } | null>(null);
  const [error, setError] = useState("");
  const [needCode, setNeedCode] = useState<null | (() => void)>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const ctrl = useRef<AbortController | null>(null);
  const analyzing = startedAt !== null;

  // Running counter while the analysis runs, so a long wait never looks like a freeze.
  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [startedAt]);

  function cancel() {
    ctrl.current?.abort();
    ctrl.current = null;
    setStartedAt(null); setBusy("");
    setError("Analysis cancelled. Nothing was published; you can upload again.");
  }

  async function upload(files: File[]) {
    if (!files.length || analyzing) return;
    const total = files.reduce((n, f) => n + f.size, 0);
    if (total > 4.3 * 1024 * 1024 && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      setError("These files are larger than the hosted demo accepts (4.5 MB per upload). Compress them, upload fewer at once, or use the local version.");
      return;
    }
    setError(""); setRes(null); setElapsed(0); setStartedAt(Date.now());
    setBusy(`${files.length > 1 ? `${files.length} files` : files[0].name}: reading, then comparing with the whole project`);
    const fd = new FormData(); files.forEach((f) => fd.append("file", f));
    const c = new AbortController(); ctrl.current = c;
    try {
      const r = await fetch("/api/update/analyze", { method: "POST", body: fd, signal: c.signal });
      const text = await r.text();
      let j: { error?: string; needCode?: boolean; draftId?: string } & Record<string, unknown>;
      try { j = JSON.parse(text); } catch { throw new Error(r.status === 504 ? "The server timed out. Try again, or use fewer files." : `Server error ${r.status}.`); }
      if (r.status === 401 && j.needCode) { setNeedCode(() => () => upload(files)); return; }
      if (!r.ok) throw new Error(j.error ?? `Server error ${r.status}.`);
      setRes(j as unknown as { draftId: string; segments: Segment[]; changeset: ChangeSet });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || String(e));
    } finally {
      if (ctrl.current === c) { ctrl.current = null; setStartedAt(null); setBusy(""); }
    }
  }
  async function publish() {
    if (!res) return;
    setBusy("Publishing…");
    const r = await fetch("/api/update/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draftId: res.draftId, changeset: res.changeset }) });
    const j = await r.json();
    setBusy("");
    if (r.status === 401 && j.needCode) { setNeedCode(() => publish); return; }
    if (!r.ok) { setError(j.error); return; }
    setRes(null); router.refresh();
  }
  const edit = (k: "problemStatus" | "priorDecisions" | "newProposals", text: string) => {
    if (!res) return;
    const lines = text.split("\n").map((t) => t.trim()).filter(Boolean);
    const old = res.changeset[k];
    const next = lines.map((t, i) => ({ ...(old[i] ?? { citations: [] }), text: t }));
    setRes({ ...res, changeset: { ...res.changeset, [k]: next } });
  };

  const editRevised = (k: "revisedAnswers" | "revisedBrief", i: number, text: string | null) => {
    if (!res) return;
    const list = [...(res.changeset[k] ?? [])];
    if (text === null) list.splice(i, 1); else list[i] = { ...list[i], text };
    setRes({ ...res, changeset: { ...res.changeset, [k]: list } });
  };
  const flagged = (label: string) => res?.changeset.guardrails.notes.some((n) => n.startsWith(label)) ?? false;

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
      {analyzing && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-primary" aria-hidden />
          <span className="font-semibold text-primary">{busy}</span>
          <span className="tabular-nums text-muted">{elapsed} s</span>
          <span className="text-sm text-muted">
            {elapsed < 60 ? "The deep analysis usually takes 30 to 90 seconds." : elapsed < 150 ? "Still working: long files take longer." : "Taking unusually long. You can wait or cancel."}
          </span>
          <button onClick={cancel} className="ml-auto rounded border border-line bg-white px-3 py-1 text-sm hover:border-blocker">Cancel</button>
        </div>
      )}
      {busy && !analyzing && <p role="status" className="font-semibold text-primary">{busy}</p>}
      {error && <p className="rounded-md border border-blocker/40 bg-blocker/5 p-3 text-blocker">{error}</p>}
      {res && (
        <section className="space-y-4 rounded-lg border-2 border-marker bg-surface p-5">
          <h2 className="text-2xl font-bold">Review before publishing: {res.changeset.filename}</h2>
          <ChangeSetView cs={res.changeset} />
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
            <summary className="cursor-pointer font-semibold">What the system read in the file ({res.segments.length} segments)</summary>
            <ul className="quote mt-2 max-h-64 overflow-auto text-sm">{res.segments.map((s, i) => <li key={i}><span className="text-muted">{s.src} · {s.loc}</span> {s.text}</li>)}</ul>
          </details>
          <div className="flex gap-3">
            <button onClick={publish} className="rounded-md bg-primary px-5 py-2 font-semibold text-white">Publish as a new version</button>
            <button onClick={() => setRes(null)} className="rounded-md border border-line px-5 py-2">Discard</button>
          </div>
        </section>
      )}
    </div>
  );
}
