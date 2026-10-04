import translations from "./frenchContent.json";

const dictionary: Record<string, string> = translations;
const terminology: Record<string, string> = {
  runbook: "guide d’exploitation", runbooks: "guides d’exploitation", rollback: "retour arrière",
  "go-live": "mise en production", workflow: "circuit de travail", build: "version", labels: "libellés",
  "re-test": "nouveau test", retest: "nouveau test", "re-testé": "testé à nouveau", "re-testés": "testés à nouveau",
  todo: "à faire", tbc: "à confirmer", go: "feu vert",
};

/** Localize existing app-authored summaries without rewriting saved history. */
export function frenchText(text: string): string {
  const localized = (Object.hasOwn(dictionary, text) ? dictionary[text] : undefined) ?? text;
  return localized.replace(/\b(?:re-testés?|re-test|retest|runbooks?|rollback|go-live|workflow|build|labels|TODO|TBC|go)(?![\p{L}\p{N}_])/giu, (word) => {
    const translated = terminology[word.toLowerCase()];
    return /^[A-Z]/.test(word) ? translated[0].toUpperCase() + translated.slice(1) : translated;
  });
}

// These values identify sources, verify quotes or drive protocols. They are never translated.
const preserved = new Set([
  "id", "src", "loc", "quote", "path", "logicalPath", "filename", "name",
  "sha256", "fingerprint", "version", "source", "model", "type", "tag", "ownerStatus", "rule",
  "origin", "mode", "result", "changeType", "contextKey", "kind", "authority",
  "citations", "evidence", "sourceSnapshot", "includedUpdateVersions", "consideredSources", "segments",
]);

export function frenchAppContent<T>(value: T): T {
  if (typeof value === "string") return frenchText(value) as T;
  if (Array.isArray(value)) return value.map((item) => frenchAppContent(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key, preserved.has(key) ? item : frenchAppContent(item),
    ])) as T;
  }
  return value;
}
