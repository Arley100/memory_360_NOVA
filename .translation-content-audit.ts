import fs from 'node:fs';
import { frenchAppContent } from './src/lib/frenchContent';
const preserved = new Set(['id', 'src', 'loc', 'quote', 'path', 'logicalPath', 'filename', 'name', 'sha256', 'fingerprint', 'version', 'source', 'model', 'type', 'tag', 'ownerStatus', 'rule', 'origin', 'mode', 'result', 'changeType', 'contextKey', 'kind', 'authority', 'citations', 'evidence', 'sourceSnapshot', 'includedUpdateVersions', 'consideredSources', 'segments']);
const seen = new Set<string>();
function inspect(a: unknown, b: unknown, key = '') {
  if (typeof a === 'string' && a === b && a.length > 15 && !seen.has(a)) { seen.add(a); console.log(key, JSON.stringify(a)); }
  else if (Array.isArray(a)) a.forEach((v, i) => inspect(v, (b as unknown[])[i], `${key}[${i}]`));
  else if (a && typeof a === 'object') Object.entries(a).forEach(([k, v]) => { if (!preserved.has(k)) inspect(v, (b as Record<string,unknown>)[k], `${key}.${k}`); });
}
for (const file of ['data/baseline/kb.json', 'data/generated/kb.json']) { const raw = JSON.parse(fs.readFileSync(file, 'utf8')); inspect(raw, frenchAppContent(raw)); }
