import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { parse } from "yaml";
import { fixture } from "./fixtures/codex-settings.mjs";
import { SERVICES, serviceById, serviceCredentialRef, missingFields, validateServiceValues } from "../src/settings/codex/service-catalog.mjs";
import { Settings } from "../src/settings/codex/application.mjs";
import { createCredentialWindow } from "../src/settings/codex/credential-window.mjs";
import { createBackend } from "../runtime/chatgpt/backend.mjs";
import { readCapabilities } from "../runtime/chatgpt/catalog.mjs";
import { redactCredentialValues, redactToolResult } from "../src/settings/codex/redaction.mjs";
import { mcpCatalogEntry } from "../src/settings/server/project-settings-catalog.mjs";

function managedFixture(f, id = "qcarchive_data") {
  f.backend.providers[0] = { key: id, defaultEnabled: false };
  f.backend.providerFor = name => name === "calculate" ? id : undefined;
  return f;
}
async function windowPost(window, id, args, route = "/credential") {
  const url = new URL(await window.openService(id));
  const response = await fetch(url.origin + route, { method: "POST", headers: { "content-type": "application/json", origin: url.origin },
    body: JSON.stringify({ nonce: url.hash.slice(1), ...args }) });
  return { response, url };
}

test("Codex reuses Desktop service presentation and covers every declared Desktop credential reference", async () => {
  const rows = parse(await fs.readFile(new URL("../runtime/openquantum/agent-presets/openquantum/agent.cordis.yml", import.meta.url), "utf8"),
    { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
  const references = new Set(SERVICES.flatMap(service => service.fields.map(field => field.name)));
  for (const row of rows.filter(row => row.name === "./credentialed-mcp-client.mjs")) {
    const config = row.config;
    const service = serviceById(config.serverName);
    assert.ok(service, config.serverName);
    assert.equal(service.title, mcpCatalogEntry(config.serverName).displayName);
    for (const ref of Object.values({ ...config.credentialEnv, ...config.optionalCredentialEnv })) assert.ok(references.has(ref), ref);
    if (service.supported) assert.deepEqual(service.fields.map(field => field.name).sort(),
      Object.keys({ ...config.credentialEnv, ...config.optionalCredentialEnv }).sort(), config.serverName);
  }
});

test("credentialed capabilities are included, but old settings keep every new provider and Tool off", async t => {
  const f = managedFixture(await fixture(t));
  await fs.mkdir(path.dirname(f.settings.file), { recursive: true });
  await fs.writeFile(f.settings.file, JSON.stringify({ schemaVersion: 1, connections: [], disabledProviders: [], disabledTools: [] }));
  const before = await f.settings.snapshot();
  assert.equal(before.providers[0].enabled, false);
  assert.equal(before.tools[0].enabled, false);
  assert.deepEqual(await f.settings.listTools(), []);
  const command = async input => f.settings.command({ ...input, revision: (await f.settings.snapshot()).revision });
  await command({ action: "provider.set", id: "qcarchive_data", enabled: true });
  assert.equal(await f.settings.enabled("calculate"), false);
  await command({ action: "tool.set", id: "calculate", enabled: true });
  assert.equal(await new Settings(f.options).enabled("calculate"), true);
  await command({ action: "provider.set", id: "qcarchive_data", enabled: false });
  assert.equal(await f.settings.enabled("calculate"), false);
  const capabilities = await readCapabilities();
  for (const service of SERVICES.filter(service => service.supported)) {
    const capability = capabilities.find(capability => capability.id === service.capability);
    assert.equal(capability.status, "available", service.id);
    assert.equal(capability.optIn, true);
  }
  assert.equal(capabilities.find(capability => capability.id === "qiskit-ibm-runtime").status, "unsupported");
});

test("service window saves, preserves, replaces and removes multi-field credentials without exposing values", async t => {
  const f = managedFixture(await fixture(t)), id = "qcarchive_data";
  const window = await createCredentialWindow(f); t.after(() => window.close());
  const values = { QCPORTAL_ADDRESS: "https://archive.example.test", QCPORTAL_USERNAME: "fixture-user", QCPORTAL_PASSWORD: "fixture-password-unique" };
  const { response, url } = await windowPost(window, id, { action: "set", values });
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /fixture-password/);
  const replay = await fetch(url.origin + "/credential", { method: "POST", headers: { "content-type": "application/json", origin: url.origin },
    body: JSON.stringify({ nonce: url.hash.slice(1), action: "set", values }) });
  assert.equal(replay.status, 403);
  assert.deepEqual(await f.settings.providerEnvironment("calculate"), values);
  const snapshot = await f.settings.snapshot();
  assert.equal(snapshot.services.find(service => service.id === id).configuration, "configured");
  assert.equal(snapshot.services.find(service => service.id === id).checked, false);
  assert.doesNotMatch(JSON.stringify(snapshot), /fixture-password|fixture-user|archive.example.test/);
  const info = await windowPost(window, id, {}, "/credential-info");
  assert.doesNotMatch(await info.response.text(), /fixture-password|fixture-user|archive.example.test/);
  const update = await windowPost(window, id, { action: "set", values: { QCPORTAL_PASSWORD: "replacement-fixture" } });
  assert.equal(update.response.status, 200);
  assert.deepEqual(await f.settings.providerEnvironment("calculate"), { ...values, QCPORTAL_PASSWORD: "replacement-fixture" });
  const removed = await windowPost(window, id, { action: "set", values: {}, remove: ["QCPORTAL_USERNAME", "QCPORTAL_PASSWORD"] });
  assert.equal(removed.response.status, 200);
  assert.deepEqual(await f.settings.providerEnvironment("calculate"), { QCPORTAL_ADDRESS: values.QCPORTAL_ADDRESS });
  const cleared = await windowPost(window, id, { action: "remove" });
  assert.equal(cleared.response.status, 200);
  assert.deepEqual(await f.settings.providerEnvironment("calculate"), {});
  assert.equal(await f.credentials.resolve(serviceCredentialRef(id)), null);
  const file = await fs.readFile(f.settings.file, "utf8").catch(() => "");
  assert.doesNotMatch(file, /fixture-password|replacement-fixture|archive.example.test/);
});

test("service secrets reject foreign origins, unknown fields and removal while enabled", async t => {
  const f = managedFixture(await fixture(t), "superstaq_cloud");
  const window = await createCredentialWindow(f); t.after(() => window.close());
  const url = new URL(await window.openService("superstaq_cloud"));
  const forbidden = await fetch(url.origin + "/credential", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.test" },
    body: JSON.stringify({ nonce: url.hash.slice(1), action: "set", values: { SUPERSTAQ_API_KEY: "fixture-only" } }) });
  assert.equal(forbidden.status, 403);
  assert.equal((await windowPost(window, "superstaq_cloud", { action: "set", values: { NODE_OPTIONS: "--inspect" } })).response.status, 400);
  assert.equal(f.secrets.size, 0);
  assert.equal((await windowPost(window, "superstaq_cloud", { action: "set", values: { SUPERSTAQ_API_KEY: "fixture-only" } })).response.status, 200);
  await f.settings.command({ action: "provider.set", id: "superstaq_cloud", enabled: true, revision: (await f.settings.snapshot()).revision });
  assert.equal((await windowPost(window, "superstaq_cloud", { action: "remove" })).response.status, 409);
  assert.equal((await windowPost(window, "superstaq_cloud", { action: "set", values: {}, remove: ["SUPERSTAQ_API_KEY"] })).response.status, 409);
  await assert.rejects(window.openService("pasqal_cloud"), /尚未接入/);
});

test("QCArchive anonymous and paired authentication are distinct; endpoint validation fails closed", () => {
  const service = serviceById("qcarchive_data");
  assert.deepEqual(missingFields(service, { QCPORTAL_ADDRESS: "https://archive.example.test" }), []);
  assert.deepEqual(missingFields(service, { QCPORTAL_ADDRESS: "https://archive.example.test", QCPORTAL_USERNAME: "user" }), ["QCPORTAL_PASSWORD"]);
  for (const value of ["http://example.test", "https://user:secret@example.test", "https://example.test?token=x"]) assert.throws(() => validateServiceValues(service, { QCPORTAL_ADDRESS: value }));
  assert.throws(() => validateServiceValues(serviceById("oqc_cloud"), { OQC_API_ENDPOINT: "https://evil.test" }));
  assert.throws(() => validateServiceValues(serviceById("oqc_cloud"), { OQC_API_ENDPOINT: "https://cloud.oqc.app:8443" }));
  assert.doesNotThrow(() => validateServiceValues(serviceById("oqc_cloud"), { OQC_API_ENDPOINT: "https://cloud.oqc.app" }));
});

test("credential redaction covers nested JSON and escaped passwords without altering source keys", () => {
  const password = 'fixture-"quoted"-password\\with-backslash', username = "source";
  const body = { source: { library: "qcarchive" }, result: { serverReply: password, user: username } };
  const result = { content: [{ type: "text", text: JSON.stringify(body) }, { type: "text", text: JSON.stringify(JSON.stringify(body)) }],
    structuredContent: body, plain: "Error " + password };
  const clean = redactCredentialValues(result, [username, password]);
  assert.equal(clean.structuredContent.result.serverReply, "[redacted]");
  assert.equal(JSON.parse(clean.content[0].text).result.serverReply, "[redacted]");
  assert.equal(JSON.parse(JSON.parse(clean.content[1].text)).result.serverReply, "[redacted]");
  assert.deepEqual(clean.structuredContent.source, { library: "qcarchive" });
  assert.deepEqual(JSON.parse(clean.content[0].text).source, { library: "qcarchive" });
  assert.equal(clean.structuredContent.result.user, "[redacted]");
  assert.equal(clean.plain, "Error [redacted]");
});

test("credential redaction preserves MCP content discriminators even for matching secret values", () => {
  const result = { content: [{ type: "text", text: JSON.stringify({ user: "text", password: "fixture-password" }) }],
    structuredContent: { source: "qcarchive", password: "fixture-password" } };
  for (const values of [["text", "fixture-password"], ["fixture-password"]]) {
    const clean = redactToolResult(result, values);
    assert.equal(CallToolResultSchema.safeParse(clean).success, true);
    assert.equal(clean.content[0].type, "text");
    assert.equal(clean.structuredContent.password, "[redacted]");
    assert.equal(JSON.parse(clean.content[0].text).password, "[redacted]");
  }
});

test("credential-store failure isolates the affected service and keeps the settings page usable", async t => {
  const f = managedFixture(await fixture(t));
  f.credentials.resolve = async () => { throw new Error("sensitive-native-error"); };
  const snapshot = await f.settings.snapshot();
  assert.equal(snapshot.services.find(service => service.id === "qcarchive_data").configuration, "unavailable");
  assert.equal(snapshot.skills.length, 1);
  assert.doesNotMatch(JSON.stringify(snapshot), /sensitive-native-error/);
});

test("local service operations do not read or receive credentials even when the store is unavailable", async t => {
  const f = await fixture(t);
  f.credentials.resolve = async () => { throw new Error("credential store unavailable"); };
  for (const service of SERVICES.filter(service => service.credentialFreeTools?.length)) {
    for (const name of service.credentialFreeTools) {
      f.backend.providerFor = () => service.id;
      assert.deepEqual(await f.settings.providerEnvironment(name), {}, name);
    }
  }
  f.backend.providerFor = () => "fieldqkit";
  assert.deepEqual(await f.settings.providerEnvironment("discover_fieldqkit_backends", { provider: "simulator" }), {});
  f.backend.providerFor = () => "qcarchive_data";
  await assert.rejects(f.settings.providerEnvironment("query_qcarchive_singlepoints"), /unavailable/);
});

test("real provider handshakes require no credentials and FieldQKit receives only its saved service environment", { timeout: 120000 }, async t => {
  const backend = await createBackend(); t.after(() => backend.close());
  const f = await fixture(t); f.settings.backend = backend;
  assert.equal((await f.settings.listTools()).length, backend.tools.length - backend.providers.filter(provider => provider.defaultEnabled === false).reduce((sum, provider) => sum + provider.tools.length, 0));
  const before = await backend.call("inspect_fieldqkit_setup", {});
  assert.equal(before.structuredContent.providers.find(provider => provider.id === "quafu").configured, false);
  const result = await backend.call("inspect_fieldqkit_setup", {}, undefined, async () => true,
    { QUAFU_API_TOKEN: "quafu-fixture-not-real", IONQ_API_KEY: "unrelated-fixture" });
  assert.equal(result.structuredContent.providers.find(provider => provider.id === "quafu").configured, true);
  assert.equal(result.structuredContent.providers.find(provider => provider.id === "tencent").configured, false);
  assert.doesNotMatch(JSON.stringify(result), /quafu-fixture-not-real|unrelated-fixture/);
});

test("cancelling FieldQKit discovery terminates its worker", { skip: process.platform === "win32", timeout: 15000 }, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-fieldqkit-cancel-"));
  const environment = path.join(directory, "fieldqkit-hardware");
  const started = path.join(directory, "started"), stopped = path.join(directory, "stopped");
  const root = path.resolve(import.meta.dirname, "..");
  await fs.mkdir(path.join(environment, "bin"), { recursive: true });
  const lock = await fs.readFile(path.join(root, ".agents/skills/fieldqkit-hardware/uv.lock"));
  await fs.writeFile(path.join(environment, "openquantum-lock.sha256"), createHash("sha256").update(lock).digest("hex"));
  const script = `#!${process.execPath}\nconst fs=require("node:fs");fs.writeFileSync(${JSON.stringify(started)},String(process.pid));process.on("SIGTERM",()=>{fs.writeFileSync(${JSON.stringify(stopped)},"stopped");process.exit(0)});setInterval(()=>{},1000);\n`;
  await fs.writeFile(path.join(environment, "bin/python"), script, { mode: 0o700 });
  const client = new Client({ name: "cancellation-test", version: "1" });
  t.after(async () => {
    await client.close();
    const pid = Number(await fs.readFile(started, "utf8").catch(() => "0"));
    if (pid) try { process.kill(pid, "SIGTERM"); } catch { /* Already terminated. */ }
    await fs.rm(directory, { recursive: true, force: true });
  });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills/fieldqkit-hardware/mcp/server.mjs")],
    env: { PATH: process.env.PATH, OPENQUANTUM_PYTHON_ENV_ROOT: directory }, stderr: "pipe" }));
  const controller = new AbortController();
  const request = client.callTool({ name: "discover_fieldqkit_backends", arguments: { provider: "simulator", numQubits: 2 } }, undefined, { signal: controller.signal }).catch(error => error);
  for (let attempt = 0; attempt < 100 && !await fs.access(started).then(() => true, () => false); attempt++) await delay(30);
  assert.ok(await fs.readFile(started, "utf8"));
  controller.abort();
  assert.ok(await request instanceof Error);
  for (let attempt = 0; attempt < 100 && !await fs.access(stopped).then(() => true, () => false); attempt++) await delay(30);
  assert.equal(await fs.readFile(stopped, "utf8"), "stopped");
});
