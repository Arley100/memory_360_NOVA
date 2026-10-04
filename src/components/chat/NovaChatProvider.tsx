"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { readStream } from "@/lib/stream";
import { messageText, type ChatAnswer, type ChatMeta, type ChatMode, type ChatMessage } from "@/lib/chatTypes";
import { CHAT_STORAGE_KEY, initialChatState, restoreChatState, type ChatState } from "@/lib/chatState";

interface ChatAPI {
  state: ChatState; ready: boolean; meta: ChatMeta; busy: boolean; stage: string; detail: string; needCode: boolean;
  patch: (value: Partial<ChatState>) => void; openChat: () => void; minimize: () => void; send: (question: string, mode?: ChatMode, retry?: boolean) => Promise<boolean>;
  stop: () => void; newConversation: () => void; unlock: () => void; composer: React.RefObject<HTMLTextAreaElement | null>; launcher: React.RefObject<HTMLButtonElement | null>;
}
const Context = createContext<ChatAPI | null>(null);
export function useNovaChat() { const value = useContext(Context); if (!value) throw new Error("Contexte de conversation NOVA manquant"); return value; }

export function NovaChatProvider({ children, initialMeta }: { children: ReactNode; initialMeta: ChatMeta }) {
  const [state, setState] = useState<ChatState>(initialChatState);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState(initialMeta);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("read"), [detail, setDetail] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null), launcher = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);
  const stateRef = useRef(state), pending = useRef<{ question: string; mode: ChatMode } | null>(null);
  const metaSequence = useRef(0);
  const knownContext = useRef(initialMeta.contextKey);
  const pathname = usePathname();
  const patch = useCallback((value: Partial<ChatState>) => setState((s) => ({ ...s, ...value })), []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(CHAT_STORAGE_KEY); } catch { /* Private browsing still works in memory. */ }
    // Hydration intentionally follows mount; the server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(restoreChatState(stored)); setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const save = () => {
      try {
        const stored = { ...state, messages: state.messages.slice(-40) };
        let serialized = JSON.stringify(stored);
        while (serialized.length > 1_500_000 && stored.messages.length > 2) { stored.messages = stored.messages.slice(2); serialized = JSON.stringify(stored); }
        localStorage.setItem(CHAT_STORAGE_KEY, serialized);
      } catch { /* Quota/storage restrictions must not break chat. */ }
    };
    const timer = setTimeout(save, 180);
    const flush = () => { if (document.visibilityState === "hidden") save(); };
    window.addEventListener("pagehide", save); document.addEventListener("visibilitychange", flush);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", save); document.removeEventListener("visibilitychange", flush); };
  }, [state, ready]);
  useEffect(() => {
    const el = composer.current;
    if (el) { el.style.height = "auto"; el.style.height = `${Math.min(120, el.scrollHeight)}px`; }
  }, [state.draft, state.open]);
  const refreshMeta = useCallback(async () => {
    const sequence = ++metaSequence.current;
    try {
      const r = await fetch("/api/chat/meta", { cache: "no-store" });
      if (r.ok) {
        const next = await r.json() as ChatMeta;
        if (sequence === metaSequence.current) {
          if (knownContext.current !== next.contextKey) setState((s) => s.open ? s : { ...s, unread: true });
          knownContext.current = next.contextKey; setMeta(next);
        }
      }
    } catch { /* Retain last known metadata on a network interruption. */ }
  }, []);
  useEffect(() => {
    const ctrl = new AbortController();
    // Metadata is an external store; refresh on route/open events, never poll.
    const timer = setTimeout(() => { if (!ctrl.signal.aborted) void refreshMeta(); }, 0);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [pathname, state.open, initialMeta.contextKey, refreshMeta]);
  useEffect(() => {
    const wake = () => { if (document.visibilityState === "visible") void refreshMeta(); };
    window.addEventListener("focus", wake); document.addEventListener("visibilitychange", wake);
    return () => { window.removeEventListener("focus", wake); document.removeEventListener("visibilitychange", wake); };
  }, [refreshMeta]);
  const openChat = useCallback(() => { patch({ open: true, unread: false }); requestAnimationFrame(() => composer.current?.focus()); }, [patch]);
  const minimize = useCallback(() => { patch({ open: false }); requestAnimationFrame(() => launcher.current?.focus()); }, [patch]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "j") { e.preventDefault(); openChat(); } };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [openChat]);
  useEffect(() => () => controller.current?.abort(), []);
  const append = (m: ChatMessage) => setState((s) => ({ ...s, messages: [...s.messages, m].slice(-40) }));
  async function send(question: string, mode = stateRef.current.mode, retry = false): Promise<boolean> {
    question = question.trim();
    if (!question || question.length > 4000 || controller.current || !ready) return false;
    const ctrl = new AbortController(); controller.current = ctrl;
    const previous = stateRef.current;
    openChat(); setBusy(true); setStage("read"); setDetail(""); setNeedCode(false);
    pending.current = { question, mode };
    if (!retry) append({ id: crypto.randomUUID(), role: "user", text: question, createdAt: new Date().toISOString() });
    patch({ draft: "" });
    const history = previous.messages.filter((m) => (m.role === "user" || m.role === "assistant") && (!m.answer || m.answer.context.mode === mode)).slice(-12).map((m) => ({ role: m.role, text: messageText(m).slice(0, 6000) }));
    let completed = false;
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify({ question, mode, history }), signal: ctrl.signal });
      if (!r.ok) {
        const error = await r.json().catch(() => ({}));
        if (error.needCode) { setNeedCode(true); return false; }
        throw new Error(error.error || "Réponse indisponible pour le moment. Réessayez.");
      }
      await readStream(r, (m) => {
        if (ctrl.signal.aborted) return;
        if (m.type === "stage") { setStage(String(m.stage)); setDetail(typeof m.detail === "string" ? m.detail : ""); }
        if (m.type === "error") throw new Error(String(m.error));
        if (m.type === "result") {
          const answer = m.answer as ChatAnswer;
          if (!answer?.blocks || !answer.context) throw new Error("Format de réponse illisible. Réessayez.");
          completed = true;
          append({ id: answer.id, role: "assistant", createdAt: answer.answeredAt, answer });
          setState((s) => ({ ...s, unread: !s.open }));
        }
      });
      if (!completed) throw new Error("Connexion interrompue avant réception de la réponse. Réessayez.");
      pending.current = null;
      return true;
    } catch (e) {
      append({ id: crypto.randomUUID(), role: "system", createdAt: new Date().toISOString(), text: ctrl.signal.aborted ? "Génération arrêtée." : (e as Error).message, error: !ctrl.signal.aborted, retryQuestion: question, retryMode: mode });
      return false;
    } finally {
      controller.current = null; setBusy(false); void refreshMeta();
      if (stateRef.current.open && (!document.activeElement || document.activeElement === document.body || document.activeElement === composer.current)) requestAnimationFrame(() => composer.current?.focus());
    }
  }
  function newConversation() {
    if (controller.current) return;
    pending.current = null; setNeedCode(false); patch({ messages: [], draft: "", unread: false, activeConversationId: crypto.randomUUID() }); composer.current?.focus();
  }
  return <Context.Provider value={{ state, ready, meta, busy, stage, detail, needCode, patch, openChat, minimize, send,
    stop: () => controller.current?.abort(), newConversation, unlock: () => { setNeedCode(false); const p = pending.current; if (p) void send(p.question, p.mode, true); }, composer, launcher }}>{children}</Context.Provider>;
}
