"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChangeSetView } from "@/components/ChangeSetView";
import type { ChangeSet, Segment } from "@/lib/types";

const ACCEPT = ".eml,.txt,.md,.csv,.pdf,.xlsx,.png,.jpg,.jpeg,.docx";

export function UpdateClient() {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [drag, setDrag] = useState(false);
  const [res, setRes] = useState<{ draftId: string; segments: Segment[]; changeset: ChangeSet } | null>(null);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError(""); setRes(null); setBusy("Reading the file and matching it to the project…");
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch("/api/update/analyze", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error); setRes(j);
    } catch (e) { setError(String(e)); }
    setBusy("");
  }
  async function publish() {
    if (!res) return;
    setBusy("Publishing…");
    const r = await fetch("/api/update/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draftId: res.draftId, changeset: res.changeset }) });
    const j = await r.json();
    setBusy("");
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

  return (
    <div className="space-y-5">
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center ${drag ? "border-primary bg-primary/5" : "border-line bg-surface"}`}>
        <span className="text-lg font-semibold">Drop the new file here, or click to choose it</span>
        <span className="text-sm text-muted">Email (.eml with attachments), text, Markdown, CSV, PDF, Excel, screenshot (.png/.jpg) or Word (.docx)</span>
        <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </label>
      {busy && <p role="status" className="font-semibold text-primary">{busy}</p>}
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
