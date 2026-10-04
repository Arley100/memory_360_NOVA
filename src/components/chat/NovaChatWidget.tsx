"use client";
import { useEffect, useRef, useState } from "react";
import { CodeGate } from "@/components/CodeGate";
import { Memo } from "@/components/Memo";
import { clampOrb, panelRect, type Position } from "@/lib/chatState";
import { useNovaChat } from "./NovaChatProvider";
import { NovaChatMessage } from "./NovaChatMessage";
import { NewConversationDialog } from "./NewConversationDialog";

const suggestions = ["What currently blocks go-live?", "Is SEC-210 formally accepted?", "Why was October 22 approved?", "What changed since the baseline?", "Which actions need attention first?", "Which project records contradict each other?"];
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
  if (!ready || !position || !viewport.width) return null;
  const rect = panelRect(position, viewport.width, viewport.height, state.expanded, viewport.sidebar);
  const error = state.messages.at(-1)?.error;
  const workingLabels: Record<string, string> = { read: "Reading project files…", think: "Connecting the facts…", verify: "Verifying evidence…", repair: "Rechecking supporting passages…" };
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
    <button ref={launcher} type="button" className={`nova-orb ${state.open ? "is-open" : ""} ${busy ? "is-working" : ""} ${dragging ? "is-dragging" : ""}`} style={{ left: position.x, top: position.y }}
      title={`Ask NOVA · ${shortcut}${state.unread ? " · Unread response" : error ? " · Answer failed" : ""}`} aria-label={`${state.open ? "Close" : "Open"} NOVA Assistant${busy ? ", answering" : state.unread ? ", unread response" : error ? ", answer failed" : ""}`} aria-expanded={state.open} aria-controls="nova-chat-panel"
      onPointerDown={(e) => { if (e.button !== 0) return; drag.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, origin: position, moved: false }; draggedClick.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { const d = drag.current; if (!d || e.pointerId !== d.pointerId) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 6) d.moved = true; if (d.moved) { setDragging(true); patch({ launcherPosition: clampOrb({ x: d.origin.x + dx, y: d.origin.y + dy }, viewport.width, viewport.height) }); } }}
      onPointerUp={(e) => finish(e)} onPointerCancel={(e) => finish(e, true)} onLostPointerCapture={() => { if (drag.current) { draggedClick.current = true; drag.current = null; setDragging(false); } }}
      onClick={(e) => { if (e.detail !== 0 && draggedClick.current) { draggedClick.current = false; return; } if (state.open) { setConfirmNew(false); minimize(); } else openChat(); }}>
      <span className={`nova-orb-sphere${dragging ? "" : " memo-breathe"}`} aria-hidden="true" />{busy && <span className="nova-orb-orbit memo-orbit" aria-hidden="true" />}
      {(state.unread || error) && <span className={`nova-orb-badge ${error ? "is-error" : ""}`} aria-hidden="true" />}
    </button>
    {state.open && <section id="nova-chat-panel" role="dialog" aria-modal="false" aria-labelledby="nova-chat-title" className="nova-chat-panel" style={rect} onKeyDown={(e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); minimize(); } }}>
      <div className="nova-chat-content" inert={confirmNew}>
      <header className="nova-chat-header"><div><h2 id="nova-chat-title">NOVA Assistant</h2><p>Operational project memory</p></div><div className="nova-header-controls">
        <button ref={newConversationButton} title="New conversation" aria-label="New conversation" disabled={busy} onClick={() => { if (state.messages.length || state.draft) setConfirmNew(true); else newConversation(); }}>＋</button>
        <button title={state.expanded ? "Collapse" : "Expand"} aria-label={state.expanded ? "Collapse assistant" : "Expand assistant"} aria-pressed={state.expanded} onClick={() => patch({ expanded: !state.expanded })}>{state.expanded ? "↙" : "↗"}</button>
        <button title="Minimize" aria-label="Minimize assistant" onClick={minimize}>−</button>
      </div></header>
      <div className="nova-context-bar"><label className="sr-only" htmlFor="nova-chat-mode">Project context</label><select id="nova-chat-mode" value={state.mode} disabled={busy} onChange={(e) => patch({ mode: e.target.value === "baseline" ? "baseline" : "current" })}>
        <option value="current">Current{meta.latestUpdateId ? ` · ${meta.latestUpdateId}` : " · baseline corpus"}</option><option value="baseline">Baseline · Sep 30, 2026 · 09:00 Montréal</option>
      </select><span>Evidence-grounded</span></div>
      <div ref={scroll} className="nova-messages" onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; if (nearBottom.current) setNewResponse(false); }}>
        {state.messages.some((m) => m.answer?.context.mode === "current" && m.answer.context.contextKey !== meta.contextKey) && <p className="nova-stale" role="status">Project context changed: {meta.latestUpdateId ? `${meta.latestUpdateId} is now included.` : "current information has returned to the baseline corpus."} Previous answers are preserved.</p>}
        {!state.messages.length && <div className="nova-empty"><span className="section-label">Project NOVA / Ask the memory</span><h3>Answers you can trace.</h3><p>Ask anything about Project NOVA. Every project answer is grounded in the supplied evidence and linked to the exact source.</p><div className="nova-suggestions">{suggestions.map((q) => <button key={q} disabled={busy} onClick={() => { nearBottom.current = true; void send(q); }}>{q}</button>)}</div><p className="nova-empty-note">English or français · Quotes stay in their original language.</p></div>}
        {state.messages.map((m) => <NovaChatMessage key={m.id} message={m} />)}
        {needCode && <CodeGate onUnlocked={unlock} />}
        {busy && <div className="nova-progress"><Memo size="sm" mood={stage === "verify" || stage === "repair" ? "checking" : stage === "read" ? "reading" : "thinking"} /><div><p>{workingLabels[stage] || "Working…"}</p>{detail && <span>{detail}</span>}</div></div>}
      </div>
      <div className="sr-only" role="status" aria-live="polite">{busy ? workingLabels[stage] : state.messages.at(-1)?.role === "assistant" ? "NOVA response ready." : state.messages.at(-1)?.role === "system" ? state.messages.at(-1)?.text : ""}</div>
      {newResponse && <button className="nova-new-response" onClick={() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; nearBottom.current = true; setNewResponse(false); }}>↓ New response</button>}
      {!meta.providerAvailable && <p className="nova-provider-note">AI answering is not configured. Project evidence remains available elsewhere in Mémoire 360.</p>}
      <form className="nova-composer" onSubmit={(e) => { e.preventDefault(); nearBottom.current = true; void send(state.draft); }}><label className="sr-only" htmlFor="nova-composer">Ask NOVA about the project</label><textarea ref={composer} id="nova-composer" placeholder="Ask NOVA about the project…" rows={1} maxLength={4000} value={state.draft} onChange={(e) => patch({ draft: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy) { nearBottom.current = true; void send(state.draft); } } }} />
        {busy ? <button type="button" className="nova-send" aria-label="Stop generation" title="Stop generation" onClick={stop}>■</button> : <button className="nova-send" disabled={!state.draft.trim()} aria-label="Send question" title="Send question">↑</button>}
        <p>Enter to send · Shift+Enter for a new line · {shortcut}</p>
      </form>
      </div>
      {confirmNew && <NewConversationDialog onCancel={cancelNewConversation} onConfirm={() => { setConfirmNew(false); newConversation(); requestAnimationFrame(() => composer.current?.focus()); }} />}
    </section>}
  </div>;
}
