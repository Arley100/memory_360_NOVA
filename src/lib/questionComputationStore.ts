// Dedicated answer caches survive update reset. Same filesystem / Upstash selection as updateStore.
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { OFFICIAL_QUESTION_IDS, type QuestionComputation } from "./questionTypes";

interface Stored { current: QuestionComputation; history: QuestionComputation[] }
export interface QuestionComputationStore {
  get(id: string): Promise<QuestionComputation | null>;
  getAll(): Promise<QuestionComputation[]>;
  save(record: QuestionComputation, onlyIfAbsent?: boolean): Promise<QuestionComputation>;
  history(id: string): Promise<QuestionComputation[]>;
}
function validate(id: string) {
  if (!OFFICIAL_QUESTION_IDS.includes(id)) throw new Error("Identifiant de question officielle invalide.");
}

export function createFileQuestionStore(root: string): QuestionComputationStore {
  const locks = new Map<string, Promise<unknown>>();
  const read = async (id: string): Promise<Stored | null> => {
    validate(id);
    try { return JSON.parse(await fs.readFile(path.join(root, `${id}.json`), "utf8")) as Stored; }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
  };
  const store: QuestionComputationStore = {
    async get(id) { return (await read(id))?.current ?? null; },
    async getAll() { return (await Promise.all(OFFICIAL_QUESTION_IDS.map((id) => store.get(id)))).filter((r): r is QuestionComputation => r !== null); },
    async history(id) { return (await read(id))?.history ?? []; },
    async save(record, onlyIfAbsent = false) {
      validate(record.questionId);
      const id = record.questionId;
      const operation = (locks.get(id) ?? Promise.resolve()).catch(() => {}).then(async () => {
        await fs.mkdir(root, { recursive: true });
        const existing = await read(id);
        if (onlyIfAbsent && existing) return existing.current;
        const current = existing && existing.current.computedAt > record.computedAt ? existing.current : record;
        const value: Stored = { current, history: [...(existing?.history ?? []), record] };
        const target = path.join(root, `${id}.json`);
        if (onlyIfAbsent) {
          // Exclusive creation also protects initialization across server processes.
          try { await fs.writeFile(target, JSON.stringify(value, null, 2), { flag: "wx" }); }
          catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; return (await read(id))!.current; }
        } else {
          const tmp = path.join(root, `${id}.${randomUUID()}.tmp`);
          try { await fs.writeFile(tmp, JSON.stringify(value, null, 2)); await fs.rename(tmp, target); }
          finally { await fs.unlink(tmp).catch(() => {}); }
        }
        return current;
      });
      locks.set(id, operation);
      try { return await operation; } finally { if (locks.get(id) === operation) locks.delete(id); }
    },
  };
  return store;
}

export function createRedisQuestionStore(url: string, token: string, prefix: string): QuestionComputationStore {
  const cmd = async (...args: (string | number)[]): Promise<unknown> => {
    const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(args), cache: "no-store" });
    const value = await response.json() as { result?: unknown; error?: string };
    if (!response.ok || value.error) throw new Error(`Erreur de stockage des questions : ${value.error ?? response.status}`);
    return value.result;
  };
  const key = (id: string) => { validate(id); return `${prefix}:questions:${id}`; };
  const read = async (id: string): Promise<Stored | null> => {
    const raw = await cmd("GET", key(id)) as string | null;
    if (!raw) return null;
    const state = JSON.parse(raw) as { current: string; history: string[] };
    return { current: JSON.parse(state.current), history: state.history.map((record) => JSON.parse(record)) };
  };
  const store: QuestionComputationStore = {
    async get(id) { return (await read(id))?.current ?? null; },
    async getAll() { return (await Promise.all(OFFICIAL_QUESTION_IDS.map((id) => store.get(id)))).filter((r): r is QuestionComputation => r !== null); },
    async history(id) { return (await read(id))?.history ?? []; },
    async save(record, onlyIfAbsent = false) {
      // Append history and replace the current record atomically; initialization never overwrites a computation.
      const script = `local old = redis.call('GET', KEYS[1])
if old and ARGV[2] == '1' then return cjson.decode(old).current end
local state = {history = {}}
if old then state = cjson.decode(old) end
table.insert(state.history, ARGV[1])
if not state.current or cjson.decode(state.current).computedAt <= cjson.decode(ARGV[1]).computedAt then
  state.current = ARGV[1]
end
redis.call('SET', KEYS[1], cjson.encode(state))
return state.current`;
      return JSON.parse(await cmd("EVAL", script, 1, key(record.questionId), JSON.stringify(record), onlyIfAbsent ? "1" : "0") as string) as QuestionComputation;
    },
  };
  return store;
}

let cached: QuestionComputationStore | undefined;
export function questionComputationStore(): QuestionComputationStore {
  if (!cached) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    cached = url && token ? createRedisQuestionStore(url, token, process.env.STORE_PREFIX || "m360") : createFileQuestionStore(path.join(process.cwd(), "data", "question-computations"));
  }
  return cached;
}
