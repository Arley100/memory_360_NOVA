import { PageHeader } from "@/components/UI";
import { ChangeSetView } from "@/components/ChangeSetView";
import { updates } from "@/lib/store";
import { fmtDateTime } from "@/lib/text";
import { UpdateClient } from "./UpdateClient";
import { ResetButton } from "./ResetButton";

export default async function Update() {
  const ups = await updates();
  return (
    <div className="space-y-8">
      <PageHeader title="Add new information" subtitle={<>Drop any file. With a configured AI provider, Mémoire 360 analyzes it, separates problem status, prior decisions and new proposals, and lists impacts and actions. Without a provider, review extracted text and edit the three columns only. Publishing checks guardrails and creates a new version; the Sept 30 baseline is never modified.</>} />
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
            <summary className="version-summary">{u.cs.id} · {u.cs.filename} <span className="text-sm font-normal text-muted">published {fmtDateTime(u.cs.publishedAt)}</span></summary>
            <div className="p-5"><ChangeSetView cs={u.cs} /></div>
          </details>
        ))}
      </section>
    </div>
  );
}
