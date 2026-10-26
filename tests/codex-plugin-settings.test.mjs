import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "smol-toml";
import { Settings, credentialRef, externalToolName, validateConnection } from "../src/settings/codex/application.mjs";
import { withLock } from "../src/settings/codex/storage.mjs";
import { Connections } from "../src/settings/codex/connections.mjs";
import { createCredentialWindow } from "../src/settings/codex/credential-window.mjs";
import { createMcpServer, SETTINGS_TOOL } from "../runtime/chatgpt/server.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { fixture } from "./fixtures/codex-settings.mjs";

test("Codex categories are presentation metadata and preserve configured states", async t => {
  const f = await fixture(t);
  const capability = f.backend.sourceCapabilities[0];
  capability.id = "qec-memory-experiment";
  capability.summary = "Short settings summary";
  const before = await f.settings.snapshot();
  assert.equal(before.skills[0].category, "qec");
  assert.equal(before.tools[0].category, "qec");
  assert.equal(before.providers[0].category, "qec");
  assert.equal(before.skills[0].description, capability.summary);
  await f.settings.command({ action: "tool.set", id: "calculate", enabled: false, revision: before.revision });
  const after = await f.settings.snapshot();
  assert.equal(after.tools[0].enabled, false);
  assert.equal(after.skills[0].enabled, true);
  assert.equal(after.providers[0].enabled, true);
  assert.equal(after.tools[0].category, "qec");
  assert.equal((await f.settings.snapshot()).revision, after.revision);
  assert.equal(f.calls(), 0);
});

test("settings change execution policy, retain the stable MCP interface and reject cached calls", async t => {
  const f = await fixture(t);
  const connections = new Connections(f);
  const server = createMcpServer({ ...f, connections, credentialWindow: {}, html: "<html></html>", release: { version: "0.7.4" } });
  const client = new Client({ name: "test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  t.after(async () => { await client.close(); await server.close(); });
  const initial = (await client.listTools()).tools;
  assert.ok(initial.some(tool => tool.name === "execute_openquantum_tool"));
  await client.callTool({ name: "calculate", arguments: {} }); assert.equal(f.calls(), 1);
  const snapshot = await f.settings.snapshot();
  await f.settings.command({ action: "tool.set", id: "calculate", enabled: false, revision: snapshot.revision });
  assert.ok(!(await client.listTools()).tools.some(tool => tool.name === "calculate"));
  assert.deepEqual((await client.listTools()).tools, initial);
  const blocked = await client.callTool({ name: "find_openquantum_skills", arguments: { skillId: "example", toolName: "calculate" } });
  assert.equal(blocked.structuredContent.state, "blocked");
  assert.equal(blocked.structuredContent.tool, undefined);
  assert.equal((await client.callTool({ name: "calculate", arguments: {} })).isError, true);
  assert.equal((await client.callTool({ name: "execute_openquantum_tool", arguments: { skillId: "example", toolName: "calculate", arguments: {} } })).isError, true);
  assert.equal(f.calls(), 1);
  const management = (await client.listTools()).tools.find(tool => tool.name === SETTINGS_TOOL);
  assert.deepEqual(management._meta.ui.visibility, ["app"]);
  assert.equal((await client.callTool({ name: SETTINGS_TOOL, arguments: { action: "snapshot" } })).content.length, 0);
});

test("two settings writers reject stale revisions and preserve unrelated Codex values", async t => {
  const f = await fixture(t);
  await fs.mkdir(path.dirname(f.settings.codexFile), { recursive: true });
  await fs.writeFile(f.settings.codexFile, 'model = "keep-me"\n[skills]\nconfig = [{ path = "/other/skill", enabled = false }, { name = "unrelated:example", enabled = false }]\n');
  const original = await f.settings.snapshot();
  const second = new Settings(f.options);
  const results = await Promise.allSettled([f.settings.command({ action: "skill.set", id: "example", enabled: false, revision: original.revision }), second.command({ action: "tool.set", id: "calculate", enabled: false, revision: original.revision })]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.match(results.find(result => result.status === "rejected").reason.message, /更新/);
  const current = await f.settings.snapshot();
  await f.settings.command({ action: "skill.set", id: "example", enabled: false, revision: current.revision });
  const codex = parse(await fs.readFile(f.settings.codexFile, "utf8"));
  assert.equal(codex.model, "keep-me"); assert.deepEqual({ ...codex.skills.config[0] }, { path: "/other/skill", enabled: false });
  assert.equal((await second.snapshot()).skills[0].enabled, false);
  const upgraded = new Settings({ ...f.options, skillRoot: path.join(f.root, "new-version/skills") });
  assert.equal((await upgraded.snapshot()).skills[0].enabled, false);
  assert.ok(codex.skills.config.some(value => value.name === "openquantum:example" && value.enabled === false));
  assert.ok(codex.skills.config.some(value => value.name === "unrelated:example" && value.enabled === false));
  codex.skills.config.push({ path: path.join(f.options.skillRoot, "example/SKILL.md"), enabled: true });
  await fs.writeFile(f.settings.codexFile, stringify(codex));
  assert.equal((await f.settings.snapshot()).skills[0].enabled, true, "a later native-host override takes precedence");
  await assert.rejects(() => f.settings.command({ action: "skill.set", id: "../../other", enabled: true, revision: current.revision }), /更新|未知/);
});

test("MCP transport configuration never accepts URL credentials or literal secret fields", () => {
  const base = { id: "remote", transport: "http", authentication: "token" };
  for (const url of ["https://user:password@example.com/mcp", "https://example.com/mcp?token=value", "http://example.com/mcp", "file:///tmp/mcp"]) assert.throws(() => validateConnection({ ...base, url }));
  assert.throws(() => validateConnection({ ...base, url: "https://example.com", token: "never" }));
  assert.throws(() => validateConnection({ id: "local", transport: "stdio", authentication: "token", command: "node", args: [], tokenEnv: "BAD-NAME" }));
});

test("credential window requires a one-use capability and same-origin POST; secrets stay out of settings", async t => {
  const f = await fixture(t);
  await f.settings.command({ action: "connection.add", connection: { id: "remote", transport: "http", url: "https://example.com/mcp", authentication: "token" }, revision: (await f.settings.snapshot()).revision });
  const window = await createCredentialWindow(f); t.after(() => window.close());
  const url = new URL(await window.open("remote")); const nonce = url.hash.slice(1);
  const value = "fake-credential-fixture";
  const post = (origin, args) => fetch(`${url.origin}/credential`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(args) });
  assert.equal((await post("https://evil.invalid", { nonce, action: "set", value })).status, 403);
  assert.equal((await post(url.origin, { nonce: "wrong", action: "set", value })).status, 403);
  const info = () => fetch(`${url.origin}/credential-info`, { method: "POST", headers: { "content-type": "application/json", origin: url.origin }, body: JSON.stringify({ nonce }) });
  assert.equal((await info()).status, 200);
  assert.equal((await info()).status, 200);
  const saved = await post(url.origin, { nonce, action: "set", value }); assert.equal(saved.status, 200); assert.ok(!(await saved.text()).includes(value));
  assert.equal((await post(url.origin, { nonce, action: "set", value })).status, 403);
  assert.equal((await info()).status, 403);
  assert.equal(await f.credentials.resolve(credentialRef("remote")), value);
  assert.ok(!JSON.stringify(await f.settings.snapshot()).includes(value));
  assert.ok(!(await fs.readFile(f.settings.file, "utf8")).includes(value));
  const removeUrl = new URL(await window.open("remote"));
  assert.equal((await post(url.origin, { nonce: removeUrl.hash.slice(1), action: "remove" })).status, 200);
  assert.equal(await f.credentials.resolve(credentialRef("remote")), null);
});

test("malformed host configuration and symlinked settings fail without returning file contents", async t => {
  const f = await fixture(t); await fs.mkdir(path.dirname(f.settings.codexFile), { recursive: true });
  await fs.writeFile(f.settings.codexFile, 'private_value = "sentinel-secret');
  await assert.rejects(() => f.settings.snapshot(), error => !error.message.includes("sentinel-secret") && /无法解析/.test(error.message));
  await fs.writeFile(f.settings.codexFile, ""); await fs.mkdir(path.dirname(f.settings.file), { recursive: true });
  await fs.symlink(f.settings.codexFile, f.settings.file);
  await assert.rejects(() => f.settings.snapshot(), /普通文件/);
});

test("closing the credential window prevents new authorization requests", async t => {
  const f = await fixture(t);
  f.backend.providers = [{ key: "fieldqkit" }];
  await f.settings.command({ action: "connection.add", connection: { id: "remote", transport: "http", url: "https://example.com/mcp", authentication: "token" }, revision: (await f.settings.read()).revision });
  const window = await createCredentialWindow(f);
  await window.close();
  await assert.rejects(window.open("remote"));
  await assert.rejects(window.openService("fieldqkit"));
  assert.throws(() => window.issueField({ id: "fieldqkit", field: "QUAFU_API_TOKEN", operation: "set", origin: "https://plugin.example.test" }));
  assert.equal(f.secrets.size, 0);
});

test("a credential window cannot save after its permission expires during validation", async t => {
  const f = await fixture(t);
  await f.settings.command({ action: "connection.add", connection: { id: "remote", transport: "http", url: "https://example.com/mcp", authentication: "token" }, revision: (await f.settings.read()).revision });
  const window = await createCredentialWindow(f); t.after(() => window.close());
  const url = new URL(await window.open("remote"));
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  const read = f.settings.read.bind(f.settings);
  f.settings.read = async () => { const state = await read(); entered.resolve(); await release.promise; return state; };
  t.after(() => release.resolve());
  const saving = fetch(`${url.origin}/credential`, { method: "POST", headers: { "content-type": "application/json", origin: url.origin },
    body: JSON.stringify({ nonce: url.hash.slice(1), action: "set", value: "expired-fixture-only" }) });
  await entered.promise;
  t.mock.timers.tick(10 * 60 * 1000 + 1);
  release.resolve();
  assert.equal((await saving).status, 403);
  assert.equal(f.secrets.size, 0);
});

test("external Tool identities do not collide across connection and Tool delimiters", () => {
  assert.notEqual(externalToolName("team_dev", "run"), externalToolName("team", "dev_run"));
  assert.ok(externalToolName("a".repeat(32), "b".repeat(64)).length <= 64);
});

test("old credential windows cannot write to a replacement connection", async t => {
  const f = await fixture(t);
  const command = async input => f.settings.command({ ...input, revision: (await f.settings.snapshot()).revision });
  const connection = { id: "remote", transport: "http", url: "https://example.com/a", authentication: "token" };
  await command({ action: "connection.add", connection });
  const window = await createCredentialWindow(f); t.after(() => window.close());
  const url = new URL(await window.open("remote"));
  await command({ action: "connection.remove", id: "remote" });
  await command({ action: "connection.add", connection: { ...connection, url: "https://example.com/b" } });
  const response = await fetch(`${url.origin}/credential`, { method: "POST", headers: { "content-type": "application/json", origin: url.origin }, body: JSON.stringify({ nonce: url.hash.slice(1), action: "set", value: "fixture-only" }) });
  assert.equal(response.status, 409);
  assert.equal(f.secrets.size, 0);
});

test("settings recover a lock whose owning process no longer exists", async t => {
  const f = await fixture(t);
  await fs.mkdir(path.dirname(f.settings.file), { recursive: true });
  // This PID exceeds the platform PID range and cannot refer to another process.
  await fs.writeFile(`${f.settings.file}.openquantum.lock`, JSON.stringify({ pid: 2147483647, nonce: "abandoned" }));
  let ran = false;
  await withLock(f.settings.file, () => { ran = true; });
  assert.equal(ran, true);
  await assert.rejects(fs.stat(`${f.settings.file}.openquantum.lock`), { code: "ENOENT" });
});

test("editing a connection invalidates discovery and old credential windows without forwarding its Token", async t => {
  const f = await fixture(t);
  const command = async input => f.settings.command({ ...input, revision: (await f.settings.snapshot()).revision });
  const connection = { id: "editable", transport: "http", authentication: "token", url: "https://first.example/mcp" };
  await command({ action: "connection.add", connection });
  await f.credentials.set(credentialRef(connection.id), "fixture-only-edit-token");
  await command({ action: "connection.set", id: connection.id, enabled: true });
  const original = (await f.settings.read()).config.connections[0];
  const before = JSON.stringify({ ...original, tools: [] });
  await f.settings.inventory(connection.id, [{ name: "query", inputSchema: { type: "object" } }], before);
  await command({ action: "connection.tool.set", id: connection.id, tool: "query", enabled: true });
  const unchanged = (await f.settings.read()).config.connections[0];
  await command({ action: "connection.update", id: connection.id, connection });
  assert.deepEqual((await f.settings.read()).config.connections[0], unchanged);
  const window = await createCredentialWindow(f); t.after(() => window.close());
  const oldUrl = new URL(await window.open(connection.id));
  const next = { ...connection, url: "https://second.example/mcp" };
  await assert.rejects(() => command({ action: "connection.update", id: connection.id, connection: next }), /确认/);
  assert.deepEqual((await f.settings.read()).config.connections[0], unchanged);
  await assert.rejects(() => command({ action: "connection.update", id: connection.id, connection: { ...next, id: "renamed" } }), /名称/);
  const remove = f.credentials.remove;
  f.credentials.remove = async () => { throw new Error("fixture credential unavailable"); };
  await assert.rejects(() => command({ action: "connection.update", id: connection.id, connection: next, resetCredential: true }), /unavailable/);
  assert.deepEqual((await f.settings.read()).config.connections[0], unchanged);
  f.credentials.remove = remove;
  await command({ action: "connection.update", id: connection.id, connection: next, resetCredential: true });
  const edited = (await new Settings(f.options).read()).config.connections[0];
  assert.equal(edited.url, next.url);
  assert.equal(edited.enabled, false);
  assert.deepEqual(edited.tools, []);
  assert.notEqual(edited.instance, unchanged.instance);
  assert.equal(await f.credentials.resolve(credentialRef(connection.id)), null);
  await assert.rejects(() => f.settings.inventory(connection.id, [], before), /配置已变化/);
  const response = await fetch(`${oldUrl.origin}/credential`, { method: "POST", headers: { "content-type": "application/json", origin: oldUrl.origin }, body: JSON.stringify({ nonce: oldUrl.hash.slice(1), action: "set", value: "fixture-only-stale-token" }) });
  assert.equal(response.status, 409);
  assert.equal(f.secrets.size, 0);
});

test("rediscovery preserves unchanged Tool choices and disables changed contracts", async t => {
  const f = await fixture(t);
  const command = async input => f.settings.command({ ...input, revision: (await f.settings.read()).revision });
  await command({ action: "connection.add", connection: { id: "evolving", transport: "http", authentication: "none", url: "https://fixture.example/mcp" } });
  const tool = { name: "query", description: "A bounded query", inputSchema: { type: "object", properties: { n: { type: "number" } } }, annotations: { readOnlyHint: true, destructiveHint: false } };
  const discover = async tools => {
    const current = (await f.settings.read()).config.connections[0];
    await f.settings.inventory("evolving", tools, JSON.stringify({ ...current, tools: [] }));
    return (await f.settings.read()).config.connections[0].tools;
  };
  await discover([tool]);
  await command({ action: "connection.tool.set", id: "evolving", tool: "query", enabled: true });
  assert.equal((await discover([structuredClone(tool)]))[0].enabled, true);
  for (const changed of [
    { ...tool, inputSchema: { type: "object", properties: { n: { type: "string" } } } },
    { ...tool, outputSchema: { type: "object" } },
    { ...tool, annotations: { readOnlyHint: false, destructiveHint: true } },
    { ...tool, description: "A changed action" },
  ]) {
    assert.equal((await discover([changed]))[0].enabled, false);
    await discover([tool]);
    await command({ action: "connection.tool.set", id: "evolving", tool: "query", enabled: true });
  }
});
