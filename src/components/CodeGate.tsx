"use client";
import { useState } from "react";

// Shown when the hosted demo asks for its code. Unlocks this browser for 7 days, then retries the action.
export function CodeGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    setBusy(false);
    if (r.ok) onUnlocked(); else setErr((await r.json()).error ?? "Code incorrect.");
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-3">
      <label htmlFor="democode" className="font-semibold">Cette fonction utilise des crédits IA. Saisissez le code de démonstration :</label>
      <input id="democode" type="password" value={code} onChange={(e) => setCode(e.target.value)} autoFocus
        className="rounded border border-line bg-white px-2 py-1" autoComplete="off" />
      <button disabled={busy || !code} className="rounded bg-primary px-3 py-1 font-semibold text-white disabled:opacity-50">Déverrouiller</button>
      {err && <span className="text-blocker">{err}</span>}
    </form>
  );
}
