"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CodeGate } from "@/components/CodeGate";

// Removes all published updates so the next rehearsal (or the real demo) starts from the Sept 30 baseline.
export function ResetButton({ count }: { count: number }) {
  const router = useRouter();
  const [needCode, setNeedCode] = useState(false);
  const [msg, setMsg] = useState("");
  async function reset() {
    if (!window.confirm(`Supprimer les ${count} mise(s) à jour publiée(s) et revenir à la référence du 30 septembre ? La référence reste intacte.`)) return;
    const r = await fetch("/api/update/reset", { method: "POST" });
    const j = await r.json();
    if (r.status === 401 && j.needCode) { setNeedCode(true); return; }
    setMsg(r.ok ? `Suppression de ${j.removed} update(s).` : j.error);
    router.refresh();
  }
  if (count === 0) return null;
  return (
    <div className="space-y-2">
      <button onClick={reset} className="rounded-md border border-blocker/50 px-4 py-2 text-blocker hover:bg-blocker/5">Revenir à la référence</button>
      {needCode && <CodeGate onUnlocked={() => { setNeedCode(false); reset(); }} />}
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
