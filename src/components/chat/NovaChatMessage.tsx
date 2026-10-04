"use client";
import { useState } from "react";
import { Chip, Tag } from "@/components/Chip";
import { citationKey, type ChatMessage } from "@/lib/chatTypes";
import { useNovaChat } from "./NovaChatProvider";

export function NovaChatMessage({ message }: { message: ChatMessage }) {
  const chat = useNovaChat();
  const [copied, setCopied] = useState(false);
  const a = message.answer;
  if (message.role === "user") return <article className="nova-user-message"><span className="sr-only">You: </span>{message.text}</article>;
  if (!a) return <article className={`nova-status-message ${message.error ? "is-error" : ""}`}><p>{message.text}</p>{message.retryQuestion && <button disabled={chat.busy} onClick={() => void chat.send(message.retryQuestion!, message.retryMode, true)}>Retry</button>}</article>;
  const fr = a.language === "fr";
  const stale = a.context.mode === "current" && a.context.contextKey !== chat.meta.contextKey;
  const labels: Record<string, string> = fr ? { warning: "Nuance importante", contradiction: "Documents contradictoires", "documented-action": "Engagement documenté", recommendation: "Recommandation de NOVA Assistant", missing: "Non documenté" } : { warning: "Important nuance", contradiction: "Conflicting records", "documented-action": "Documented commitment", recommendation: "NOVA Assistant recommendation", missing: "Not documented" };
  const evidenceLabel = a.evidenceStatus === "full" ? (fr ? "Bien étayé" : "Well supported") : a.evidenceStatus === "partial" ? (fr ? "Partiellement étayé" : "Partially supported") : (fr ? "Preuves documentées insuffisantes" : "Insufficient documented evidence");
  async function copy() {
    if (!a) return;
    try {
      await navigator.clipboard.writeText([a.context.mode === "baseline" ? "Baseline · Sep 30, 2026 · 09:00 Montréal" : `Current · ${a.context.updateIds.join(" · ") || "baseline corpus"}`, ...a.blocks.map((b) => `${labels[b.type] ? labels[b.type] + ": " : ""}${b.text}${b.evidence === "unsupported" ? " [Evidence could not be verified]" : ""} ${b.citations.map((c) => `[${a!.citations.findIndex((x) => citationKey(x) === citationKey(c)) + 1}]`).join("")}`), ...a.missing.map((m) => `Not documented: ${m}`), ...a.citations.map((c, i) => `[${i + 1}] ${c.title} · ${c.label}\n“${c.quote}”`)].join("\n\n"));
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  }
  return <article className="nova-answer reveal" aria-label={fr ? "Réponse de NOVA Assistant" : "NOVA Assistant answer"}>
    <header className="nova-answer-header"><strong>NOVA Assistant</strong><span>{a.context.mode === "baseline" ? "Baseline · Sep 30 · 09:00 Montréal" : `Current state${a.context.updateIds.length ? " · " + a.context.updateIds.join(" · ") : " · baseline corpus"}`}</span></header>
    {stale && <div className="nova-stale"><p>{fr ? "Les informations du projet ont changé depuis cette réponse." : "Project information changed after this answer was produced."}</p><button disabled={chat.busy} onClick={() => void chat.send(a.question, "current")}>{fr ? "Revérifier avec les informations actuelles" : "Recheck with current information"}</button></div>}
    {a.blocks.map((b) => <section key={b.id} className={`nova-block nova-block--${b.type}${b.evidence === "unsupported" ? " nova-unsupported" : ""}`}>
      {labels[b.type] && <p className="section-label">{labels[b.type]}</p>}
      {b.tag && <Tag t={b.tag} />}
      {b.type === "heading" ? <h3>{b.text}</h3> : <p>{b.text} <span className="nova-inline-citations">{b.citations.map((c) => <Chip key={citationKey(c)} c={c} variant="number" index={a.citations.findIndex((x) => citationKey(x) === citationKey(c)) + 1} />)}</span></p>}
      {b.evidence === "unsupported" && <p className="nova-evidence-warning">{fr ? "Les preuves n’ont pas pu être vérifiées. Cette affirmation reste incertaine." : "Evidence could not be verified. This claim remains uncertain."}</p>}
    </section>)}
    {a.missing.length > 0 && <section className="nova-block nova-block--missing"><p className="section-label">{labels.missing}</p><ul>{a.missing.map((m, i) => <li key={i}>{m}</li>)}</ul></section>}
    {a.citations.length > 0 && <details className="nova-sources"><summary>{fr ? "Sources utilisées" : "Sources used"} · {a.citations.length}</summary><ol>{a.citations.map((c, i) => <li key={citationKey(c)}>
      <Chip c={c} variant="number" index={i + 1} /><strong>{c.title}</strong><p>{c.label} · {c.authority?.toLowerCase().replaceAll("_", " ")} · {fr ? "Citation vérifiée" : "Quote verified"}</p><p className="nova-source-filename">{c.path?.split("/").at(-1)}</p><blockquote className="quote">“{c.quote}”</blockquote>{c.duplicateOf && <p className="nova-evidence-warning">Identical copy of {c.duplicateOf}; not independent corroboration.</p>}
    </li>)}</ol></details>}
    <footer className="nova-answer-footer"><span title={`${a.provider} · ${a.model} · ${a.dropped} rejected citation(s)`}>{new Date(a.answeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {new Set(a.citations.map((c) => c.duplicateOf ?? c.src)).size} {fr ? "sources vérifiées" : "verified sources"} · {evidenceLabel}</span><button onClick={() => void copy()}>{copied ? (fr ? "Copié" : "Copied") : (fr ? "Copier" : "Copy answer")}</button></footer>
    {a.followUps.length > 0 && <div className="nova-suggestions" aria-label={fr ? "Questions de suivi" : "Suggested follow-ups"}>{a.followUps.map((q, i) => <button key={i} disabled={chat.busy} onClick={() => void chat.send(q)}>{q}</button>)}</div>}
  </article>;
}
