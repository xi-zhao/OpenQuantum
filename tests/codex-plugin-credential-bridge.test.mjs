import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { request as httpRequest } from "node:http";
import { randomUUID } from "node:crypto";
import { fixture } from "./fixtures/codex-settings.mjs";
import { createCredentialWindow } from "../src/settings/codex/credential-window.mjs";
import { createCredentialBridge } from "../src/settings/codex/credential-bridge.mjs";
import { serviceCredentialRef, serviceValues, serviceById } from "../src/settings/codex/service-catalog.mjs";
import { settingsRequest } from "../runtime/chatgpt/server.mjs";
import { withLock } from "../src/settings/codex/storage.mjs";
import { Credentials } from "../src/settings/codex/credentials.mjs";

const id = "fieldqkit", field = "QUAFU_API_TOKEN", origin = "https://plugin.example.test";
async function setup(t, provider = id) {
  const f = await fixture(t);
  f.backend.providers[0] = { key: provider, defaultEnabled: false };
  f.backend.providerFor = name => name === "calculate" ? provider : undefined;
  const window = await createCredentialWindow(f); t.after(() => window.close());
  return { ...f, window };
}
const issue = (window, options = {}) => window.issueField({ id, field, operation: "set", origin, ...options });
const post = (permission, body = { value: "synthetic-test-only" }, overrides = {}) => fetch(permission.url, {
  method: "POST", headers: { "content-type": "application/json", origin, "x-openquantum-capability": permission.nonce, ...overrides }, body: JSON.stringify(body),
});

test("inline save uses a field-scoped one-use capability and never returns the secret", async t => {
  const f = await setup(t), permission = issue(f.window);
  const response = await post(permission);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.doesNotMatch(await response.text(), /synthetic-test-only/);
  assert.equal((await serviceValues(f.credentials, serviceById(id)))[field], "synthetic-test-only");
  assert.doesNotMatch(JSON.stringify(await f.settings.snapshot()), /synthetic-test-only/);
  assert.equal((await post(permission)).status, 403);
  await assert.rejects(settingsRequest({ credentialWindow: f.window }, { action: "credential.field.issue", id, field, operation: "set", origin, value: "must-not-cross-mcp" }), /字段无效/);
});

test("CORS preflight is explicit, scoped, and supports opaque MCP App origins", async t => {
  const { window } = await setup(t), permission = issue(window, { origin: "null" });
  const headers = { origin: "null", "access-control-request-method": "POST", "access-control-request-headers": "content-type, x-openquantum-capability", "access-control-request-private-network": "true" };
  const response = await fetch(permission.url, { method: "OPTIONS", headers });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "null");
  assert.equal(response.headers.get("access-control-allow-private-network"), "true");
  assert.equal(response.headers.get("access-control-allow-credentials"), null);
  for (const changes of [{ origin: "https://foreign.example.test" }, { "access-control-request-headers": "content-type" }, { "access-control-request-method": "GET" }]) {
    assert.equal((await fetch(permission.url, { method: "OPTIONS", headers: { ...headers, ...changes } })).status, 403);
  }
  assert.equal((await post(permission, undefined, { origin: "null" })).status, 200);
});

test("wrong origins, Host, capability kind and field payload cannot authorize a write", async t => {
  const f = await setup(t), permission = issue(f.window);
  for (const overrides of [{ origin: "https://foreign.example.test" }, { origin: "http://foreign.test" }, { origin: "" }, { "x-openquantum-capability": "wrong" }]) {
    assert.equal((await post(permission, undefined, overrides)).status, 403);
  }
  const invalidHost = await new Promise((resolve, reject) => {
    const request = httpRequest(permission.url, { method: "POST", headers: { host: "foreign.test", origin, "content-type": "application/json", "x-openquantum-capability": permission.nonce } }, response => { response.resume(); resolve(response.statusCode); });
    request.on("error", reject); request.end(JSON.stringify({ value: "synthetic-test-only" }));
  });
  assert.equal(invalidHost, 403);
  const old = new URL(await f.window.openService(id));
  assert.equal((await post({ url: permission.url, nonce: old.hash.slice(1) })).status, 403);
  const oldRoute = await fetch(old.origin + "/credential", { method: "POST", headers: { "content-type": "application/json", origin: old.origin },
    body: JSON.stringify({ nonce: permission.nonce, action: "set", values: { [field]: "synthetic-test-only" } }) });
  assert.equal(oldRoute.status, 403);
  assert.equal((await post(permission, { value: "synthetic-test-only", field: "TIANYAN_API_TOKEN" })).status, 400);
  assert.equal((await post(permission)).status, 403, "malformed request also consumes capability");
  assert.equal(f.secrets.size, 0);
  for (const options of [{ id: "pasqal_cloud" }, { field: "NODE_OPTIONS" }, { operation: "any" }, { origin: "https://x.test/path" }, { origin: "*" }]) assert.throws(() => issue(f.window, options));
});

test("concurrent saves merge fields and cannot replay the same capability", async t => {
  const f = await setup(t);
  const permissions = [issue(f.window), issue(f.window, { field: "TIANYAN_API_TOKEN" })];
  const responses = await Promise.all(permissions.map(permission => post(permission)));
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  assert.deepEqual(Object.keys(await serviceValues(f.credentials, serviceById(id))).sort(), [field, "TIANYAN_API_TOKEN"].sort());
  const duplicate = issue(f.window);
  const replay = await Promise.all([post(duplicate), post(duplicate)]);
  assert.deepEqual(replay.map(response => response.status).sort(), [200, 403]);
  assert.equal((await post(issue(f.window, { operation: "remove" }), {})).status, 200);
  assert.deepEqual(Object.keys(await serviceValues(f.credentials, serviceById(id))), ["TIANYAN_API_TOKEN"]);
});

test("remove is operation-bound and checks the current service state under lock", async t => {
  const f = await setup(t);
  await post(issue(f.window));
  const permission = issue(f.window, { operation: "remove" });
  assert.equal((await post(permission)).status, 400);
  await f.settings.command({ action: "provider.set", id, enabled: true, revision: (await f.settings.snapshot()).revision });
  assert.equal((await post(issue(f.window, { operation: "remove" }), {})).status, 200);
  assert.equal(await f.credentials.resolve(serviceCredentialRef(id)), null);
});

test("partial QCArchive saves show the missing pair and preserve the address and username", async t => {
  const provider = "qcarchive_data", f = await setup(t, provider);
  for (const [name, value] of [["QCPORTAL_ADDRESS", "https://archive.example.test"], ["QCPORTAL_USERNAME", "synthetic-user"]]) {
    assert.equal((await post(issue(f.window, { id: provider, field: name }), { value })).status, 200);
  }
  const service = (await f.settings.snapshot()).services.find(item => item.id === provider);
  assert.deepEqual(service.missing, ["QCPORTAL_PASSWORD"]);
  assert.deepEqual(await f.settings.providerEnvironment("calculate"), { QCPORTAL_ADDRESS: "https://archive.example.test", QCPORTAL_USERNAME: "synthetic-user" });
  await post(issue(f.window, { id: provider, field: "QCPORTAL_PASSWORD" }));
  assert.equal((await f.settings.snapshot()).services.find(item => item.id === provider).configuration, "configured");
});

test("failures redact store errors, do not replay writes, and reject oversized inputs", async t => {
  const f = await setup(t), permission = issue(f.window);
  f.credentials.set = async () => { throw new Error("fixture-private-store-error"); };
  const response = await post(permission);
  assert.equal(response.status, 400);
  const text = await response.text();
  assert.doesNotMatch(text, /fixture-private-store-error|synthetic-test-only/);
  assert.match(text, /尚未确认/);
  assert.equal((await post(permission)).status, 403);
  assert.equal((await post(issue(f.window), { value: "x".repeat(17000) })).status, 413);
});

test("expired requests cannot write after waiting for another settings writer", async t => {
  const f = await setup(t), sessions = new Map();
  const bridge = createCredentialBridge({ ...f, sessions, getOrigin: () => f.window.origin });
  const permission = bridge.issue({ id, field, origin, operation: "set" });
  const session = sessions.get(permission.nonce);
  let entered, release;
  const ready = new Promise(resolve => { entered = resolve; });
  const held = withLock(f.settings.file, async () => { entered(); await new Promise(resolve => { release = resolve; }); });
  await ready;
  const request = Readable.from([JSON.stringify({ value: "synthetic-test-only" })]);
  request.method = "POST"; request.headers = { origin, "content-type": "application/json", "x-openquantum-capability": permission.nonce };
  let response;
  const pending = bridge.handle(request, (status, body) => { response = { status, body }; });
  assert.equal(sessions.size, 0, "consumed synchronously before reading body");
  session.expires = Date.now() - 1;
  release(); await held; await pending;
  assert.equal(response.status, 403);
  assert.equal(f.secrets.size, 0);
  for (let i = 0; i < 32; i++) bridge.issue({ id, field, origin, operation: "set" });
  assert.throws(() => bridge.issue({ id, field, origin, operation: "set" }), /过多/);
});

test("inline writes survive a store adapter restart in an isolated native Keyring namespace", { skip: process.env.OPENQUANTUM_TEST_KEYCHAIN !== "1" }, async t => {
  const f = await setup(t), service = `org.openquantum.test.${randomUUID()}`, ref = serviceCredentialRef(id);
  const credentials = new Credentials({ service });
  t.after(() => credentials.remove(ref));
  const window = await createCredentialWindow({ settings: f.settings, credentials }); t.after(() => window.close());
  assert.equal((await post(issue(window))).status, 200);
  const reopened = new Credentials({ service });
  assert.equal((await serviceValues(reopened, serviceById(id)))[field], "synthetic-test-only");
  const restarted = await createCredentialWindow({ settings: f.settings, credentials: reopened }); t.after(() => restarted.close());
  assert.notEqual(window.origin, restarted.origin);
  assert.equal((await post(issue(restarted, { operation: "remove" }), {})).status, 200);
  assert.equal(await credentials.resolve(ref), null);
});
