// Mémo: the system's presence. Its look follows what the server is really doing:
// reading files, thinking (model working), checking citations, done or error.
export type Mood = "idle" | "reading" | "thinking" | "checking" | "done" | "error";

const COLOR: Record<Mood, string> = { idle: "#8aa0b8", reading: "#0e4c92", thinking: "#3b6fd4", checking: "#d99a00", done: "#1e7a4c", error: "#b42318" };

export function Memo({ mood, size = "lg" }: { mood: Mood; size?: "sm" | "lg" }) {
  const color = COLOR[mood];
  const busy = mood === "reading" || mood === "thinking" || mood === "checking";
  const box = size === "lg" ? "h-40 w-40" : "h-11 w-11";
  const inset = size === "lg" ? "inset-4" : "inset-1";
  return (
    <div className={`relative shrink-0 ${box} ${size === "lg" ? "mx-auto" : ""}`} aria-hidden>
      <div className={`absolute inset-0 rounded-full blur-xl transition-colors duration-700 ${busy ? "memo-breathe" : ""}`} style={{ background: color, opacity: 0.35 }} />
      <div className={`absolute ${inset} rounded-full transition-colors duration-700 ${busy ? "memo-breathe" : ""}`}
        style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${color} 55%, #0b1a33 100%)`, boxShadow: `0 0 ${size === "lg" ? 40 : 14}px ${color}66` }} />
      {busy && <div className={`absolute inset-0 rounded-full border-dashed ${size === "lg" ? "border-2" : "border"} ${mood === "checking" ? "memo-orbit-fast" : "memo-orbit"}`} style={{ borderColor: `${color}99` }} />}
      {mood === "done" && <div className={`memo-pop absolute inset-0 flex items-center justify-center text-white ${size === "lg" ? "text-5xl" : "text-lg"}`}>✓</div>}
      {mood === "error" && <div className={`absolute inset-0 flex items-center justify-center text-white ${size === "lg" ? "text-5xl" : "text-lg"}`}>!</div>}
    </div>
  );
}

export type StageItem = { stage: string; label: string; status: "pending" | "start" | "done" | "error"; detail?: string; done?: number; total?: number };

export function StageList({ stages }: { stages: StageItem[] }) {
  return (
    <ol className="divide-y divide-line rounded-lg border border-line bg-surface" aria-label="Steps">
      {stages.map((s) => (
        <li key={s.stage} className={`flex items-start gap-3 p-3 transition-colors ${s.status === "start" ? "bg-primary/5" : ""}`}>
          <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            s.status === "done" ? "memo-pop bg-validation text-white" : s.status === "error" ? "bg-blocker text-white" : s.status === "start" ? "memo-breathe bg-primary text-white" : "border border-line text-muted"}`}>
            {s.status === "done" ? "✓" : s.status === "error" ? "!" : s.status === "start" ? "…" : ""}
          </span>
          <div className="min-w-0 flex-1">
            <p className={s.status === "pending" ? "text-muted" : "font-semibold"}>{s.label}</p>
            {s.total !== undefined && s.status === "start" && (
              <div className="mt-1 h-2 overflow-hidden rounded bg-canvas" role="progressbar" aria-valuenow={s.done} aria-valuemax={s.total}>
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

// Reads a newline-delimited JSON stream, calling onMessage for each line.
export async function readStream(res: Response, onMessage: (m: Record<string, unknown>) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onMessage(JSON.parse(line));
  }
  if (buf.trim()) onMessage(JSON.parse(buf));
}
