// Where published updates (and drafts awaiting review) live.
// - Local: files in data/updates/ (default).
// - Hosted (e.g. Vercel, read-only filesystem): Upstash Redis over its REST API, enabled automatically when
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or Vercel's KV_REST_API_URL + KV_REST_API_TOKEN) are set.
// The baseline (data/baseline, data/registry.json, data/segments.json, corpus/) is never written by either backend.
import fs from "fs";
import path from "path";
import type { ChangeSet, Segment, Source } from "./types";

export interface Update { cs: ChangeSet; sources: Source[]; segments: Segment[] }
export interface Draft { filename: string; files: string[]; contentDate?: string; segments: Segment[]; sourceHashes?: Record<string, string> }
export interface StoredFile { name: string; data: Buffer }

export interface UpdateStore {
  kind: "file" | "redis";
  list(): Promise<Update[]>;
  publish(id: string, u: Update, files: StoredFile[]): Promise<void>;
  readFile(id: string, name: string): Promise<Buffer | null>;
  saveDraft(id: string, draft: Draft, files: StoredFile[]): Promise<void>;
  loadDraft(id: string): Promise<{ draft: Draft; files: StoredFile[] } | null>;
  deleteDraft(id: string): Promise<void>;
  reset(): Promise<number>;
  saveKB(kb: unknown): Promise<void>;
  loadKB(): Promise<unknown | null>;   // null: none stored here (the committed data/generated/kb.json is used)
}

const MAX_STORED_FILE = 4 * 1024 * 1024; // originals larger than this keep their extracted text only (hosted)

// ---------- Local files ----------
export function createFileUpdateStore(root: string): UpdateStore {
  const pending = path.join(root, "_pending");
  const complete = (d: string) => ["changeset.json", "sources.json", "segments.json"].every((f) => fs.existsSync(path.join(root, d, f)));
  const read = <T,>(d: string, f: string): T => JSON.parse(fs.readFileSync(path.join(root, d, f), "utf8")) as T;
  return {
    kind: "file",
    async list() {
      if (!fs.existsSync(root)) return [];
      return fs.readdirSync(root).filter((d) => /^U\d{3}$/.test(d) && complete(d)).sort()
        .map((d) => ({ cs: read<ChangeSet>(d, "changeset.json"), sources: read<Source[]>(d, "sources.json"), segments: read<Segment[]>(d, "segments.json") }));
    },
    async publish(id, u, files) {
      const finalDir = path.join(root, id);
      const tmp = `${finalDir}.tmp`; // write, then rename: a half-written update is never visible
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.mkdirSync(tmp, { recursive: true });
      for (const f of files) fs.writeFileSync(path.join(tmp, f.name), f.data);
      fs.writeFileSync(path.join(tmp, "changeset.json"), JSON.stringify(u.cs, null, 1));
      fs.writeFileSync(path.join(tmp, "sources.json"), JSON.stringify(u.sources, null, 1));
      fs.writeFileSync(path.join(tmp, "segments.json"), JSON.stringify(u.segments, null, 1));
      fs.renameSync(tmp, finalDir);
    },
    async readFile(id, name) {
      const p = path.join(root, id, path.basename(name));
      return fs.existsSync(p) ? fs.readFileSync(p) : null;
    },
    async saveDraft(id, draft, files) {
      const dir = path.join(pending, id);
      fs.mkdirSync(dir, { recursive: true });
      for (const f of files) fs.writeFileSync(path.join(dir, f.name), f.data);
      fs.writeFileSync(path.join(dir, "draft.json"), JSON.stringify(draft, null, 1));
    },
    async loadDraft(id) {
      const dir = path.join(pending, id.replace(/[^\w-]/g, ""));
      if (!fs.existsSync(path.join(dir, "draft.json"))) return null;
      const draft = JSON.parse(fs.readFileSync(path.join(dir, "draft.json"), "utf8")) as Draft;
      return { draft, files: draft.files.filter((n) => fs.existsSync(path.join(dir, n))).map((n) => ({ name: n, data: fs.readFileSync(path.join(dir, n)) })) };
    },
    async deleteDraft(id) { fs.rmSync(path.join(pending, id.replace(/[^\w-]/g, "")), { recursive: true, force: true }); },
    async saveKB(kb) {
      const dir = path.join(process.cwd(), "data", "generated");
      fs.mkdirSync(dir, { recursive: true });
      const tmp = path.join(dir, "kb.json.tmp");
      fs.writeFileSync(tmp, JSON.stringify(kb, null, 1));
      fs.renameSync(tmp, path.join(dir, "kb.json"));
    },
    async loadKB() { return null; }, // locally the file itself is read by the store
    async reset() {
      if (!fs.existsSync(root)) return 0;
      const ids = fs.readdirSync(root).filter((d) => /^U\d{3}(\.tmp)?$/.test(d) || d === "_pending");
      ids.forEach((d) => fs.rmSync(path.join(root, d), { recursive: true, force: true }));
      return ids.filter((d) => /^U\d{3}$/.test(d)).length;
    },
  };
}

// ---------- Upstash Redis (REST) ----------
export function createRedisUpdateStore(url: string, token: string): UpdateStore {
  const P = process.env.STORE_PREFIX || "m360";
  const cmd = async (...args: (string | number)[]): Promise<unknown> => {
    const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(args), cache: "no-store" });
    const j = (await res.json()) as { result?: unknown; error?: string };
    if (!res.ok || j.error) throw new Error(`Erreur de stockage : ${j.error ?? res.status}`);
    return j.result;
  };
  const getJSON = async <T,>(key: string): Promise<T | null> => { const v = (await cmd("GET", key)) as string | null; return v ? (JSON.parse(v) as T) : null; };
  const setJSON = (key: string, v: unknown, ttl?: number) => (ttl ? cmd("SET", key, JSON.stringify(v), "EX", ttl) : cmd("SET", key, JSON.stringify(v)));
  const putFile = (key: string, f: StoredFile, ttl?: number) => {
    if (f.data.length > MAX_STORED_FILE) return Promise.resolve();
    return ttl ? cmd("SET", key, f.data.toString("base64"), "EX", ttl) : cmd("SET", key, f.data.toString("base64"));
  };
  return {
    kind: "redis",
    async list() {
      const ids = (await getJSON<string[]>(`${P}:index`)) ?? [];
      const out: Update[] = [];
      for (const id of ids) {
        const u = await getJSON<Update>(`${P}:u:${id}`);
        if (u) out.push(u);
      }
      return out;
    },
    async publish(id, u, files) {
      for (const f of files) await putFile(`${P}:f:${id}:${f.name}`, f);
      await setJSON(`${P}:u:${id}`, u);
      const ids = (await getJSON<string[]>(`${P}:index`)) ?? [];
      await setJSON(`${P}:index`, Array.from(new Set([...ids, id])).sort()); // index last: incomplete updates are never listed
    },
    async readFile(id, name) {
      const v = (await cmd("GET", `${P}:f:${id}:${path.basename(name)}`)) as string | null;
      return v ? Buffer.from(v, "base64") : null;
    },
    async saveDraft(id, draft, files) {
      for (const f of files) await putFile(`${P}:d:${id}:f:${f.name}`, f, 3600);
      await setJSON(`${P}:d:${id}`, draft, 3600);
    },
    async loadDraft(id) {
      const draft = await getJSON<Draft>(`${P}:d:${id}`);
      if (!draft) return null;
      const files: StoredFile[] = [];
      for (const n of draft.files) {
        const v = (await cmd("GET", `${P}:d:${id}:f:${n}`)) as string | null;
        if (v) files.push({ name: n, data: Buffer.from(v, "base64") });
      }
      return { draft, files };
    },
    async deleteDraft(id) {
      const draft = await getJSON<Draft>(`${P}:d:${id}`);
      for (const n of draft?.files ?? []) await cmd("DEL", `${P}:d:${id}:f:${n}`);
      await cmd("DEL", `${P}:d:${id}`);
    },
    async saveKB(kb) { await setJSON(`${P}:kb`, kb); },
    async loadKB() { return getJSON(`${P}:kb`); },
    async reset() {
      const ids = (await getJSON<string[]>(`${P}:index`)) ?? [];
      await cmd("DEL", `${P}:index`); // the current state goes back to baseline immediately
      for (const id of ids) {
        const u = await getJSON<Update>(`${P}:u:${id}`);
        const names = Array.from(new Set((u?.sources ?? []).map((s) => path.basename(s.path.split("#")[0]))));
        for (const n of names) await cmd("DEL", `${P}:f:${id}:${n}`);
        await cmd("DEL", `${P}:u:${id}`);
      }
      return ids.length;
    },
  };
}

let cached: UpdateStore | null = null;
export function updateStore(): UpdateStore {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  cached = url && token ? createRedisUpdateStore(url, token) : createFileUpdateStore(path.join(process.cwd(), "data", "updates"));
  return cached;
}
