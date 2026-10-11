import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { GitHubStar, GITHUB_REPOSITORY } from "../src/settings/codex/github-star.mjs";
import { createGitHubStarController } from "../runtime/chatgpt/ui/github-star.mjs";
import { createMcpServer, SETTINGS_TOOL } from "../runtime/chatgpt/server.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const ACCESS = "ghu_fixture_only_not_a_real_token_123456";
const DEVICE = "fixture_device_code_1234567890123456789012";
const REFRESH = "ghr_fixture_only_not_a_real_refresh_token";
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const response = (status, value) => new Response(value === undefined ? null : JSON.stringify(value), { status });
function fixture({ clientId = "Iv1.fixture123456" } = {}) {
  let now = 1000000;
  const secrets = new Map([["unrelated-mcp", "unrelated-secret"]]);
  const credentials = { resolve: async ref => secrets.get(ref) ?? null, set: async (ref, value) => secrets.set(ref, value), remove: async ref => secrets.delete(ref) };
  const f = { calls: [], credentials, secrets, token: { access_token: ACCESS, refresh_token: REFRESH, token_type: "bearer", expires_in: 28800 }, user: { login: "fixture-user", id: 42 }, starred: false,
    tick: (ms = 5000) => { now += ms; }, hook: null, putStatus: 204 };
  f.service = new GitHubStar({ credentials, clientId, now: () => now, fetchImpl: async (url, options) => {
    f.calls.push({ url, ...options });
    const intercepted = await f.hook?.(url, options);
    if (intercepted) return intercepted;
    if (url.endsWith("/login/device/code")) return response(200, { device_code: DEVICE, user_code: "ABCD-EFGH", verification_uri: "https://github.com/login/device", interval: 5, expires_in: 900 });
    if (url.endsWith("/login/oauth/access_token")) return response(200, f.token);
    if (url.endsWith("/user")) return response(200, f.user);
    assert.equal(url, `https://api.github.com/user/starred/${GITHUB_REPOSITORY}`);
    if (options.method === "PUT") { if (f.putStatus === 204) f.starred = true; return response(f.putStatus); }
    return response(f.starred ? 204 : 404);
  } });
  f.call = (action, flowId, extra = {}) => f.service.command({ action: `github.${action}`, ...(flowId ? { flowId } : {}), ...extra });
  f.seed = () => secrets.set(f.service.ref, JSON.stringify({ accessToken: ACCESS, expiresAt: now + 3600000 }));
  f.writes = () => f.calls.filter(call => call.method === "PUT");
  return f;
}

test("unconfigured app makes no network or credential request, and arbitrary targets are rejected", async () => {
  const f = fixture({ clientId: "" });
  f.credentials.resolve = () => { throw new Error("must not read credentials"); };
  for (const action of ["status", "start", "star"]) assert.equal((await f.call(action, action === "status" ? undefined : randomUUID())).state, "unavailable");
  assert.equal(f.calls.length, 0);
  const configured = fixture();
  for (const extra of [{ repository: "other/repo" }, { token: ACCESS }, { url: "https://evil.invalid" }, { revision: "x" }]) await assert.rejects(configured.call("start", randomUUID(), extra), /无效/);
  await assert.rejects(configured.call("star"), /标识无效/);
  assert.equal(configured.calls.length, 0);
});

test("status never authorizes or stars; existing authorization supports one click intent", async () => {
  const f = fixture(); f.seed();
  assert.equal((await f.call("status")).state, "ready");
  assert.equal(f.service.intent, null);
  assert.equal(f.writes().length, 0);
  const id = randomUUID();
  assert.equal((await f.call("start", id)).state, "ready");
  assert.equal((await f.call("star", id)).state, "starred");
  assert.equal(f.writes().length, 1);
  assert.equal(f.writes()[0].body, "");
  assert.equal(f.writes()[0].redirect, "error");
  await assert.rejects(f.call("star", id), /重新点击/);
  assert.equal((await f.call("start", randomUUID())).state, "starred");
  assert.equal(f.writes().length, 1);
  assert.ok(!f.calls.some(call => call.url.includes("/login/")));
});

test("device authorization respects interval and slow_down, stores secrets only in its credential entry", async () => {
  const f = fixture(), id = randomUUID(), views = [];
  views.push(await f.call("start", id));
  assert.equal(views[0].flowId, id);
  views.push(await f.call("poll", id));
  assert.equal(f.calls.length, 1, "early poll must not contact GitHub");
  f.tick(); f.token = { error: "authorization_pending" };
  views.push(await f.call("poll", id));
  f.tick(); f.token = { error: "slow_down" };
  views.push(await f.call("poll", id));
  assert.equal(views.at(-1).pollAfterMs, 10000);
  f.tick(10000); f.token = { access_token: ACCESS, refresh_token: REFRESH, token_type: "bearer", expires_in: 28800 };
  views.push(await f.call("poll", id));
  assert.equal(views.at(-1).state, "ready");
  assert.equal(f.writes().length, 0, "authorization is not permission to PUT without current UI intent");
  for (const secret of [ACCESS, DEVICE, REFRESH]) assert.ok(!JSON.stringify(views).includes(secret));
  const stored = await f.credentials.resolve(f.service.ref);
  assert.ok(stored.includes(ACCESS)); assert.ok(!stored.includes(REFRESH));
  assert.equal((await f.call("star", id)).state, "starred");
  await f.call("disconnect");
  assert.equal(await f.credentials.resolve(f.service.ref), null);
  assert.equal(f.secrets.get("unrelated-mcp"), "unrelated-secret");
  assert.equal(f.starred, true, "disconnect must never unstar");
});

test("denial, expiry, and malformed device responses never persist tokens or submit Star", async t => {
  for (const result of ["access_denied", "expired_token", "clock_expiry"]) await t.test(result, async () => {
    const f = fixture(), id = randomUUID(); await f.call("start", id);
    f.tick(result === "clock_expiry" ? 900001 : 5000); f.token = { error: result };
    assert.equal((await f.call("poll", id)).state, "signed_out");
    assert.equal(f.secrets.size, 1); assert.equal(f.writes().length, 0);
  });
  const f = fixture(); f.hook = async () => response(200, { device_code: DEVICE, user_code: "ABCD-EFGH", verification_uri: "https://evil.invalid", expires_in: 900, interval: 5 });
  await assert.rejects(f.call("start", randomUUID()), /无法开始/);
  assert.equal(f.service.intent, null);
});

test("separate pages cannot adopt an existing intent or cancel a different click", async () => {
  const f = fixture(), a = randomUUID(), b = randomUUID();
  await f.call("start", a);
  const state = await f.call("status"); assert.equal(state.state, "busy"); assert.equal(state.flowId, undefined); assert.equal(state.userCode, undefined);
  await assert.rejects(f.call("start", b), /已有/);
  await assert.rejects(f.call("cancel", b), /已经结束/);
  await assert.rejects(f.call("star", a), /重新点击/);
  await f.call("cancel", a);
  await assert.rejects(f.call("poll", a), /已结束/);
  assert.equal(f.writes().length, 0);
});

test("cancellation during token exchange and close during preflight prevent subsequent work", async t => {
  for (const close of [false, true]) await t.test(close ? "MCP closed" : "UI canceled", async () => {
    const f = fixture(), id = randomUUID(); await f.call("start", id); f.tick();
    const entered = deferred(), release = deferred();
    f.hook = async url => { if (url.endsWith("/access_token")) { entered.resolve(); await release.promise; } };
    const polling = f.call("poll", id); await entered.promise;
    await assert.rejects(f.call("poll", id), /正在进行/);
    if (close) f.service.close(); else await f.call("cancel", id);
    release.resolve(); await assert.rejects(polling, /取消|超时/);
    assert.equal(f.secrets.size, 1); assert.equal(f.writes().length, 0);
  });
});

test("cancellation around credential storage stops Star without deleting completed grants", async t => {
  for (const afterWrite of [false, true]) await t.test(afterWrite ? "after write" : "before write", async () => {
    const f = fixture(), id = randomUUID(); await f.call("start", id); f.tick();
    const entered = deferred(), release = deferred(), set = f.credentials.set;
    f.credentials.set = async (...args) => { if (afterWrite) await set(...args); entered.resolve(); await release.promise; if (!afterWrite) await set(...args); };
    const polling = f.call("poll", id); await entered.promise;
    await f.call("cancel", id); release.resolve();
    await assert.rejects(polling, /取消|超时/);
    assert.equal(f.secrets.size, 2); assert.equal(f.writes().length, 0);
    assert.equal(f.secrets.get("unrelated-mcp"), "unrelated-secret");
  });
});

test("cancel cleanup cannot delete a newer grant saved by another MCP process", async () => {
  const f = fixture(), id = randomUUID(); await f.call("start", id); f.tick();
  const entered = deferred(), release = deferred(), set = f.credentials.set;
  const newer = JSON.stringify({ accessToken: "ghu_newer_fixture_token_1234567890", expiresAt: 99999999 });
  f.credentials.set = async (...args) => { await set(...args); entered.resolve(); await release.promise; };
  const polling = f.call("poll", id); await entered.promise;
  await f.call("cancel", id);
  await set(f.service.ref, newer); release.resolve();
  await assert.rejects(polling, /取消/);
  assert.equal(await f.credentials.resolve(f.service.ref), newer);
  assert.equal(f.writes().length, 0);
});

test("canceling Star preflight stops PUT; a dispatched PUT cannot be reported as canceled", async t => {
  for (const afterDispatch of [false, true]) await t.test(afterDispatch ? "after dispatch" : "before dispatch", async () => {
    const f = fixture(), id = randomUUID(); f.seed(); await f.call("start", id);
    const entered = deferred(), release = deferred();
    f.hook = async (url, options) => { if (url.includes("/starred/") && options.method === (afterDispatch ? "PUT" : "GET")) { entered.resolve(); await release.promise; } };
    const starring = f.call("star", id); await entered.promise;
    assert.equal((await f.call("cancel", id)).state, afterDispatch ? "submitting" : "canceled");
    release.resolve();
    if (afterDispatch) assert.equal((await starring).state, "starred"); else await assert.rejects(starring, /取消|超时/);
    assert.equal(f.writes().length, afterDispatch ? 1 : 0);
  });
});

test("changed accounts and expired intents cannot reuse an earlier consent to Star", async () => {
  const f = fixture(), id = randomUUID(); f.seed(); await f.call("start", id);
  f.user = { login: "another-user", id: 43 };
  await assert.rejects(f.call("star", id), /账号已改变/);
  const expired = randomUUID(); await f.call("start", expired); f.tick(900001);
  await assert.rejects(f.call("star", expired), /超时/);
  assert.equal(f.writes().length, 0);
});

test("401 requires reauthorization, while denial, rate limiting, and service failure remain errors", async t => {
  for (const status of [401, 403, 429, 500]) await t.test(String(status), async () => {
    const f = fixture(), id = randomUUID(); f.seed(); await f.call("start", id); f.putStatus = status;
    if (status === 401) assert.equal((await f.call("star", id)).state, "signed_out");
    else await assert.rejects(f.call("star", id), status === 403 ? /权限不足/ : status === 429 ? /频繁/ : /服务暂不可用/);
    assert.equal(f.starred, false); assert.equal(f.service.intent, null);
  });
});

test("unsafe upstream errors, invalid JSON, and oversized responses never disclose tokens", async t => {
  for (const kind of ["network", "json", "oversize"]) await t.test(kind, async () => {
    const f = fixture(); f.hook = async () => {
      if (kind === "network") throw new Error(`${ACCESS} ${DEVICE} ${REFRESH}`);
      return new Response(kind === "json" ? ACCESS : ACCESS.repeat(1000), { status: 200 });
    };
    await assert.rejects(f.call("start", randomUUID()), error => [ACCESS, DEVICE, REFRESH].every(secret => !error.message.includes(secret)) && /无法连接/.test(error.message));
  });
});

test("GitHub commands stay app-only; MCP disconnect closes the authorization service", async t => {
  const f = fixture();
  const settings = { listeners: new Set(), listTools: async () => [], snapshot: async () => ({}), enabled: async () => false };
  const server = createMcpServer({ settings, githubStar: f.service, html: "<html></html>", release: { version: "test" } });
  const client = new Client({ name: "github-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  t.after(async () => { await client.close(); await server.close(); });
  const { tools } = await client.listTools();
  assert.deepEqual(tools.find(tool => tool.name === SETTINGS_TOOL)._meta.ui.visibility, ["app"]);
  assert.ok(!tools.some(tool => /github|star/.test(tool.name)));
  const result = await client.callTool({ name: SETTINGS_TOOL, arguments: { action: "github.start", flowId: randomUUID() } });
  assert.deepEqual(result.content, []);
  assert.equal(result._meta.openquantumSettings.state, "authorizing");
  assert.ok(!JSON.stringify(result).includes(DEVICE));
  await server.close(); assert.equal(f.service.closed, true); assert.equal(f.service.intent, null);
});

function uiFixture(request) {
  const views = [], tasks = [], links = [];
  const controller = createGitHubStarController({ request, render: state => views.push(state), openAuthorization: url => links.push(url),
    schedule: task => { const row = { task, canceled: false }; tasks.push(row); return row; }, unschedule: row => { if (row) row.canceled = true; } });
  return { controller, views, links, tasks };
}

test("MCP request cancellation during Star preflight propagates and prevents PUT", async t => {
  const f = fixture(), id = randomUUID(); f.seed(); await f.call("start", id);
  const entered = deferred(), release = deferred(), aborted = deferred();
  let transportSignal;
  f.hook = async (url, options) => {
    if (url.endsWith("/user")) {
      transportSignal = options.signal;
      options.signal.addEventListener("abort", () => aborted.resolve(), { once: true });
      entered.resolve(); await release.promise;
    }
  };
  const settings = { listeners: new Set(), listTools: async () => [], enabled: async () => false };
  const server = createMcpServer({ settings, githubStar: f.service, html: "<html></html>", release: { version: "test" } });
  const client = new Client({ name: "abort-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  t.after(async () => { await client.close(); await server.close(); });
  const controller = new AbortController();
  const call = client.callTool({ name: SETTINGS_TOOL, arguments: { action: "github.star", flowId: id } }, undefined, { signal: controller.signal });
  await entered.promise; controller.abort();
  await assert.rejects(call); await aborted.promise;
  assert.equal(transportSignal.aborted, true); release.resolve();
  for (let i = 0; i < 10 && f.service.busy; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.service.busy, false); assert.equal(f.writes().length, 0); assert.equal(f.service.intent, null);
});

test("UI opens authorization once and automatically stars only its still-active click", async () => {
  const f = fixture(), ui = uiFixture(input => f.service.command(input));
  await ui.controller.refresh(); assert.equal(f.calls.length, 0);
  await ui.controller.start(); assert.equal(ui.links.length, 1); assert.equal(ui.views.at(-1).state, "authorizing");
  f.tick(); await ui.tasks[0].task();
  // The real scheduler does not await callbacks; flush the controlled promises.
  for (let i = 0; i < 30 && ui.views.at(-1).state !== "starred"; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.views.at(-1).state, "starred"); assert.equal(f.writes().length, 1);
  assert.equal(ui.links.length, 1);
});

test("UI cancellation and host teardown suppress a late authorization response", async t => {
  for (const method of ["cancel", "close"]) await t.test(method, async () => {
    const waiting = deferred(), calls = [];
    const ui = uiFixture(async input => {
      calls.push(input);
      if (input.action === "github.start") { await waiting.promise; return { state: "ready", flowId: input.flowId, account: "fixture-user" }; }
      return { state: "canceled" };
    });
    const starting = ui.controller.start();
    await ui.controller[method](); waiting.resolve(); await starting;
    assert.ok(!calls.some(input => input.action === "github.star"));
    assert.ok(calls.some(input => input.action === "github.cancel"));
  });
});

test("UI keeps waiting for a submitted Star instead of getting stuck after a late cancel", async () => {
  const dispatched = deferred(), completed = deferred();
  const ui = uiFixture(async input => {
    if (input.action === "github.start") return { state: "ready", flowId: input.flowId, account: "fixture-user" };
    if (input.action === "github.star") { dispatched.resolve(); await completed.promise; return { state: "starred" }; }
    throw new Error("A submitted operation must keep waiting for its result");
  });
  const starting = ui.controller.start(); await dispatched.promise;
  await ui.controller.cancel(); completed.resolve(); await starting;
  assert.equal(ui.views.at(-1).state, "starred");
});
