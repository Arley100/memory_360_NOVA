export type MemoryOrbState = "idle" | "building" | "success" | "error";

// Decorative reinforcement of the real status text beside it.
export function MemoryOrb({ state }: { state: MemoryOrbState }) {
  return <div key={state} className={`memory-orb memory-orb--${state}${state === "idle" ? "" : " memo-pop"}`} aria-hidden="true" data-state={state}>
    {state === "building" && <div className="memory-orb__orbit memo-orbit" />}
    <div className={`memory-orb__sphere${state === "error" ? "" : " memo-breathe"}`}>
      {state === "success" && <svg className="memory-orb__symbol" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 25 8 8 16-18" /></svg>}
      {state === "error" && <svg className="memory-orb__symbol" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M24 13v15M24 35h.01" /></svg>}
    </div>
  </div>;
}
