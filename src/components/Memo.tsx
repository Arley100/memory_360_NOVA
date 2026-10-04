// Mémo: the system's presence. Its look follows what the server is really doing:
// reading files, thinking (model working), checking citations, done or error.
export type Mood = "idle" | "reading" | "thinking" | "checking" | "done" | "error";

import { Icon } from "./UI";
export { readStream } from "@/lib/stream";

export function Memo({ mood, size = "lg" }: { mood: Mood; size?: "sm" | "lg" }) {
  return <span className={size === "lg" ? "upload-icon mx-auto" : "inline-flex shrink-0 text-primary"} aria-hidden="true">
    <Icon name={mood === "done" ? "check" : mood === "error" ? "warning" : "sources"} size={size === "lg" ? 24 : 18} />
  </span>;
}

export type StageItem = { stage: string; label: string; status: "pending" | "start" | "done" | "error"; detail?: string; done?: number; total?: number };

export function StageList({ stages }: { stages: StageItem[] }) {
  return (
    <ol className="panel divide-y divide-line" aria-label="Étapes">
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
  );
}
