import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { acceptsMessage, classroomRequirements, CHANNEL } from "../src/learning/ui-bridge.mjs";
import { uiOrigins } from "../src/learning/ui-service.mjs";
import { createLearningHandler } from "../runtime/openquantum/web-learning/index.mjs";
import { Readable } from "node:stream";

test("embedded UI messages are bound to one child window, origin and bounded command surface", () => {
  const child = {};
  const origin = "http://localhost:3037";
  const event = { source: child, origin, data: { channel: CHANNEL, type: "generate", requestId: randomUUID() } };
  assert.equal(acceptsMessage(event, child, origin), true);
  assert.equal(acceptsMessage({ ...event, source: {} }, child, origin), false);
  assert.equal(acceptsMessage({ ...event, origin: "https://example.org" }, child, origin), false);
  assert.equal(acceptsMessage({ ...event, data: { ...event.data, type: "session.prompt" } }, child, origin), false);
  assert.equal(acceptsMessage({ ...event, data: { ...event.data, requestId: "../../credentials" } }, child, origin), false);
  assert.equal(acceptsMessage(event, null, origin), false);
});

test("original form maps to the existing learning contract and rejects unsupported options", () => {
  const form = { requirement: "高级：量子纠错\n掌握稳定子形式", material: "原创材料" };
  assert.deepEqual(classroomRequirements(form), { topic: "高级：量子纠错", goal: form.requirement, material: "原创材料", level: "高级", slideCount: 4 });
  assert.throws(() => classroomRequirements({ ...form, material: "a".repeat(24_001) }), /24,000/);
  assert.throws(() => classroomRequirements({ ...form, requirement: "a".repeat(2001) }), /2,000/);
  assert.throws(() => classroomRequirements({ ...form, interactiveMode: true }), /尚未接入/);
  assert.throws(() => classroomRequirements({ ...form, webSearch: true }), /尚未接入/);
});

test("UI service remains on loopback and cannot be redirected to an arbitrary origin", () => {
  assert.deepEqual(uiOrigins("http://localhost:3000", 3037), { parent: "http://localhost:3000", origin: "http://localhost:3037" });
  for (const origin of ["https://example.org", "http://localhost:3000/path", "http://localhost.evil:3000", "http://user@localhost:3000"]) assert.throws(() => uiOrigins(origin, 3037));
  for (const port of [3000, 80, 0, NaN, 65536]) assert.throws(() => uiOrigins("http://localhost:3000", port));
});

test("opening the original UI crosses the existing Host request boundary", async () => {
  let started;
  const handler = createLearningHandler({ dispatch: () => assert.fail("not a classroom mutation"), openUi: (origin) => { started = origin; return { url: "http://localhost:3037/" }; } });
  async function request(origin) {
    const req = Readable.from([Buffer.from(JSON.stringify({ action: "open-ui" }))]);
    req.method = "POST"; req.headers = { host: "localhost:3000", origin, "content-type": "application/json" };
    let status, body;
    await handler(req, { writeHead(value) { status = value; }, end(value) { body = JSON.parse(value); } });
    return { status, body };
  }
  assert.equal((await request("https://example.org")).status, 403);
  assert.equal(started, undefined);
  assert.equal((await request("http://localhost:3000")).status, 200);
  assert.equal(started, "http://localhost:3000");
});
