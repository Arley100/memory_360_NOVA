import { BLOCK_TYPES, type ChatMessage, type ChatMode } from "./chatTypes";
export interface Position { x: number; y: number }
export interface ChatState { open: boolean; launcherPosition: Position | null; mode: ChatMode; messages: ChatMessage[]; draft: string; expanded: boolean; unread: boolean; activeConversationId: string }
export const CHAT_STORAGE_KEY = "nova-assistant-v1";
export const initialChatState: ChatState = { open: false, launcherPosition: null, mode: "current", messages: [], draft: "", expanded: false, unread: false, activeConversationId: "" };
export function clampOrb(p: Position, width: number, height: number): Position {
  return { x: Math.max(12, Math.min(p.x, Math.max(12, width - 70))), y: Math.max(12, Math.min(p.y, Math.max(12, height - 70))) };
}
export function panelRect(p: Position, width: number, height: number, expanded: boolean, sidebar = 248) {
  const mobile = width <= 650;
  const w = Math.max(0, Math.min(mobile ? width - 24 : expanded ? Math.min(760, width - sidebar - 60) : 450, width - 24));
  const h = Math.max(0, Math.min(mobile ? height * .82 : expanded ? Math.min(850, height * .82) : 680, height - 24));
  const x = p.x > width / 2 ? p.x - w - 12 : p.x + 70;
  const y = p.y > height / 2 ? p.y + 58 - h : p.y;
  return { left: mobile ? 12 : Math.max(12, Math.min(x, width - w - 12)), top: mobile ? height - h - 12 : Math.max(12, Math.min(y, height - h - 12)), width: w, height: h };
}
// Local history is untrusted input too. Ignore obsolete/malformed entries rather than crashing the app.
export function restoreChatState(raw: string | null): ChatState {
  const fallback = { ...initialChatState, messages: [], activeConversationId: crypto.randomUUID() };
  if (!raw || raw.length > 2_000_000) return fallback;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return fallback;
    const messages = Array.isArray(v.messages) ? v.messages.filter((m: ChatMessage) => {
      if (!m || typeof m.id !== "string" || typeof m.createdAt !== "string" || !["user", "assistant", "system"].includes(m.role)) return false;
      if (m.role !== "assistant") return typeof m.text === "string" && m.text.length <= 6000;
      const a = m.answer;
      return a && typeof a.question === "string" && typeof a.answeredAt === "string" && a.context && ["current", "baseline"].includes(a.context.mode) && typeof a.context.contextKey === "string" && Array.isArray(a.context.updateIds) && a.context.updateIds.every((id) => typeof id === "string") && Array.isArray(a.blocks) && a.blocks.length <= 40 && a.blocks.every((b) => b && typeof b.text === "string" && BLOCK_TYPES.includes(b.type) && Array.isArray(b.citations) && b.citations.every((c) => c && c.verified === true && typeof c.src === "string" && typeof c.loc === "string" && typeof c.quote === "string")) && Array.isArray(a.citations) && a.citations.every((c) => c && c.verified === true && typeof c.src === "string" && typeof c.loc === "string" && typeof c.quote === "string") && Array.isArray(a.missing) && a.missing.every((s) => typeof s === "string") && Array.isArray(a.followUps) && a.followUps.every((s) => typeof s === "string");
    }).slice(-40) : [];
    const p = v.launcherPosition;
    return { ...fallback, open: v.open === true, expanded: v.expanded === true, unread: v.unread === true,
      mode: v.mode === "baseline" ? "baseline" : "current", draft: typeof v.draft === "string" ? v.draft.slice(0, 4000) : "", messages,
      launcherPosition: p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : null,
      activeConversationId: typeof v.activeConversationId === "string" ? v.activeConversationId : fallback.activeConversationId };
  } catch { return fallback; }
}
