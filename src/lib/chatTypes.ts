import type { ResolvedCite } from "./types";

export type ChatMode = "baseline" | "current";
export const BLOCK_TYPES = ["answer", "heading", "bullet", "warning", "contradiction", "documented-action", "recommendation", "missing"] as const;
export type ChatBlockType = typeof BLOCK_TYPES[number];
export interface ChatContext { mode: ChatMode; updateIds: string[]; contextKey: string }
export interface ChatUpdateIdentity { id: string; fingerprint: string }
export interface ChatMeta { baseline: string; updates: ChatUpdateIdentity[]; updateIds: string[]; latestUpdateId?: string; contextKey: string; providerAvailable: boolean }
export interface ChatCitation extends ResolvedCite { title: string; authority: string; path: string; duplicateOf?: string }
export interface ChatBlock { id: string; type: ChatBlockType; text: string; tag?: string; citations: ChatCitation[]; evidence: "verified" | "unsupported" | "not-applicable" }
export interface ChatAnswer {
  id: string; question: string; answeredAt: string; language: "en" | "fr";
  context: ChatContext; blocks: ChatBlock[]; citations: ChatCitation[]; missing: string[]; followUps: string[];
  evidenceStatus: "full" | "partial" | "none"; dropped: number; provider: string; model: string;
}
export interface ChatMessage { id: string; role: "user" | "assistant" | "system"; createdAt: string; text?: string; answer?: ChatAnswer; retryQuestion?: string; retryMode?: ChatMode; error?: boolean }
export interface ChatHistory { role: "user" | "assistant"; text: string }
export const citationKey = (c: ResolvedCite) => `${c.src}\u0000${c.loc}\u0000${c.quote}`;
// Callers supply published order. IDs remain available for readable labels only.
export const chatContext = (mode: ChatMode, updates: ChatUpdateIdentity[]): ChatContext => ({ mode, updateIds: mode === "baseline" ? [] : updates.map((u) => u.id), contextKey: mode === "baseline" ? "baseline" : ["current", ...updates.map((u) => `${u.id}:${u.fingerprint}`)].join("|") });
export const messageText = (m: ChatMessage): string => m.answer ? m.answer.blocks.map((b) => `${b.type}: ${b.text}`).join("\n") : m.text ?? "";
