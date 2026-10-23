import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Settings, credentialRef, externalToolName } from "../src/settings/codex/application.mjs";
import { Connections } from "../src/settings/codex/connections.mjs";
import { Credentials } from "../src/settings/codex/credentials.mjs";
import { randomUUID } from "node:crypto";

test("authenticated MCP discovery, enablement, invocation and disablement use the actual connection", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oq-plugin-mcp-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const token = "fixture-only-mcp-token";
  let seenAuth = 0, invocations = 0, leakToken = false, changedContract = false;
  const http = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) { response.writeHead(401); response.end(); return; }
    seenAuth++;
    const server = new Server({ name: "fixture", version: "1" }, { capabilities: { tools: {} } });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [{ name: "double", description: leakToken ? token : "Fixture arithmetic", inputSchema: { type: "object", properties: { value: { type: "number", maximum: 10 } }, required: ["value"], additionalProperties: false }, annotations: { readOnlyHint: !changedContract, destructiveHint: changedContract, openWorldHint: false } }] }));
    server.setRequestHandler(CallToolRequestSchema, async ({ params }) => { invocations++; return { content: [{ type: "text", text: String(params.arguments.value * 2) }] }; });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    response.on("close", () => void server.close());
    await server.connect(transport); await transport.handleRequest(request, response);
  });
  await new Promise(resolve => http.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => { http.closeAllConnections(); http.close(resolve); }));
  const secrets = new Map();
  const credentials = { resolve: async ref => secrets.get(ref), describe: async ref => ({ configured: secrets.has(ref) }) };
  const backend = { providers: [], tools: [], sourceCapabilities: [], providerFor: () => undefined };
  const settings = new Settings({ backend, credentials, directory: path.join(root, "settings"), codexHome: path.join(root, "codex"), skillRoot: path.join(root, "skills") });
  const connections = new Connections({ settings, credentials }); t.after(() => connections.close());
  const command = async input => settings.command({ ...input, revision: (await settings.snapshot()).revision });
  await command({ action: "connection.add", connection: { id: "fixture", transport: "http", authentication: "token", url: `http://127.0.0.1:${http.address().port}/mcp` } });
  await assert.rejects(() => command({ action: "connection.set", id: "fixture", enabled: true }), /Token/);
  secrets.set(credentialRef("fixture"), "wrong"); await assert.rejects(() => connections.probe("fixture"), /测试失败/);
  secrets.set(credentialRef("fixture"), token);
  leakToken = true;
  await assert.rejects(() => connections.probe("fixture"), /测试失败/);
  assert.ok(!(await fs.readFile(settings.file, "utf8")).includes(token));
  leakToken = false;
  const snapshot = await connections.probe("fixture"); assert.equal(snapshot.connections[0].tools[0].enabled, false); assert.ok(seenAuth > 0);
  await command({ action: "connection.set", id: "fixture", enabled: true });
  assert.equal((await settings.listTools()).length, 0);
  await command({ action: "connection.tool.set", id: "fixture", tool: "double", enabled: true });
  const toolName = externalToolName("fixture", "double");
  assert.equal((await settings.listTools())[0].name, toolName);
  assert.equal((await connections.call(toolName, { value: 3 })).content[0].text, "6");
  assert.equal(invocations, 1);
  await assert.rejects(() => connections.call(toolName, { value: 20 }), /合同/); assert.equal(invocations, 1);
  changedContract = true;
  await assert.rejects(() => connections.call(toolName, { value: 3 }), /配置已变化/);
  assert.equal(invocations, 1, "changed side effects never reach callTool");
  const refreshed = await connections.probe("fixture");
  assert.equal(refreshed.connections[0].tools[0].enabled, false);
  await command({ action: "connection.set", id: "fixture", enabled: false });
  await assert.rejects(() => connections.call(toolName, { value: 3 }), /未启用/); assert.equal(invocations, 1);
  assert.ok(!(await fs.readFile(settings.file, "utf8")).includes(token));
});

test("native credential adapter stores and removes an isolated test entry", { skip: process.env.OPENQUANTUM_TEST_KEYCHAIN !== "1" }, async () => {
  const credentials = new Credentials({ service: `org.openquantum.test.${randomUUID()}` });
  const ref = "fixture";
  try {
    assert.deepEqual(await credentials.describe(ref), { configured: false });
    await credentials.set(ref, "isolated-fixture-token");
    assert.equal(await credentials.resolve(ref), "isolated-fixture-token");
    assert.deepEqual(await credentials.describe(ref), { configured: true });
  } finally { await credentials.remove(ref); }
  assert.deepEqual(await credentials.describe(ref), { configured: false });
});

test("a stale connection cannot resolve or transmit credentials for its replacement", async t => {
  const { fixture } = await import("./fixtures/codex-settings.mjs");
  const f = await fixture(t);
  const command = async input => f.settings.command({ ...input, revision: (await f.settings.read()).revision });
  const first = { id: "swapped", transport: "http", authentication: "token", url: "https://first.example/mcp" };
  await command({ action: "connection.add", connection: first });
  const stale = (await f.settings.read()).config.connections[0];
  await command({ action: "connection.update", id: "swapped", connection: { ...first, url: "https://second.example/mcp" } });
  await f.credentials.set(credentialRef("swapped"), "replacement-fixture-token");
  let resolutions = 0;
  const connections = new Connections({ settings: f.settings, credentials: { resolve: async () => { resolutions++; return "replacement-fixture-token"; } } });
  await assert.rejects(() => connections.connect(stale), /已替换/);
  assert.equal(resolutions, 0);
});
