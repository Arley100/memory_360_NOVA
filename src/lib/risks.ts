import type { Condition, KB } from "./store";
import type { Cite, ResolvedCite, Segment, Source } from "./types";

export type RiskStatus = "Current" | "Stale/resolved" | "Closed" | "Uncertain";
export interface Risk {
  id: string; title: string; probability: string; impact: string; owner: string;
  registerStatus: string; registerDate?: string; mitigation: string; followUp: string;
  registerCites: ResolvedCite[]; ratingCites: ResolvedCite[]; evidence: ResolvedCite[];
  status: RiskStatus; interpretation: string; stale: boolean; changedIn?: string;
}
type RiskCondition = Condition & { changedIn?: string; changeText?: string; changeCites?: Cite[] };
const key = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const closed = (s: string) => /^(ferme|closed|clos)$/i.test(key(s));

/** Read the existing cell-level register, without copying it into another database.
 * A row is current only when linked operational conditions have verified evidence.
 * Contradiction resolutions already encode the project's authority/date methodology.
 */
export function deriveRisks(kb: KB, conditions: RiskCondition[], sources: Source[], segments: Segment[], resolve: (c: Cite) => ResolvedCite): Risk[] {
  const risks: Risk[] = [];
  for (const source of sources.filter((s) => !s.duplicateOf && s.kind === "xlsx" && /risqu|risk/i.test(`${s.title} ${s.path}`))) {
    const sheets = new Map<string, Map<number, Map<string, Segment>>>();
    for (const seg of segments.filter((s) => s.src === source.id)) {
      const m = /^(.*)!([A-Z]+)(\d+)$/.exec(seg.loc);
      if (!m) continue;
      const rows = sheets.get(m[1]) ?? new Map<number, Map<string, Segment>>();
      const cells = rows.get(+m[3]) ?? new Map<string, Segment>();
      cells.set(m[2], seg); rows.set(+m[3], cells); sheets.set(m[1], rows);
    }
    for (const rows of sheets.values()) {
      const header = [...rows.values()].find((cells) => [...cells.values()].some((c) => key(c.text) === "risque" || key(c.text) === "risk"));
      if (!header) continue;
      const column = (names: string[]) => [...header].find(([, c]) => names.includes(key(c.text)))?.[0];
      const columns = { id: column(["id"]), title: column(["risque", "risk"]), probability: column(["probabilite", "probability"]), impact: column(["impact"]), owner: column(["proprietaire", "owner"]), status: column(["statut", "status"]), mitigation: column(["mitigation"]), followUp: column(["commentaire", "comment"]) };
      for (const cells of rows.values()) {
        const cell = (field: keyof typeof columns) => cells.get(columns[field] ?? "");
        const value = (field: keyof typeof columns) => cell(field)?.text ?? "";
        if (!/^R-\d+$/i.test(value("id"))) continue;
        const registerCites = [...cells.values()].map((s) => resolve({ src: s.src, loc: s.loc, quote: s.text }));
        const risk: Risk = {
          id: value("id"), title: value("title"), probability: value("probability") || "Undocumented", impact: value("impact") || "Undocumented", owner: value("owner") || "Undocumented",
          registerStatus: value("status") || "Undocumented", registerDate: source.contentDate,
          mitigation: value("mitigation"), followUp: value("followUp"), registerCites,
          ratingCites: [cell("title"), cell("probability"), cell("impact")].filter((c): c is Segment => Boolean(c)).map((s) => resolve({ src: s.src, loc: s.loc, quote: s.text })), evidence: [],
          status: "Uncertain", interpretation: "No verified operational resolution is linked to this register entry. Review is required before treating it as a current priority.", stale: false,
        };
        // Match the exact row, not a generic 'Ouvert' quote from another entry.
        const contradiction = kb.contradictions.find((c) => c.planOrRegister && c.aCit.some((cit) => {
          const resolved = resolve(cit);
          return resolved.verified && registerCites.some((reg) => reg.src === resolved.src && reg.loc === resolved.loc);
        }));
        const linked = conditions.filter((c) => {
          const refs = value("mitigation").match(/\b[A-Z]+-\d+\b/g) ?? [];
          return refs.some((id) => c.citations.some((cit) => cit.src === id) || c.title.includes(id)) ||
            (value("owner") && key(c.owner).includes(key(value("owner"))));
        });
        const condition = linked.length === 1 ? linked[0] : undefined;
        if (condition) {
          risk.evidence = (condition.changeCites ?? condition.citations).map(resolve);
          risk.changedIn = condition.changedIn;
          if (risk.evidence.length && risk.evidence.every((c) => c.verified)) {
            risk.status = condition.status === "met" ? (closed(risk.registerStatus) ? "Closed" : "Stale/resolved") : "Current";
            risk.stale = condition.status === "met" && !closed(risk.registerStatus) || condition.status === "open" && closed(risk.registerStatus);
            risk.interpretation = condition.changeText ?? condition.state;
          }
        } else if (contradiction) {
          risk.evidence = contradiction.bCit.map(resolve);
          if (risk.evidence.length && risk.evidence.every((c) => c.verified)) {
            // Only explicit closure resolutions warrant exclusion from current risks.
            if (/resolved|closed|closure|ferm[eé]|r[eé]solu/i.test(`${contradiction.b} ${contradiction.resolution}`)) {
              risk.status = "Stale/resolved"; risk.stale = true;
            }
            risk.interpretation = `${contradiction.b} ${contradiction.resolution}`;
          }
        } else if (closed(risk.registerStatus)) {
          risk.status = "Closed";
          risk.interpretation = "The register documents this risk as closed; no linked current condition contradicts that status.";
          risk.evidence = registerCites.filter((c) => c.loc === cell("status")?.loc);
        }
        risks.push(risk);
      }
    }
  }
  // A published replacement register supersedes the same IDs, without changing baseline cells.
  return [...new Map(risks.map((risk) => [risk.id, risk])).values()];
}
