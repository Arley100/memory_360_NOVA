"use client";
import { frenchText } from "@/lib/frenchContent";
import { frenchLabel } from "@/lib/locale";
import { useState } from "react";
import { Chip, Tag } from "@/components/Chip";
import { citationKey, type ChatMessage } from "@/lib/chatTypes";
import { useNovaChat } from "./NovaChatProvider";

export function NovaChatMessage({ message }: { message: ChatMessage }) {
  const chat = useNovaChat();
  const [copied, setCopied] = useState(false);
  const a = message.answer;
  if (message.role === "user")
    return (
      <article className="nova-user-message">
        <span className="sr-only">Vous : </span>
        {message.text}
      </article>
    );
  if (!a)
    return (
      <article
        className={`nova-status-message ${message.error ? "is-error" : ""}`}
      >
        <p>{message.text}</p>
        {message.retryQuestion && (
          <button
            disabled={chat.busy}
            onClick={() =>
              void chat.send(message.retryQuestion!, message.retryMode, true)
            }
          >
            Réessayer
          </button>
        )}
      </article>
    );
  const fr = a.language === "fr";
  const stale =
    a.context.mode === "current" &&
    a.context.contextKey !== chat.meta.contextKey;
  const labels: Record<string, string> = fr
    ? {
        warning: "Nuance importante",
        contradiction: "Documents contradictoires",
        "documented-action": "Engagement documenté",
        recommendation: "Recommandation de l’Assistant NOVA",
        missing: "Non documenté",
      }
    : {
        warning: "Nuance importante",
        contradiction: "Documents contradictoires",
        "documented-action": "Engagement documenté",
        recommendation: "Recommandation de l’Assistant NOVA",
        missing: "Non documenté",
      };
  const evidenceLabel =
    a.evidenceStatus === "full"
      ? fr
        ? "Bien étayé"
        : "Bien étayé"
      : a.evidenceStatus === "partial"
        ? fr
          ? "Partiellement étayé"
          : "Partiellement étayé"
        : fr
          ? "Preuves documentées insuffisantes"
          : "Preuves documentées insuffisantes";
  async function copy() {
    if (!a) return;
    try {
      await navigator.clipboard.writeText(
        [
          a.context.mode === "baseline"
            ? "Référence · 30 sept. 2026 · 9 h Montréal"
            : `Actuel · ${a.context.updateIds.join(" · ") || "corpus de référence"}`,
          ...a.blocks.map(
            (b) =>
              `${labels[b.type] ? labels[b.type] + ": " : ""}${b.text}${b.evidence === "unsupported" ? " [Preuves non vérifiables]" : ""} ${b.citations.map((c) => `[${a!.citations.findIndex((x) => citationKey(x) === citationKey(c)) + 1}]`).join("")}`,
          ),
          ...a.missing.map((m) => `Non documenté : ${m}`),
          ...a.citations.map(
            (c, i) =>
              `[${i + 1}] ${frenchText(c.title)} · ${c.label}\n“${c.quote}”`,
          ),
        ].join("\n\n"),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <article
      className="nova-answer reveal"
      aria-label={
        fr ? "Réponse de l’Assistant NOVA" : "Réponse de l’Assistant NOVA"
      }
    >
      <header className="nova-answer-header">
        <strong>Assistant NOVA</strong>
        <span>
          {a.context.mode === "baseline"
            ? "Référence · 30 sept. · 9 h Montréal"
            : `État actuel${a.context.updateIds.length ? " · " + a.context.updateIds.join(" · ") : " · corpus de référence"}`}
        </span>
      </header>
      {stale && (
        <div className="nova-stale">
          <p>
            {fr
              ? "Les informations du projet ont changé depuis cette réponse."
              : "Les informations du projet ont changé depuis cette réponse."}
          </p>
          <button
            disabled={chat.busy}
            onClick={() => void chat.send(a.question, "current")}
          >
            {fr
              ? "Revérifier avec les informations actuelles"
              : "Revérifier avec les informations actuelles"}
          </button>
        </div>
      )}
      {a.blocks.map((b) => (
        <section
          key={b.id}
          className={`nova-block nova-block--${b.type}${b.evidence === "unsupported" ? " nova-unsupported" : ""}`}
        >
          {labels[b.type] && <p className="section-label">{labels[b.type]}</p>}
          {b.tag && <Tag t={b.tag} />}
          {b.type === "heading" ? (
            <h3>{b.text}</h3>
          ) : (
            <p>
              {b.text}{" "}
              <span className="nova-inline-citations">
                {b.citations.map((c) => (
                  <Chip
                    key={citationKey(c)}
                    c={c}
                    variant="number"
                    index={
                      a.citations.findIndex(
                        (x) => citationKey(x) === citationKey(c),
                      ) + 1
                    }
                  />
                ))}
              </span>
            </p>
          )}
          {b.evidence === "unsupported" && (
            <p className="nova-evidence-warning">
              {fr
                ? "Les preuves n’ont pas pu être vérifiées. Cette affirmation reste incertaine."
                : "Les preuves n’ont pas pu être vérifiées. Cette affirmation reste incertaine."}
            </p>
          )}
        </section>
      ))}
      {a.missing.length > 0 && (
        <section className="nova-block nova-block--missing">
          <p className="section-label">{labels.missing}</p>
          <ul>
            {a.missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}
      {a.citations.length > 0 && (
        <details className="nova-sources">
          <summary>
            {fr ? "Sources utilisées" : "Sources utilisées"} ·{" "}
            {a.citations.length}
          </summary>
          <ol>
            {a.citations.map((c, i) => (
              <li key={citationKey(c)}>
                <Chip c={c} variant="number" index={i + 1} />
                <strong>{frenchText(c.title)}</strong>
                <p>
                  {c.label} · {frenchLabel(c.authority)} ·{" "}
                  {fr ? "Citation vérifiée" : "Citation vérifiée"}
                </p>
                <p className="nova-source-filename">
                  {c.path?.split("/").at(-1)}
                </p>
                <blockquote className="quote">“{c.quote}”</blockquote>
                {c.duplicateOf && (
                  <p className="nova-evidence-warning">
                    Copie identique de {c.duplicateOf} ; aucune confirmation
                    indépendante.
                  </p>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
      <footer className="nova-answer-footer">
        <span
          title={`${a.provider} · ${a.model} · ${a.dropped} citation(s) rejetée(s)`}
        >
          {new Date(a.answeredAt).toLocaleTimeString("fr-CA", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {new Set(a.citations.map((c) => c.duplicateOf ?? c.src)).size}{" "}
          {fr ? "sources vérifiées" : "sources vérifiées"} · {evidenceLabel}
        </span>
        <button onClick={() => void copy()}>
          {copied
            ? fr
              ? "Copié"
              : "Copié"
            : fr
              ? "Copier"
              : "Copier la réponse"}
        </button>
      </footer>
      {a.followUps.length > 0 && (
        <div
          className="nova-suggestions"
          aria-label={fr ? "Questions de suivi" : "Questions de suivi"}
        >
          {a.followUps.map((q, i) => (
            <button
              key={i}
              disabled={chat.busy}
              onClick={() => void chat.send(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
