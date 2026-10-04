import translations from "./frenchContent.json";

const dictionary: Record<string, string> = translations;

/** Localize existing app-authored summaries without rewriting saved history. */
export function frenchText(text: string): string {
  return (Object.hasOwn(dictionary, text) ? dictionary[text] : undefined) ?? text.replace(/\bTBC\b/g, "À confirmer");
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
