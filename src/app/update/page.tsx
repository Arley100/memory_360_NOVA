import { PageHeader } from "@/components/UI";
import { ChangeSetView } from "@/components/ChangeSetView";
import { updates } from "@/lib/store";
import { UpdateClient } from "./UpdateClient";
import { ResetButton } from "./ResetButton";

export default async function Update() {
  const ups = await updates();
  return (
    <div className="space-y-8">
      <PageHeader title="Add new information" subtitle={<>Drop any file. Mémoire 360 reads it, separates problem status, prior decisions and new proposals, lists what is affected and what to do, then checks guardrails. Publishing creates a new version; the Sept 30 baseline is never modified.</>} />
      <UpdateClient />
      <section className="version-history space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Published versions</h2>
          <ResetButton count={ups.length} />
        </div>
        <p className="baseline-version"><strong>Baseline</strong> · Sept 30, 2026, 09:00 · 64 files · frozen</p>
        {ups.length === 0 && <p className="text-muted">No update yet.</p>}
        {ups.slice().reverse().map((u) => (
          <details key={u.cs.id} className="published-version">
            <summary className="version-summary">{u.cs.id} · {u.cs.filename} <span className="text-sm font-normal text-muted">published {u.cs.publishedAt?.slice(0, 16).replace("T", " ")}</span></summary>
            <div className="p-5"><ChangeSetView cs={u.cs} /></div>
          </details>
        ))}
      </section>
    </div>
  );
}
