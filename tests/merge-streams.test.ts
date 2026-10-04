import assert from "node:assert/strict";
import test from "node:test";
import { readStream } from "../src/lib/stream";
import { plain, fmtDay, fmtDateTime, stripQ } from "../src/lib/text";
import { GET as preview } from "../src/app/api/segment/route";
import { baselineSegments } from "../src/lib/store";

test("stream reader handles split UTF-8, heartbeat lines and an unterminated final result", async () => {
  const bytes = new TextEncoder().encode('\n{"type":"ping"}\n{"type":"result","answer":"Montréal ✓"}');
  const messages: Record<string, unknown>[] = [];
  await readStream(new Response(new ReadableStream({ start(c) {
    for (const byte of bytes) c.enqueue(Uint8Array.of(byte));
    c.close();
  } })), (m) => messages.push(m));
  assert.deepEqual(messages, [{ type: "ping" }, { type: "result", answer: "Montréal ✓" }]);
});

test("stream reader surfaces malformed responses and server errors and releases its reader", async () => {
  const malformed = new Response('{"type":');
  await assert.rejects(readStream(malformed, () => {}), SyntaxError);
  assert.equal(malformed.body?.locked, false);
  const failed = new Response('{"type":"error","error":"Analysis failed"}\n');
  await assert.rejects(readStream(failed, (m) => { throw new Error(String(m.error)); }), /Analysis failed/);
  assert.equal(failed.body?.locked, false);
  await assert.rejects(readStream(new Response(null), () => {}), /no response stream/);
});

test("display helpers preserve calendar dates and French text while removing duplicate question numbers", () => {
  assert.equal(fmtDay("2026-10-22"), "Oct 22, 2026");
  assert.match(fmtDateTime("2026-10-04T00:57:00Z"), /Oct 3, 2026.*8:57.*ET/);
  assert.equal(stripQ("Q01. What changed?"), "What changed?");
  assert.equal(plain("# Résumé\n- **Décision** confirmée"), "Résumé\nDécision confirmée");
});

test("evidence previews check today's corpus and reject unknown passage locators", async () => {
  const segment = (await baselineSegments()).find((s) => s.text.length > 20)!;
  const request = (loc: string, quote: string) => new Request(`http://localhost/api/segment?src=${encodeURIComponent(segment.src)}&loc=${encodeURIComponent(loc)}&quote=${encodeURIComponent(quote)}`);
  const response = await preview(request(segment.loc, segment.text));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).verified, true);
  const invented = await preview(request(segment.loc, "An invented quote absent from the source."));
  assert.equal((await invented.json()).verified, false);
  assert.equal((await preview(request("nonexistent-locator", segment.text))).status, 404);
});
