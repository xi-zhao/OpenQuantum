import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";
import { buildUpdateManifest } from "../scripts/build-update-manifest.mjs";
import { compareVersions, DEFAULT_UPDATE_FEED, fetchRelease, MAX_MANIFEST_BYTES, parseVersion, validateRelease } from "../src/updates/release.mjs";
import { CHECK_INTERVAL_MS, createUpdateService } from "../src/updates/service.mjs";
import { createUpdateHandler } from "../runtime/openquantum/web-updates/index.mjs";

const manifest = { name: "openquantum", version: "0.5.0", dependencies: { "@deepseek-ai/dsh": "0.1.5-rc.1" } };
const release = (version = "0.5.0") => buildUpdateManifest({ manifest: { ...manifest, version }, tag: `v${version}`, publishedAt: "2026-09-20T00:00:00Z" });
const response = (value = release()) => new Response(JSON.stringify(value));

async function fixture(t, overrides = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "oq-updates-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let clock = Date.parse("2026-09-20T01:00:00Z");
  let calls = 0;
  let next = () => response();
  const options = { currentVersion: "0.4.0", statePath: path.join(dir, "state.json"), now: () => clock, request: (...args) => { calls++; return next(...args); }, ...overrides };
  const service = await createUpdateService(options);
  t.after(() => service.dispose());
  return { service, options, advance: (ms) => { clock += ms; }, setRequest: (fn) => { next = fn; }, calls: () => calls };
}

test("compares product SemVer including prereleases, large components and build metadata", () => {
  for (const invalid of ["v0.4.0", "01.2.3", "1.2", "1.2.3-01", "1.2.3-"]) assert.equal(parseVersion(invalid), null);
  for (const [a, b] of [["0.5.0", "0.4.99"], ["1.0.0", "1.0.0-rc.10"], ["1.0.0-beta.10", "1.0.0-beta.2"], ["1.0.0-beta", "1.0.0-10"], ["999999999999999999999.0.0", "999999999999999999998.0.0"]]) {
    assert.equal(compareVersions(a, b), 1);
    assert.equal(compareVersions(b, a), -1);
  }
  assert.equal(compareVersions("1.2.3+first", "1.2.3+second"), 0);
});

test("generates deterministic OpenQuantum metadata and rejects mismatched releases", () => {
  assert.deepEqual(release(), release());
  assert.equal(release().version, "0.5.0");
  assert.equal(release().compatibility.desktop, "2.0.7");
  assert.deepEqual(release().artifacts, []);
  assert.throws(() => buildUpdateManifest({ manifest, tag: "v0.6.0", publishedAt: "2026-09-20" }), /tag/);
  assert.throws(() => release("0.5.0-beta.1"), /stable/);
  for (const patch of [{ product: "dsh-desktop" }, { schemaVersion: 2 }, { channel: "beta" }, { releaseUrl: "javascript:alert(1)" }, { upgradeUrl: "https://user:secret@example.org/" }, { artifacts: [{ kind: "installer", platform: "darwin", arch: "arm64", url: "https://example.org/app.dmg" }] }]) {
    assert.throws(() => validateRelease({ ...release(), ...patch }));
  }
});

test("fetches a bounded HTTPS release asset without credentials or identifiers", async () => {
  const requests = [];
  const result = await fetchRelease(DEFAULT_UPDATE_FEED, { request: async (url, init) => {
    requests.push([url, init]);
    return requests.length === 1 ? new Response(null, { status: 302, headers: { location: "https://cdn.example.org/manifest.json" } }) : response();
  } });
  assert.equal(result.version, "0.5.0");
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0][1].headers, { accept: "application/json" });
  assert.equal(await fetchRelease(DEFAULT_UPDATE_FEED, { request: () => new Response(null, { status: 404 }) }), null);
  let redirects = 0;
  await assert.rejects(fetchRelease(DEFAULT_UPDATE_FEED, { request: () => { redirects++; return new Response(null, { status: 302, headers: { location: "http://example.org/unsafe" } }); } }));
  assert.equal(redirects, 1, "never request an HTTP redirect");
  for (const request of [() => new Response("bad JSON"), () => new Response("x".repeat(MAX_MANIFEST_BYTES + 1)), () => new Response(null, { status: 429 }), () => response({ ...release(), version: "broken" })]) {
    await assert.rejects(fetchRelease(DEFAULT_UPDATE_FEED, { request }));
  }
});

test("coalesces checks, caches across restarts and keeps OpenQuantum versions separate", async (t) => {
  const f = await fixture(t);
  let resolve;
  f.setRequest(() => new Promise((done) => { resolve = done; }));
  const first = f.service.check({ manual: true });
  const second = f.service.check({ manual: true });
  assert.equal(f.service.snapshot().checking, true);
  resolve(response());
  assert.equal((await first).status, "available");
  assert.equal((await second).release.version, "0.5.0");
  assert.equal(f.calls(), 1);
  await f.service.check();
  await f.service.check({ manual: true });
  assert.equal(f.calls(), 1);
  await f.service.dispose();
  const restored = await createUpdateService(f.options);
  t.after(() => restored.dispose());
  assert.equal(restored.snapshot().status, "available");
  await restored.check();
  assert.equal(f.calls(), 1);
  f.advance(CHECK_INTERVAL_MS);
  f.setRequest(() => response());
  await restored.check();
  assert.equal(f.calls(), 2);
  const upgraded = await createUpdateService({ ...f.options, currentVersion: "0.5.0" });
  t.after(() => upgraded.dispose());
  assert.equal(upgraded.snapshot().status, "current");
});

test("claims each reminder once, persists skip and allows later versions", async (t) => {
  const f = await fixture(t);
  await f.service.check();
  const claims = await Promise.all([f.service.dispatch({ action: "claim" }), f.service.dispatch({ action: "claim" })]);
  assert.deepEqual(claims.map(({ claimed }) => claimed), [true, false]);
  await f.service.dispatch({ action: "later", version: "0.5.0" });
  assert.equal(f.service.snapshot().notify, false);
  f.advance(CHECK_INTERVAL_MS);
  assert.equal(f.service.snapshot().notify, true);
  await f.service.dispatch({ action: "skip", version: "0.5.0" });
  const restored = await createUpdateService(f.options);
  t.after(() => restored.dispose());
  assert.equal(restored.snapshot().notify, false);
  f.setRequest(() => response(release("0.6.0")));
  await restored.check();
  assert.equal(restored.snapshot().notify, true);
  await assert.rejects(restored.dispatch({ action: "skip", version: "0.5.0" }), /changed/);
});

test("snoozing an older version does not hide a newly published version", async (t) => {
  const f = await fixture(t);
  await f.service.check();
  await f.service.dispatch({ action: "later", version: "0.5.0" });
  f.advance(61_000);
  f.setRequest(() => response(release("0.6.0")));
  await f.service.check({ manual: true });
  assert.equal(f.service.snapshot().notify, true);
});

test("a manual result consumes its automatic reminder without hiding the available release", async (t) => {
  const f = await fixture(t);
  const result = await f.service.dispatch({ action: "check" });
  assert.equal(result.status, "available");
  assert.equal(result.notify, false);
  assert.equal((await f.service.dispatch({ action: "claim" })).claimed, false);
});

test("read-only state still permits discovery and a single in-memory reminder", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "oq-updates-readonly-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  // A directory cannot be replaced by the state writer, independent of UID permissions.
  const service = await createUpdateService({ currentVersion: "0.4.0", statePath: dir, request: () => response() });
  t.after(() => service.dispose());
  assert.equal((await service.check()).status, "available");
  assert.equal((await service.dispatch({ action: "claim" })).claimed, true);
  assert.equal((await service.dispatch({ action: "claim" })).claimed, false);
  await assert.rejects(service.dispatch({ action: "automatic", enabled: false }));
  assert.equal(service.snapshot().automatic, true);
});

test("automatic checking can be disabled while manual checks remain usable", async (t) => {
  const f = await fixture(t, { automatic: false });
  await f.service.check();
  assert.equal(f.calls(), 0);
  await f.service.check({ manual: true });
  assert.equal(f.calls(), 1);
  assert.equal(f.service.snapshot().notify, false);
  const enabled = await createUpdateService({ ...f.options, automatic: true });
  t.after(() => enabled.dispose());
  await enabled.dispatch({ action: "automatic", enabled: false });
  f.advance(CHECK_INTERVAL_MS);
  await enabled.check();
  assert.equal(f.calls(), 1);
  await enabled.dispatch({ action: "automatic", enabled: true });
  await enabled.check();
  assert.equal(f.calls(), 2);
  assert.throws(() => enabled.dispatch({ action: "check", feedUrl: "https://attacker.invalid" }), /Invalid/);
});

test("missing releases and network failures never report a successful current-version check", async (t) => {
  const f = await fixture(t);
  f.setRequest(() => new Response(null, { status: 404 }));
  assert.equal((await f.service.check()).status, "unpublished");
  f.advance(CHECK_INTERVAL_MS);
  f.setRequest(() => response());
  await f.service.check();
  f.advance(CHECK_INTERVAL_MS);
  f.setRequest(() => { throw new Error("offline secret should not escape"); });
  const failed = await f.service.check();
  assert.equal(failed.status, "error");
  assert.equal(failed.release.version, "0.5.0");
  assert.equal(failed.notify, false);
  assert.doesNotMatch(JSON.stringify(failed), /secret/);
  const restored = await createUpdateService(f.options);
  t.after(() => restored.dispose());
  assert.equal(restored.snapshot().status, "error");
});

test("aborts timed-out checks and pending requests when the Host unloads", async (t) => {
  const f = await fixture(t, { timeoutMs: 15 });
  let aborted = 0;
  f.setRequest((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => { aborted++; reject(signal.reason); }, { once: true });
  }));
  assert.equal((await f.service.check()).status, "error");
  assert.equal(aborted, 1);
  f.advance(CHECK_INTERVAL_MS);
  const pending = f.service.check();
  await f.service.dispose();
  await pending;
  assert.equal(aborted, 2);
});

test("recovers damaged optional state and validates preference writes", async (t) => {
  const f = await fixture(t);
  await writeFile(f.options.statePath, "{damaged");
  const restored = await createUpdateService(f.options);
  t.after(() => restored.dispose());
  assert.equal(restored.snapshot().status, "idle");
  await restored.check();
  assert.equal(restored.snapshot().status, "available");
  await assert.rejects(restored.dispatch({ action: "automatic", enabled: "yes" }), /preference/);
});

function commandRequest(body = {}, headers = {}, method = "POST") {
  return { method, headers: { host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin", "content-type": "application/json", ...headers },
    async *[Symbol.asyncIterator]() { yield typeof body === "string" ? body : JSON.stringify(body); } };
}
async function invoke(handler, request) {
  const result = {};
  await handler(request, { writeHead(status, headers) { Object.assign(result, { status, headers }); }, end(body) { result.body = JSON.parse(body); } });
  return result;
}

test("bounded routes reject cross-origin, oversized and arbitrary commands before dispatch", async (t) => {
  const f = await fixture(t);
  const handler = createUpdateHandler(f.service);
  const cases = [
    [commandRequest({}, {}, "GET"), 405], [commandRequest({}, { origin: "https://evil.example" }), 403],
    [commandRequest({}, { "sec-fetch-site": "cross-site" }), 403], [commandRequest({}, { "content-type": "text/plain" }), 415],
    [commandRequest("x".repeat(1025)), 413], [commandRequest("not JSON"), 400],
    [commandRequest({ action: "install" }), 400], [commandRequest({ action: "check", feedUrl: "https://evil.example" }), 400],
  ];
  for (const [request, status] of cases) assert.equal((await invoke(handler, request)).status, status);
  assert.equal(f.calls(), 0);
  const good = await invoke(handler, commandRequest({ action: "check" }));
  assert.equal(good.body.status, "available");
  assert.equal(good.headers["cache-control"], "no-store");
});

test("Desktop's exact empty request checks OpenQuantum and preserves its public acknowledgement", async (t) => {
  const f = await fixture(t);
  const handler = createUpdateHandler(f.service, { desktop: true });
  const result = await invoke(handler, commandRequest());
  assert.deepEqual(result.body, { accepted: true });
  assert.equal(f.service.snapshot().desktopCheck, 1);
  assert.equal(f.service.snapshot().release.version, "0.5.0");
  assert.equal((await invoke(handler, commandRequest({ action: "check" }))).status, 400);
  assert.equal((await invoke(handler, commandRequest({}, { host: "example.org", origin: "https://example.org" }))).status, 403);
});

test("release publication reuses all CI gates and only uploads a matching stable manifest", async () => {
  const workflow = parse(await readFile(new URL("../.github/workflows/release-updates.yml", import.meta.url), "utf8"));
  const ci = parse(await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"));
  assert.deepEqual(workflow.on.release.types, ["published"]);
  assert.match(workflow.jobs.verify.if, /!github.event.release.prerelease/);
  assert.equal(workflow.jobs.verify.uses, "./.github/workflows/ci.yml");
  assert.ok(Object.hasOwn(ci.on, "workflow_call"));
  assert.equal(workflow.jobs.publish.needs, "verify");
  assert.deepEqual(Object.keys(ci.jobs), ["quality", "desktop-source-install", "container-smoke"]);
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(workflow.jobs.publish.permissions.contents, "write");
});
