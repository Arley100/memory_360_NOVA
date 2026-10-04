"use client";
import { useEffect, useRef } from "react";

export function NewConversationDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancel.current?.focus(); }, []);
  return <div className="nova-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div className="nova-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="nova-new-conversation-title" aria-describedby="nova-new-conversation-description"
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); }
        if (e.key === "Tab") {
          const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }}>
      <h3 id="nova-new-conversation-title">Commencer une nouvelle conversation ?</h3>
      <p id="nova-new-conversation-description">Vos messages et votre brouillon actuels seront effacés.</p>
      <div className="nova-confirm-actions">
        <button ref={cancel} type="button" className="button-secondary" onClick={onCancel}>Annuler</button>
        <button type="button" className="button-primary" onClick={onConfirm}>Nouvelle conversation</button>
      </div>
    </div>
  </div>;
}
