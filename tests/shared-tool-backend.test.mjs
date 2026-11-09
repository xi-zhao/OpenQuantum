import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { stringify } from "yaml";
import { createToolBackend, boundedSchema, DEFAULT_BACKEND_LIMITS } from "../src/lib/tool-backend.mjs";
import { createBackend, boundedSchema as codexSchema } from "../runtime/chatgpt/backend.mjs";
import { createDesktopBackend } from "../src/settings/desktop/backend.mjs";

const limits = { ...DEFAULT_BACKEND_LIMITS, timeoutMs: 1234, concurrentCalls: 1 };
const tool = { name: "calculate", description: "Fixture", inputSchema: { type: "object", properties: {
  value: { type: "integer" }, execution: { type: "object", properties: {} },
}, required: ["value"], additionalProperties: false }, annotations: { readOnlyHint: true } };
const catalog = () => ({ root: "/unused", capabilities: [{ id: "fixture", skill: "source", tools: [tool.name] }],
  providers: [{ key: "fixture", kind: "native", tools: [{ name: tool.name }] }],
  tools: [{ ...tool, inputSchema: boundedSchema(tool.inputSchema, limits) }], secretFields: { fixture: ["TOKEN"] } });
const noExternal = () => ({ reconcile: async () => {}, close: async () => {} });

test("the existing schema projection entry keeps its fixed budget when used as a callback", () => {
  const [projected] = [tool.inputSchema].map(codexSchema);
  assert.equal(projected.properties.execution.properties.timeoutMs.maximum, DEFAULT_BACKEND_LIMITS.timeoutMs);
});

test("shared execution uses supplied budgets, authorization and secret fields without host files", async t => {
  let started = 0, executed = 0, closed = 0, timeout;
  const backend = createToolBackend({ catalog: catalog(), limits, createExternal: noExternal, connect: async () => {
    started++;
    return { listTools: async () => ({ tools: [tool] }),
      callTool: async (_input, _schema, options) => { executed++; timeout = options.timeout; return { content: [{ type: "text", text: "fixture-secret" }] }; },
      close: async () => { closed++; } };
  } });
  t.after(() => backend.close());
  await assert.rejects(backend.call(tool.name, { value: 1, execution: { timeoutMs: 1235 } }), /Invalid arguments/);
  await assert.rejects(backend.call(tool.name, { value: 1 }, undefined, async () => false), /停用/);
  assert.equal(started, 0);
  let checks = 0;
  await assert.rejects(backend.call(tool.name, { value: 1 }, undefined, async () => ++checks === 1), /停用/);
  assert.equal(executed, 0); assert.equal(closed, 1);
  const value = await backend.call(tool.name, { value: 1 }, undefined, async () => true, { TOKEN: "fixture-secret" });
  assert.equal(value.content[0].text, "[redacted]");
  assert.equal(value.content[0].type, "text");
  assert.equal(timeout, limits.timeoutMs);
  assert.equal(closed, 2);
});

test("shared shutdown aborts the active call and waits for adapter cleanup before returning", { timeout: 10000 }, async t => {
  const entered = Promise.withResolvers(), closing = Promise.withResolvers(), release = Promise.withResolvers();
  const backend = createToolBackend({ catalog: catalog(), limits, createExternal: noExternal, connect: async () => ({
    listTools: async () => ({ tools: [tool] }),
    callTool: async (_input, _schema, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      entered.resolve();
    }),
    close: async () => { closing.resolve(); await release.promise; },
  }) });
  t.after(async () => { release.resolve(); await backend.close(); });
  const call = assert.rejects(backend.call(tool.name, { value: 1 }), /abort/i);
  await entered.promise;
  await assert.rejects(backend.call(tool.name, { value: 2 }), /繁忙/);
  let finished = false;
  const stopped = backend.close().then(() => { finished = true; });
  await closing.promise;
  assert.equal(finished, false);
  await assert.rejects(backend.call(tool.name, { value: 3 }), /已关闭/);
  release.resolve();
  await Promise.all([call, stopped]);
  assert.equal(finished, true);
});

test("invalid catalogs do not allocate a persistent external owner", () => {
  let owners = 0;
  const input = catalog();
  input.tools[0].inputSchema = { type: "not-a-json-schema-type" };
  assert.throws(() => createToolBackend({ catalog: input, limits, connect: async () => {},
    createExternal: () => { owners++; return noExternal(); } }));
  assert.equal(owners, 0);
});

test("Codex and Desktop retain identical catalogs while Desktop native execution stays in-process", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oq shared backend "));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const directory of [".agents", "examples/quantum-algorithms", "src/capabilities", "dist/chatgpt"]) {
    await fs.mkdir(path.join(root, directory), { recursive: true });
  }
  await fs.writeFile(path.join(root, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [] }));
  await fs.writeFile(path.join(root, "examples/quantum-algorithms/coverage.json"), JSON.stringify({ guides: [] }));
  await fs.writeFile(path.join(root, ".agents/capability-packages.yml"), stringify({ schemaVersion: "1.1", packages: [
    { id: "fixture", execution: { nativeTools: [{ name: "calculate", effect: "read-only", providerPlugin: "./quantum-practices-tools.mjs" }] } },
  ] }));
  await fs.writeFile(path.join(root, "src/capabilities/quantum-practices-tools.mjs"), `export const toolDefinitions = [{
    name: "calculate", description: "Fixture", parameters: { type: "object", properties: {}, additionalProperties: false },
    output: { schema: { type: "object", properties: { pid: { type: "integer" } } }, render: (_args, value) => [{ type: "text", text: String(value.pid) }] },
    execute: async () => ({ pid: process.pid }),
  }];`);
  // Native Desktop calls must succeed even when there is no executable for a
  // stdio launch. Codex must still use its stdio adapter and fail that launch.
  const nodeExecutable = path.join(root, "unavailable-node");
  const built = await createDesktopBackend({ root, nodeExecutable, discover: true });
  t.after(() => built.close());
  const bytes = JSON.stringify({ providers: built.providers, tools: built.tools, capabilities: built.capabilities });
  await fs.writeFile(path.join(root, "dist/chatgpt/capabilities.json"), bytes);
  await fs.writeFile(path.join(root, "dist/chatgpt/release.json"), JSON.stringify({ contractDigest: createHash("sha256").update(bytes).digest("hex") }));
  const desktop = await createDesktopBackend({ root, nodeExecutable });
  const codex = await createBackend({ root, nodeExecutable });
  t.after(async () => { await desktop.close(); await codex.close(); });
  assert.deepEqual(desktop.tools, codex.tools);
  assert.deepEqual(desktop.providers, codex.providers);
  assert.deepEqual(desktop.capabilities, codex.capabilities);
  assert.equal((await desktop.call("calculate", {})).structuredContent.pid, process.pid);
  await assert.rejects(codex.call("calculate", {}), /ENOENT|closed/i);
});
