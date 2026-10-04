import type { StageItem } from "@/components/Memo";

const STATE_TEXT = { pending: "Pending", start: "In progress", done: "Complete", error: "Failed" };

export function BuildSteps({ stages }: { stages: StageItem[] }) {
  return <ol className="panel build-steps" aria-label="Build steps">
    {stages.map((stage) => <li key={stage.stage} className={`build-step build-step--${stage.status}`}>
      <span key={stage.status} className={`build-step__marker${stage.status === "start" || stage.status === "done" ? " flash-marker" : ""}`} aria-hidden="true">
        {stage.status === "done" && <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 10 3.5 3.5L15 6" /></svg>}
        {stage.status === "start" && <span className="build-step__dots"><i /><i /><i /></span>}
        {stage.status === "error" && <span>!</span>}
      </span>
      <div className="min-w-0 flex-1">
        <div className="build-step__heading"><p>{stage.label}</p><span className="build-step__state">{STATE_TEXT[stage.status]}</span></div>
        {stage.total !== undefined && stage.status === "start" && <div className="build-step__progress">
          <div className="progress-track" role="progressbar" aria-label={stage.label} aria-valuemin={0} aria-valuenow={stage.done ?? 0} aria-valuemax={stage.total}>
            <div style={{ width: `${Math.min(100, Math.max(0, ((stage.done ?? 0) / Math.max(1, stage.total)) * 100))}%` }} />
          </div><span>{stage.done ?? 0} / {stage.total}</span>
        </div>}
        {stage.detail && <p key={`${stage.status}:${stage.detail}`} className={`build-step__detail${stage.status === "done" ? " reveal" : ""}`}>{stage.detail}</p>}
      </div>
    </li>)}
  </ol>;
}
