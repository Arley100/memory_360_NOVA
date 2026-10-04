"use client";
import { useEffect, useRef, useState } from "react";
import { CodeGate } from "@/components/CodeGate";
import { Memo } from "@/components/Memo";
import { clampOrb, panelRect, type Position } from "@/lib/chatState";
import { useNovaChat } from "./NovaChatProvider";
import { NovaChatMessage } from "./NovaChatMessage";
import { NewConversationDialog } from "./NewConversationDialog";
import { useMascotPersonality } from "./useMascotPersonality";

const suggestions = ["Qu’est-ce qui bloque actuellement la mise en production ?", "SEC-210 est-il formellement accepté ?", "Pourquoi le 22 octobre a-t-il été approuvé ?", "Qu’est-ce qui a changé depuis la référence ?", "Quelles actions sont prioritaires ?", "Quels documents du projet se contredisent ?"];
export function NovaChatWidget() {
  const { state, patch, ready, composer, launcher, busy, stage, detail, meta, send, needCode, unlock, minimize, openChat, newConversation, stop } = useNovaChat();
  const [viewport, setViewport] = useState({ width: 0, height: 0, sidebar: 248 });
  const [dragging, setDragging] = useState(false);
  const [newResponse, setNewResponse] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl+J");
  const [confirmNew, setConfirmNew] = useState(false);
  const newConversationButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; origin: Position; moved: boolean } | null>(null);
  const draggedClick = useRef(false), nearBottom = useRef(true);
  const scroll = useRef<HTMLDivElement>(null);
  const previousMascotState = useRef<{ reply: string; error: boolean } | null>(null);
  const latestMessage = state.messages.at(-1);
  const mascotReply = latestMessage?.role === "assistant" ? latestMessage.id : "";
  const mascotError = Boolean(latestMessage?.error);
  const mascot = useMascotPersonality({ ready, open: state.open, working: busy, dragging, error: mascotError, launcher });
  const position = state.launcherPosition;
  const anchorX = position?.x, anchorY = position?.y;
  useEffect(() => {
    if (!ready) return;
    const resize = () => {
      const width = window.innerWidth, height = window.visualViewport?.height ?? window.innerHeight;
      setViewport({ width, height, sidebar: parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width")) || 0 });
      const next = clampOrb({ x: anchorX ?? width - 82, y: anchorY ?? height - 82 }, width, height);
      if (next.x !== anchorX || next.y !== anchorY) patch({ launcherPosition: next });
    };
    // Initialize browser dimensions after hydration, then subscribe to viewport changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resize(); setShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘J" : "Ctrl+J");
    window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize); };
    // Position is the persisted anchor; re-register only when it changes.
  }, [ready, patch, anchorX, anchorY]);
  useEffect(() => {
    if (state.open) requestAnimationFrame(() => composer.current?.focus());
  }, [state.open, composer]);
  useEffect(() => {
    const el = scroll.current;
    if (el && nearBottom.current) { el.scrollTop = el.scrollHeight; }
    else if (el) setNewResponse(true);
  }, [state.messages.length, stage, state.open]);
  useEffect(() => {
    if (!ready) return;
    const button = launcher.current;
    const visual = button?.querySelector<HTMLElement>(".nova-orb-visual");
    const previous = previousMascotState.current;
    previousMascotState.current = { reply: mascotReply, error: mascotError };
    if (!button || !visual || !previous) return;
    const answerReady = Boolean(mascotReply && mascotReply !== previous.reply && !state.open && !dragging);
    const errorAppeared = mascotError && !previous.error && !dragging;
    if (answerReady) button.classList.add("is-ready");
    if (answerReady || errorAppeared) visual.classList.add("memo-pop");
    const expressionTimer = setTimeout(() => button.classList.remove("is-ready"), 350);
    const popTimer = setTimeout(() => visual.classList.remove("memo-pop"), 450);
    return () => {
      clearTimeout(expressionTimer); clearTimeout(popTimer);
      button.classList.remove("is-ready"); visual.classList.remove("memo-pop");
    };
  }, [ready, mascotReply, mascotError, state.open, dragging, launcher]);
  if (!ready || !position || !viewport.width) return null;
  const rect = panelRect(position, viewport.width, viewport.height, state.expanded, viewport.sidebar);
  const error = state.messages.at(-1)?.error;
  const hintSide = position.x + 29 > viewport.width / 2 ? "left" : "right";
  const hintWidth = Math.min(160, viewport.width - 16);
  const hintFits = hintSide === "left" ? position.x >= hintWidth + 18 : position.x + 68 + hintWidth <= viewport.width - 8;
  const hintLeft = Math.max(8, Math.min(hintSide === "left" ? position.x - hintWidth - 10 : position.x + 68, viewport.width - hintWidth - 8));
  const hintTop = Math.max(8, Math.min(hintFits ? position.y + 12 : position.y >= 52 ? position.y - 44 : position.y + 68, viewport.height - 42));
  const workingLabels: Record<string, string> = { read: "Lecture des fichiers du projet…", think: "Mise en relation des faits…", verify: "Vérification des preuves…", repair: "Revérification des passages justificatifs…" };
  function finish(e: React.PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    draggedClick.current = drag.current.moved || cancelled;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }
  function cancelNewConversation() {
    setConfirmNew(false);
    requestAnimationFrame(() => newConversationButton.current?.focus());
  }
  return <div className="nova-chat no-print">
    <button ref={launcher} type="button" className={`nova-orb ${state.open ? "is-open" : ""} ${busy ? "is-working" : ""} ${dragging ? "is-dragging" : ""} ${mascotError ? "has-error" : ""}`} data-reaction={mascot.reaction} style={{ left: position.x, top: position.y }}
      title={`Interroger NOVA · glisser pour déplacer · ${shortcut}${state.unread ? " · Réponse non lue" : error ? " · Échec de la réponse" : ""}`} aria-label={`${state.open ? "Fermer" : "Ouvrir"} l’Assistant NOVA. Glissez pour déplacer. ${shortcut}${busy ? ", réponse en cours" : state.unread ? ", réponse non lue" : error ? ", échec de la réponse" : ""}`} aria-expanded={state.open} aria-controls="nova-chat-panel"
      onPointerDown={(e) => { if (e.button !== 0) return; drag.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, origin: position, moved: false }; draggedClick.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerEnter={mascot.enter} onPointerLeave={mascot.leave}
      onPointerMove={(e) => { mascot.trackEyes(e); const d = drag.current; if (!d || e.pointerId !== d.pointerId) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 6) { if (!d.moved) mascot.dragStarted(); d.moved = true; } if (d.moved) { setDragging(true); patch({ launcherPosition: clampOrb({ x: d.origin.x + dx, y: d.origin.y + dy }, viewport.width, viewport.height) }); } }}
      onPointerUp={(e) => finish(e)} onPointerCancel={(e) => finish(e, true)} onLostPointerCapture={() => { if (drag.current) { draggedClick.current = true; drag.current = null; setDragging(false); } }}
      onClick={(e) => { if (e.detail !== 0 && draggedClick.current) { draggedClick.current = false; return; } mascot.clicked(!state.open); if (state.open) { setConfirmNew(false); minimize(); } else openChat(); }}>
      <span className="nova-orb-visual" aria-hidden="true"><span className="nova-mascot-float"><span className={`nova-orb-sphere${dragging ? "" : " memo-breathe"}`}>
        <span className="nova-mascot-eye nova-mascot-eye--left"><span className="nova-mascot-eye-shape" /></span><span className="nova-mascot-eye nova-mascot-eye--right"><span className="nova-mascot-eye-shape" /></span>
      </span></span></span>{busy && <span className="nova-orb-orbit memo-orbit" aria-hidden="true" />}
      {(state.unread || error) && <span className={`nova-orb-badge ${error ? "is-error" : ""}`} aria-hidden="true" />}
    </button>
    <button type="button" inert={!mascot.hintVisible} aria-hidden={!mascot.hintVisible} tabIndex={mascot.hintVisible ? 0 : -1} onPointerEnter={mascot.hintEnter} onPointerLeave={mascot.hintLeave} className={`nova-mascot-hint${mascot.hintVisible ? " is-visible" : ""} nova-mascot-hint--${hintSide}${hintFits ? "" : " nova-mascot-hint--stacked"}`} style={{ left: hintLeft, top: hintTop, width: hintWidth }} aria-label="Ouvrir l’Assistant NOVA" onClick={() => { mascot.clicked(true); openChat(); }}>Interrogez-moi sur NOVA</button>
    {state.open && <section id="nova-chat-panel" role="dialog" aria-modal="false" aria-labelledby="nova-chat-title" className="nova-chat-panel" style={rect} onKeyDown={(e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); minimize(); } }}>
      <div className="nova-chat-content" inert={confirmNew}>
      <header className="nova-chat-header"><div><h2 id="nova-chat-title">Assistant NOVA</h2><p>Mémoire opérationnelle du projet</p></div><div className="nova-header-controls">
        <button ref={newConversationButton} title="Nouvelle conversation" aria-label="Nouvelle conversation" disabled={busy} onClick={() => { if (state.messages.length || state.draft) setConfirmNew(true); else newConversation(); }}>＋</button>
        <button title={state.expanded ? "Réduire" : "Agrandir"} aria-label={state.expanded ? "Réduire l’assistant" : "Agrandir l’assistant"} aria-pressed={state.expanded} onClick={() => patch({ expanded: !state.expanded })}>{state.expanded ? "↙" : "↗"}</button>
        <button title="Minimiser" aria-label="Minimiser l’assistant" onClick={minimize}>−</button>
      </div></header>
      <div className="nova-context-bar"><label className="sr-only" htmlFor="nova-chat-mode">Contexte du projet</label><select id="nova-chat-mode" value={state.mode} disabled={busy} onChange={(e) => patch({ mode: e.target.value === "baseline" ? "baseline" : "current" })}>
        <option value="current">Actuel{meta.latestUpdateId ? ` · ${meta.latestUpdateId}` : " · corpus de référence"}</option><option value="baseline">Référence · 30 sept. 2026 · 9 h Montréal</option>
      </select><span>Fondé sur les preuves</span></div>
      <div ref={scroll} className="nova-messages" onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; if (nearBottom.current) setNewResponse(false); }}>
        {state.messages.some((m) => m.answer?.context.mode === "current" && m.answer.context.contextKey !== meta.contextKey) && <p className="nova-stale" role="status">Contexte du projet modifié : {meta.latestUpdateId ? `${meta.latestUpdateId} est désormais inclus.` : "les informations actuelles sont revenues au corpus de référence."} Les réponses précédentes sont conservées.</p>}
        {!state.messages.length && <div className="nova-empty"><span className="section-label">Projet NOVA / Interroger la mémoire</span><h3>Des réponses traçables.</h3><p>Interrogez NOVA. Chaque réponse sur le projet s’appuie sur les preuves fournies et renvoie à la source exacte.</p><div className="nova-suggestions">{suggestions.map((q) => <button key={q} disabled={busy} onClick={() => { nearBottom.current = true; void send(q); }}>{q}</button>)}</div><p className="nova-empty-note">Français ou anglais · Citations dans leur langue d’origine.</p></div>}
        {state.messages.map((m) => <NovaChatMessage key={m.id} message={m} />)}
        {needCode && <CodeGate onUnlocked={unlock} />}
        {busy && <div className="nova-progress"><Memo size="sm" mood={stage === "verify" || stage === "repair" ? "checking" : stage === "read" ? "reading" : "thinking"} /><div><p>{workingLabels[stage] || "Traitement…"}</p>{detail && <span>{detail}</span>}</div></div>}
      </div>
      <div className="sr-only" role="status" aria-live="polite">{busy ? workingLabels[stage] : state.messages.at(-1)?.role === "assistant" ? "Réponse NOVA prête." : state.messages.at(-1)?.role === "system" ? state.messages.at(-1)?.text : ""}</div>
      {newResponse && <button className="nova-new-response" onClick={() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; nearBottom.current = true; setNewResponse(false); }}>↓ Nouvelle réponse</button>}
      {!meta.providerAvailable && <p className="nova-provider-note">Les réponses par IA ne sont pas configurées. Les preuves restent accessibles dans Mémoire 360.</p>}
      <form className="nova-composer" onSubmit={(e) => { e.preventDefault(); nearBottom.current = true; void send(state.draft); }}><label className="sr-only" htmlFor="nova-composer">Interroger NOVA sur le projet</label><textarea ref={composer} id="nova-composer" placeholder="Interrogez NOVA sur le projet…" rows={1} maxLength={4000} value={state.draft} onChange={(e) => patch({ draft: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy) { nearBottom.current = true; void send(state.draft); } } }} />
        {busy ? <button type="button" className="nova-send" aria-label="Arrêter la génération" title="Arrêter la génération" onClick={stop}>■</button> : <button className="nova-send" disabled={!state.draft.trim()} aria-label="Envoyer la question" title="Envoyer la question">↑</button>}
        <p>Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne · {shortcut}</p>
      </form>
      </div>
      {confirmNew && <NewConversationDialog onCancel={cancelNewConversation} onConfirm={() => { setConfirmNew(false); newConversation(); requestAnimationFrame(() => composer.current?.focus()); }} />}
    </section>}
  </div>;
}
