import { emptyChangeSet } from "./update";
import type { ChangeSet, Cite } from "./types";

// Validate the editable payload at the boundary; server-owned metadata is never accepted.
export function normalizeChangeSet(input: unknown, filename: string): ChangeSet {
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Objet attendu.");
    return v as Record<string, unknown>;
  };
  const text = (v: unknown): string => {
    if (typeof v !== "string") throw new Error("Champ texte attendu.");
    return v;
  };
  const list = (v: unknown): unknown[] => {
    if (v === undefined) return [];
    if (!Array.isArray(v)) throw new Error("Liste attendue.");
    return v;
  };
  const number = (v: unknown): number => {
    if (typeof v !== "number" || !Number.isInteger(v)) throw new Error("Identifiant entier attendu.");
    return v;
  };
  const choice = (v: unknown, choices: string[]): string => {
    const s = text(v);
    if (!choices.includes(s)) throw new Error("Statut ou type invalide.");
    return s;
  };
  const cites = (v: unknown): Cite[] => list(v).map((entry) => {
    const c = object(entry);
    return { src: text(c.src), quote: text(c.quote), ...(c.loc === undefined ? {} : { loc: text(c.loc) }) };
  });
  const raw = object(input);
  const cs = emptyChangeSet(filename);
  cs.summary = raw.summary === undefined ? "" : text(raw.summary);
  for (const key of ["problemStatus", "priorDecisions", "newProposals", "newDecisions"] as const) {
    cs[key] = list(raw[key]).map((entry) => {
      const x = object(entry);
      return { text: text(x.text), citations: cites(x.citations),
        ...(x.proposer === undefined ? {} : { proposer: text(x.proposer) }),
        ...(x.authority === undefined ? {} : { authority: text(x.authority) }) };
    });
  }
  cs.conditionChanges = list(raw.conditionChanges).map((entry) => {
    const x = object(entry);
    return { id: number(x.id), status: choice(x.status, ["open", "met"]) as "open" | "met", text: text(x.text), citations: cites(x.citations) };
  });
  cs.newActions = list(raw.newActions).map((entry) => {
    const x = object(entry);
    return { title: text(x.title), owner: text(x.owner), ownerStatus: choice(x.ownerStatus, ["confirmed", "proposed"]),
      type: choice(x.type, ["COMMITMENT", "RECOMMENDATION"]), due: x.due === undefined ? "À confirmer" : text(x.due), citations: cites(x.citations) };
  });
  cs.revisedAnswers = list(raw.revisedAnswers).map((entry) => {
    const x = object(entry);
    return { id: text(x.id), text: text(x.text), citations: cites(x.citations) };
  });
  cs.revisedBrief = list(raw.revisedBrief).map((entry) => {
    const x = object(entry);
    return { theme: text(x.theme), text: text(x.text), citations: cites(x.citations) };
  });
  const affected = raw.affected === undefined ? {} : object(raw.affected);
  cs.affected = { answers: list(affected.answers).map(text), conditions: list(affected.conditions).map(number), actions: list(affected.actions).map(text) };
  return cs;
}
