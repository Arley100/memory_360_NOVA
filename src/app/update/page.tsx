import { ChangeSetView } from "@/components/ChangeSetView";
import { updates } from "@/lib/store";
import { fmtDateTime } from "@/lib/text";
import { UpdateClient } from "./UpdateClient";
import { ResetButton } from "./ResetButton";

export default async function Update() {
  const ups = await updates();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Add new information</h1>
        <p className="max-w-3xl text-muted">Drop any file. Mémoire 360 reads it, separates problem status, prior decisions and new proposals, lists what is affected and what to do, then checks guardrails. Publishing creates a new version; the Sept 30 baseline is never modified.</p>
      </div>
      <UpdateClient />
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Published versions</h2>
          <ResetButton count={ups.length} />
        </div>
        <p className="rounded-md border border-line bg-surface p-3"><strong>Baseline</strong> · Sept 30, 2026, 09:00 · 64 files · frozen</p>
        {ups.length === 0 && <p className="text-muted">No update yet.</p>}
        {ups.slice().reverse().map((u) => (
          <article key={u.cs.id} className="rounded-lg border border-line bg-canvas p-4">
            <h3 className="mb-2 text-xl font-bold">{u.cs.id} · {u.cs.filename} <span className="text-sm font-normal text-muted">published {fmtDateTime(u.cs.publishedAt)}</span></h3>
            <ChangeSetView cs={u.cs} />
          </article>
        ))}
      </section>
    </div>
  );
}
