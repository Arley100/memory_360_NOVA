# Question freshness and manual recomputation

Q01–Q10 now have independent persisted answer caches. Opening Questions imports any missing cache from the existing resolved answer, without calling the LLM. The initial timestamp is explicitly labelled as an initial cache timestamp; it is not an inferred historical LLM execution time. Once initialized, update publication never replaces the cached answer or its timestamp.

Freshness compares included update IDs with the published state. New updates invalidate only questions listed in `affected.answers`. Removal of an included update invalidates the computation that used it. Update fingerprints also detect reused IDs after reset. File change labels use recorded paths and SHA-256 values; missing hashes produce the neutral “Context changed” label. Storage version directories are normalized when comparing the logical path of successive published files.

Each refresh button and the batch toolbar use `POST /api/questions/recompute`. The server calls the existing `askProject()` pipeline with a pinned published-update snapshot and a concurrency limit of two. JSON clients receive partial-success results; the Questions UI requests NDJSON to display real completion progress from that same request. New updates or reset during a computation can leave its result stale, because they were not part of its input.

Successful computations retain only verified citations. Failed computations preserve the previous answer and evidence. Quotes from sources removed by reset remain visible as archived evidence, without links to missing source pages. The baseline and the existing update/revised-answer architecture are untouched.

Local records and full computation history live in `data/question-computations/Qxx.json`, excluded from Git and deployment file tracing. Hosted records use the existing Upstash/KV environment variables and `${STORE_PREFIX || "m360"}:questions:Qxx` keys. Redis appends history atomically. Update reset does not remove these records.

## Verification

Run the durable tests with:

```powershell
node --import tsx --test tests/question-freshness.test.ts
```

The tests cover relevant/unrelated publication, backward clocks, added/modified/unknown-hash files, reset and reused IDs, fallback initialization, immutable caches after publication, restart persistence, history preservation, late writes, two-worker batches, partial failures, verified-only evidence, and publication during recomputation. Redis adapter tests use mocked REST responses; they do not write to a live hosted store.

React interaction checks additionally verified ten checkbox/refresh/timestamp controls, zero model requests on initialization, Select stale, one browser request for a three-question batch, streamed progress, successful selection clearing, failed-answer preservation, single-question retry, the 503 message, incoming reset state, refresh animation, and archived evidence. These checks used a mocked model response and did not spend provider credits.

The actual local Questions route returned 200, rendered all ten controls, and kept persisted cache records unchanged on reload. Invalid recompute requests returned 400. Production compilation and TypeScript checks passed. Lint has only the two existing unused-variable warnings in `src/lib/prompts.ts`.

Browser screenshot verification and live hosted Redis/provider execution were not performed.
