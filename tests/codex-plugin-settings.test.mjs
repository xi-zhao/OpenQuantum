import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse, stringify } from "smol-toml";
import { Settings, credentialRef, externalToolName, validateConnection } from "../src/settings/codex/application.mjs";
import { withLock } from "../src/settings/codex/storage.mjs";
import { Connections } from "../src/settings/codex/connections.mjs";
import { createCredentialWindow } from "../src/settings/codex/credential-window.mjs";
import { createMcpServer, SETTINGS_TOOL } from "../runtime/chatgpt/server.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

export async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oq-plugin-settings-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const secrets = new Map();
  const credentials = { resolve: async id => secrets.get(id) ?? null, describe: async id => ({ configured: secrets.has(id) }), set: async (id, value) => secrets.set(id, value), remove: async id => secrets.delete(id) };
  let calls = 0;
  const backend = { sourceCapabilities: [{ id: "example", title: "Example", status: "available", skill: "text", tools: ["calculate"] }],
    tools: [{ name: "calculate", inputSchema: { type: "object", properties: {}, additionalProperties: false } }],
    providers: [{ key: "local" }], providerFor: name => name === "calculate" ? "local" : undefined,
    call: async () => { calls++; return { content: [{ type: "text", text: "42" }] }; } };
  const options = { backend, credentials, directory: path.join(root, "settings"), codexHome: path.join(root, "codex"), skillRoot: path.join(root, "skills") };
  const settings = new Settings(options);
  return { root, settings, options, backend, credentials, secrets, calls: () => calls };
}

test("settings change the real MCP inventory and reject a stale cached Tool call", async t => {
  const f = await fixture(t);
  const connections = new Connections(f);
  const server = createMcpServer({ ...f, connections, credentialWindow: {}, html: "<html></html>", release: { version: "0.7.4" } });
  const client = new Client({ name: "test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  t.after(async () => { await client.close(); await server.close(); });
  assert.ok((await client.listTools()).tools.some(tool => tool.name === "calculate"));
  await client.callTool({ name: "calculate", arguments: {} }); assert.equal(f.calls(), 1);
  const snapshot = await f.settings.snapshot();
  await f.settings.command({ action: "tool.set", id: "calculate", enabled: false, revision: snapshot.revision });
  assert.ok(!(await client.listTools()).tools.some(tool => tool.name === "calculate"));
  assert.equal((await client.callTool({ name: "calculate", arguments: {} })).isError, true);
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
  const saved = await post(url.origin, { nonce, action: "set", value }); assert.equal(saved.status, 200); assert.ok(!(await saved.text()).includes(value));
  assert.equal((await post(url.origin, { nonce, action: "set", value })).status, 403);
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
