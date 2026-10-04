/** French display labels. Protocol values, evidence and source identities stay unchanged. */
const labels: Record<string, string> = {
  conditional: "conditionnelle", confirmed: "confirmé", assigned: "attribué", proposed: "proposé", "at risk": "à risque", unknown: "inconnu",
  open: "ouverte", met: "satisfaite", TBC: "À confirmer", undocumented: "non documenté", "not documented": "non documenté",
  Current: "Actuel", "Stale/resolved": "Périmé/résolu", Closed: "Fermé", Uncertain: "Incertain",
  authority: "autorité", date: "date des faits", "authority+date": "autorité et date des faits",
  CORE: "essentiel", CONTEXT: "contexte", TRAP: "piège", NOISE: "bruit",
  OFFICIAL: "officiel", VENDOR_CLAIM: "déclaration du fournisseur", DRAFT: "brouillon",
  VALIDATION: "validation", DECISION: "décision", REPORT: "rapport", INFORMAL: "informel",
  DUPLICATE: "doublon", UNRELATED: "sans rapport", UNOFFICIAL: "non officiel",
  PROPOSED: "proposition", DECIDED: "décision", DELIVERED: "livraison", VALIDATED: "validation",
  baseline: "référence", changed: "modifiée", unchanged: "inchangée", none: "aucun",
};

export function frenchLabel(value: string | undefined): string {
  if (!value) return "";
  return (Object.hasOwn(labels, value) ? labels[value] : undefined) ?? value.replace(/\bTBC\b/g, "À confirmer");
}
