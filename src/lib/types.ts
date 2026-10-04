export type Kind = "eml" | "txt" | "md" | "csv" | "pdf" | "xlsx" | "png" | "jpg" | "webp" | "gif" | "docx" | "pptx" | "ics" | "json" | "html" | "rtf" | "zip" | "other";
export const IMAGE_KINDS: Kind[] = ["png", "jpg", "webp", "gif"];

export interface Source {
  id: string;
  path: string; // relative to project root, forward slashes
  logicalPath?: string; // original source identity when a published file replaces a baseline file
  kind: Kind;
  title: string;
  authority: string;
  role: string;
  contentDate?: string;
  note?: string;
  sha256: string;
  duplicateOf?: string;
  parent?: string;
  version: string; // "baseline" | "U001" ...
}

export interface Segment { src: string; loc: string; text: string }

export interface Cite { src: string; quote: string; loc?: string }

export interface ResolvedCite extends Cite {
  loc: string;
  label: string;
  verified: boolean;
}

export interface Item { text: string; citations: Cite[]; proposer?: string; authority?: string }

export interface ConditionChange { id: number; status: "met" | "open"; text: string; citations: Cite[] }

export interface NewAction {
  title: string; owner: string; ownerStatus: string; type: string; due: string; citations: Cite[];
}

export interface ChangeSet {
  id: string;
  publishedAt?: string;
  filename: string;
  summary: string;
  problemStatus: Item[];
  priorDecisions: Item[];
  newProposals: Item[];
  newDecisions: Item[];
  conditionChanges: ConditionChange[];
  affected: { answers: string[]; conditions: number[]; actions: string[] };
  newActions: NewAction[];
  revisedAnswers?: { id: string; text: string; citations: Cite[] }[];
  revisedBrief?: { theme: string; text: string; citations: Cite[] }[];
  guardrails: { approvalInvented: boolean; otherConditionsClosed: boolean; beyondContractEnd: boolean; notes: string[] };
}
