import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, readlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { acceptsMessage, CHANNEL } from "../src/learning/ui-bridge.mjs";
import { uiOrigins, prepareLearningData } from "../src/learning/ui-service.mjs";
import { createLearningHandler } from "../runtime/openquantum/web-learning/index.mjs";
import { Readable } from "node:stream";

test("embedded UI messages are bound to one child window, origin and bounded command surface", () => {
  const child = {};
  const origin = "http://localhost:3037";
  const event = { source: child, origin, data: { channel: CHANNEL, type: "library", requestId: randomUUID() } };
  assert.equal(acceptsMessage(event, child, origin), true);
  assert.equal(acceptsMessage({ ...event, source: {} }, child, origin), false);
  assert.equal(acceptsMessage({ ...event, origin: "https://example.org" }, child, origin), false);
  assert.equal(acceptsMessage({ ...event, data: { ...event.data, type: "session.prompt" } }, child, origin), false);
  assert.equal(acceptsMessage({ ...event, data: { ...event.data, requestId: "../../credentials" } }, child, origin), false);
  assert.equal(acceptsMessage(event, null, origin), false);
});

test("UI service remains on loopback and cannot be redirected to an arbitrary origin", () => {
  assert.deepEqual(uiOrigins("http://localhost:3000", 3037), { parent: "http://localhost:3000", origin: "http://localhost:3037" });
  for (const origin of ["https://example.org", "http://localhost:3000/path", "http://localhost.evil:3000", "http://user@localhost:3000"]) assert.throws(() => uiOrigins(origin, 3037));
  for (const port of [3000, 80, 0, NaN, 65536]) assert.throws(() => uiOrigins("http://localhost:3000", port));
});

test("application materials survive checkout data relocation and repeated startup", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "learning-data-"));
  const directory = path.join(root, "vendor");
  try {
    await mkdir(path.join(root, ".openquantum/learning"), { recursive: true });
    await mkdir(path.join(directory, "data"), { recursive: true });
    await writeFile(path.join(directory, "data/material.txt"), "private course material");
    await prepareLearningData(root, directory);
    await prepareLearningData(root, directory);
    assert.equal(await readlink(path.join(directory, "data")), path.join(root, ".openquantum/learning/openmaic-data"));
    assert.equal(await readFile(path.join(directory, "data/material.txt"), "utf8"), "private course material");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("two existing material directories are preserved instead of overwriting either", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "learning-data-"));
  const directory = path.join(root, "vendor");
  const persistent = path.join(root, ".openquantum/learning/openmaic-data");
  try {
    await mkdir(path.join(directory, "data"), { recursive: true });
    await mkdir(persistent, { recursive: true });
    await writeFile(path.join(directory, "data/material.txt"), "existing vendor material");
    await writeFile(path.join(persistent, "material.txt"), "existing persistent material");
    await assert.rejects(prepareLearningData(root, directory), /两份数据目录/);
    assert.equal(await readFile(path.join(directory, "data/material.txt"), "utf8"), "existing vendor material");
    assert.equal(await readFile(path.join(persistent, "material.txt"), "utf8"), "existing persistent material");
  } finally { await rm(root, { recursive: true, force: true }); }
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
