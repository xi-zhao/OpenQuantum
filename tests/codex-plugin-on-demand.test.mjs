import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { stringify } from "yaml";
import { createBackend } from "../runtime/chatgpt/backend.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oq lazy catalog "));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const name of [".agents", "examples/quantum-algorithms", "dist/chatgpt"]) await fs.mkdir(path.join(root, name), { recursive: true });
  await fs.writeFile(path.join(root, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [] }));
  await fs.writeFile(path.join(root, "examples/quantum-algorithms/coverage.json"), JSON.stringify({ guides: [] }));
  await fs.writeFile(path.join(root, ".agents/capability-packages.yml"), stringify({ schemaVersion: "1.1", packages: [
    { id: "alpha", execution: { nativeTools: [{ name: "alpha", effect: "read-only", providerPlugin: "./quantum-practices-tools.mjs" }] } },
    { id: "beta", execution: { nativeTools: [{ name: "beta", effect: "read-only", providerPlugin: "./metriq-data-tools.mjs" }] } },
  ] }));
  const events = [], overrides = {};
  const connect = async provider => {
    const name = provider.tools[0].name;
    events.push(`connect:${name}`);
    if (overrides.connect) await overrides.connect(name);
    return {
      listTools: async () => {
        if (overrides.list) await overrides.list(name);
        return { tools: [{ name, description: `${name} fixture`, annotations: { readOnlyHint: true },
          inputSchema: { type: "object", properties: { value: { type: "integer" } }, required: ["value"], additionalProperties: false }, ...overrides.tool }] };
      },
      callTool: async params => {
        events.push(`call:${name}`);
        if (overrides.call) await overrides.call(name);
        return { content: [{ type: "text", text: String(params.arguments.value) }] };
      },
      close: async () => { events.push(`close:${name}`); if (overrides.close) await overrides.close(); },
    };
  };
  const built = await createBackend({ root, discover: true, connect });
  const catalog = { providers: built.providers, tools: built.tools, capabilities: built.capabilities };
  const write = async data => {
    const bytes = JSON.stringify(data);
    await fs.writeFile(path.join(root, "dist/chatgpt/capabilities.json"), bytes);
    await fs.writeFile(path.join(root, "dist/chatgpt/release.json"), JSON.stringify({ contractDigest: createHash("sha256").update(bytes).digest("hex") }));
  };
  await write(catalog);
  events.length = 0;
  return { root, events, overrides, catalog, write, backend: () => createBackend({ root, connect }) };
}

test("startup lists the full bundled catalog without starting any provider; calls start and close only the selected one", async t => {
  const f = await fixture(t);
  const backend = await f.backend();
  assert.deepEqual(backend.tools.map(tool => tool.name), ["alpha", "beta"]);
  assert.deepEqual(f.events, []);
  for (let n = 0; n < 2; n++) assert.equal((await backend.call("alpha", { value: n })).content[0].text, String(n));
  assert.deepEqual(f.events, ["connect:alpha", "call:alpha", "close:alpha", "connect:alpha", "call:alpha", "close:alpha"]);
});

test("disabled, invalid and already cancelled calls start no provider", async t => {
  const f = await fixture(t), backend = await f.backend();
  await assert.rejects(backend.call("alpha", { value: 1 }, undefined, async () => false), /停用/);
  await assert.rejects(backend.call("alpha", { value: "bad" }), /Invalid arguments/);
  await assert.rejects(backend.call("alpha", { value: 1 }, AbortSignal.abort()), /abort/i);
  await assert.rejects(backend.call("unknown", {}), /Unknown/);
  assert.deepEqual(f.events, []);
});

test("digest, policy and missing catalog failures never fall back to bulk startup", async t => {
  const f = await fixture(t);
  const file = path.join(f.root, "dist/chatgpt/capabilities.json");
  await fs.appendFile(file, " ");
  await assert.rejects(f.backend(), /digest mismatch/);
  await f.write({ ...f.catalog, providers: [] });
  await assert.rejects(f.backend(), /capability policy/);
  await f.write({ ...f.catalog, tools: [f.catalog.tools[0], f.catalog.tools[0]] });
  await assert.rejects(f.backend(), /missing or duplicate/);
  await fs.rm(file);
  await assert.rejects(f.backend(), { code: "ENOENT" });
  assert.deepEqual(f.events, []);
});

test("same-name schema or effect drift is rejected before execution and closes the provider", async t => {
  const f = await fixture(t), backend = await f.backend();
  for (const tool of [{ inputSchema: { type: "object", properties: {} } }, { annotations: { readOnlyHint: false } }]) {
    f.events.length = 0; f.overrides.tool = tool;
    await assert.rejects(backend.call("alpha", { value: 1 }), /contract changed/);
    assert.deepEqual(f.events, ["connect:alpha", "close:alpha"]);
  }
  f.overrides.tool = undefined;
  await backend.call("alpha", { value: 1 });
});

test("a broken optional provider does not prevent discovery or another provider's call", async t => {
  const f = await fixture(t);
  f.overrides.connect = async name => { if (name === "beta") throw new Error("fixture unavailable"); };
  const backend = await f.backend();
  await assert.rejects(backend.call("beta", { value: 1 }), /fixture unavailable/);
  await backend.call("alpha", { value: 2 });
  assert.equal(f.events.filter(event => event === "call:alpha").length, 1);
});

test("cancellation or disable during handshake prevents execution and frees call capacity", async t => {
  const f = await fixture(t), backend = await f.backend();
  const controller = new AbortController();
  f.overrides.list = async () => controller.abort();
  await assert.rejects(backend.call("alpha", { value: 1 }, controller.signal), /abort/i);
  f.overrides.list = undefined;
  let checks = 0;
  await assert.rejects(backend.call("alpha", { value: 1 }, undefined, async () => ++checks === 1), /停用/);
  assert.ok(!f.events.some(event => event.startsWith("call:")));
  await backend.call("beta", { value: 1 });
});

test("even provider close failures do not leak the concurrent-call budget", async t => {
  const f = await fixture(t), backend = await f.backend();
  f.overrides.close = async () => { throw new Error("close failed"); };
  for (let n = 0; n < 3; n++) await assert.rejects(backend.call("alpha", { value: n }), /close failed/);
  f.overrides.close = undefined;
  await backend.call("alpha", { value: 4 });
});
