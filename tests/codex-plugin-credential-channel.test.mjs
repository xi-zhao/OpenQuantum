import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { CompactEncrypt, importJWK } from "jose";
import { fixture } from "./fixtures/codex-settings.mjs";
import { createCredentialChannel } from "../src/settings/codex/credential-channel.mjs";
import { createCredentialWindow } from "../src/settings/codex/credential-window.mjs";
import { sealCredentialField } from "../src/settings/credential-seal.mjs";
import { Credentials } from "../src/settings/codex/credentials.mjs";
import { serviceById, serviceValues, serviceCredentialRef } from "../src/settings/codex/service-catalog.mjs";
import { createMcpServer, SETTINGS_TOOL } from "../runtime/chatgpt/server.mjs";

const target = { id: "fieldqkit", field: "QUAFU_API_TOKEN", operation: "set" };
const value = "synthetic-secret-only";
async function setup(t) {
  const f = await fixture(t);
  f.backend.providers = [{ key: target.id, defaultEnabled: false }];
  f.backend.providerFor = () => target.id;
  const channel = createCredentialChannel(f); t.after(() => channel.close());
  return { ...f, channel };
}
async function envelope(channel, input = { value }, scope = target) {
  const permission = await channel.prepare(scope);
  return { nonce: permission.nonce, ciphertext: await sealCredentialField(permission, input) };
}

test("app-only MCP prepare and commit never carry plaintext; only the store receives it", async t => {
  const f = await setup(t), window = await createCredentialWindow(f);
  const server = createMcpServer({ ...f, credentialWindow: window, html: "<html>settings</html>", release: { version: "1" } });
  const client = new Client({ name: "encrypted-credential-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  t.after(async () => { await client.close(); await server.close(); await window.close(); });
  const transcript = [];
  const call = async args => {
    const request = { name: SETTINGS_TOOL, arguments: args };
    transcript.push(request);
    const response = await client.callTool(request); transcript.push(response);
    assert.ok(!response.isError);
    return response._meta.openquantumSettings;
  };
  assert.deepEqual((await client.listTools()).tools.find(tool => tool.name === SETTINGS_TOOL)._meta.ui.visibility, ["app"]);
  const permission = await call({ action: "credential.field.prepare", ...target });
  assert.equal(permission.publicKey.d, undefined);
  const ciphertext = await sealCredentialField(permission, { value });
  assert.equal((await call({ action: "credential.field.commit", nonce: permission.nonce, ciphertext })).status, 200);
  const snapshot = await call({ action: "snapshot" });
  assert.ok(snapshot.services.find(service => service.id === target.id).fields.find(field => field.name === target.field).configured);
  assert.doesNotMatch(JSON.stringify(transcript), /synthetic-secret-only/);
  assert.equal((await serviceValues(f.credentials, serviceById(target.id)))[target.field], value);
  const raw = await client.callTool({ name: SETTINGS_TOOL, arguments: { action: "credential.field.commit", value } });
  assert.equal(raw.isError, true);
  assert.doesNotMatch(JSON.stringify(raw), /synthetic-secret-only/);
});

test("tampering, nonce swaps, algorithms and cross-process submissions cannot write", async t => {
  const f = await setup(t), other = await setup(t);
  const first = await envelope(f.channel);
  assert.equal((await other.channel.commit(first)).status, 403);
  const second = await envelope(f.channel, { value }, { ...target, field: "TIANYAN_API_TOKEN" });
  assert.equal((await f.channel.commit({ ...first, nonce: second.nonce })).status, 403);
  assert.equal((await f.channel.commit(second)).status, 403);
  const damaged = await envelope(f.channel);
  const parts = damaged.ciphertext.split("."); parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
  assert.equal((await f.channel.commit({ ...damaged, ciphertext: parts.join(".") })).status, 403);
  const wrongAlgorithm = await f.channel.prepare(target);
  const ciphertext = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify({ value })))
    .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A128GCM", kid: wrongAlgorithm.nonce })
    .encrypt(await importJWK(wrongAlgorithm.publicKey, "RSA-OAEP-256"));
  assert.equal((await f.channel.commit({ nonce: wrongAlgorithm.nonce, ciphertext })).status, 403);
  for (const extra of [{ zip: "DEF" }, { jku: "https://keys.example.test" }]) {
    const permission = await f.channel.prepare(target);
    const ciphertext = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify({ value })))
      .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM", kid: permission.nonce, ...extra })
      .encrypt(await importJWK(permission.publicKey, "RSA-OAEP-256"));
    assert.equal((await f.channel.commit({ nonce: permission.nonce, ciphertext })).status, 403);
  }
  const window = await createCredentialWindow(f); t.after(() => window.close());
  const nonce = new URL(await window.openService(target.id)).hash.slice(1);
  assert.equal((await f.channel.commit({ ...first, nonce })).status, 403);
  assert.equal(f.secrets.size, 0);
  const attempts = await Promise.all([f.channel.commit(first), f.channel.commit(first)]);
  assert.deepEqual(attempts.map(result => result.status).sort(), [200, 403]);
});

test("encrypted writes merge fields and remove only the scoped field under current authorization", async t => {
  const f = await setup(t);
  const requests = await Promise.all([envelope(f.channel), envelope(f.channel, { value: "neighbor" }, { ...target, field: "TIANYAN_API_TOKEN" })]);
  assert.deepEqual((await Promise.all(requests.map(request => f.channel.commit(request)))).map(result => result.status), [200, 200]);
  const remove = await envelope(f.channel, {}, { ...target, operation: "remove" });
  assert.equal((await f.channel.commit(remove)).status, 200);
  assert.deepEqual(await serviceValues(f.credentials, serviceById(target.id)), { TIANYAN_API_TOKEN: "neighbor" });
  const blocked = await envelope(f.channel, {}, { ...target, field: "TIANYAN_API_TOKEN", operation: "remove" });
  await f.settings.command({ action: "provider.set", id: target.id, enabled: true, revision: (await f.settings.snapshot()).revision });
  assert.equal((await f.channel.commit(blocked)).status, 200);
  assert.equal(await f.credentials.resolve(serviceCredentialRef(target.id)), null);
});

test("Unicode bounds, malformed payloads and secret-bearing store errors are handled safely", async t => {
  const f = await setup(t);
  const unicode = await envelope(f.channel, { value: "量".repeat(4096) });
  assert.ok(unicode.ciphertext.length > 16384);
  assert.equal((await f.channel.commit(unicode)).status, 200);
  for (const input of [null, { value, field: "TIANYAN_API_TOKEN" }, { value: "x".repeat(4097) }]) {
    assert.equal((await f.channel.commit(await envelope(f.channel, input))).status, 400);
  }
  const oversized = await envelope(f.channel);
  assert.equal((await f.channel.commit({ ...oversized, ciphertext: "x".repeat(32769) })).status, 403);
  assert.equal((await f.channel.commit(oversized)).status, 403);
  for (const method of ["resolve", "set"]) {
    const original = f.credentials[method];
    f.credentials[method] = async () => { throw new Error(value); };
    const request = await envelope(f.channel);
    const result = await f.channel.commit(request);
    assert.equal(result.status, 500);
    assert.doesNotMatch(JSON.stringify(result), /synthetic-secret-only/);
    assert.equal((await f.channel.commit(request)).status, 403);
    f.credentials[method] = original;
  }
});

test("capabilities expire, remain bounded, and are invalidated when the process closes", async t => {
  const f = await setup(t);
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const expired = await envelope(f.channel);
  t.mock.timers.tick(10 * 60 * 1000 + 1);
  assert.equal((await f.channel.commit(expired)).status, 403);
  for (let i = 0; i < 32; i++) await f.channel.prepare(target);
  await assert.rejects(f.channel.prepare(target), /过多/);
  t.mock.timers.tick(10 * 60 * 1000 + 1);
  const pending = await envelope(f.channel);
  f.channel.close();
  assert.equal((await f.channel.commit(pending)).status, 403);
  await assert.rejects(f.channel.prepare(target), /无效/);
  assert.equal(f.secrets.size, 0);
});

test("encrypted credentials survive a native Keyring adapter restart", { skip: process.env.OPENQUANTUM_TEST_KEYCHAIN !== "1" }, async t => {
  const f = await setup(t), service = `org.openquantum.test.${randomUUID()}`, ref = serviceCredentialRef(target.id);
  const credentials = new Credentials({ service }); t.after(() => credentials.remove(ref));
  const first = createCredentialChannel({ settings: f.settings, credentials }); t.after(() => first.close());
  assert.equal((await first.commit(await envelope(first))).status, 200);
  const reopened = new Credentials({ service });
  assert.equal((await serviceValues(reopened, serviceById(target.id)))[target.field], value);
  const restarted = createCredentialChannel({ settings: f.settings, credentials: reopened }); t.after(() => restarted.close());
  assert.equal((await restarted.commit(await envelope(restarted, {}, { ...target, operation: "remove" }))).status, 200);
  assert.equal(await credentials.resolve(ref), null);
});
