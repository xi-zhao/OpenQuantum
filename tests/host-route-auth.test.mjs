import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { appendFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { harnessHttpCookie, redactHarnessLaunchTokens } from "../scripts/lib/harness-http-auth.mjs";
import { createCapabilitySettingsHandler } from "../runtime/openquantum/web-capabilities/index.mjs";
import { createLearningHandler } from "../runtime/openquantum/web-learning/index.mjs";
import { apply as applyUpdates, createUpdateHandler } from "../runtime/openquantum/web-updates/index.mjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("custom handlers fail closed when Harness authentication is not supplied", async () => {
  const dispatch = () => assert.fail("unauthenticated request reached the application");
  for (const handler of [
    createCapabilitySettingsHandler({ dispatch }),
    createLearningHandler({ dispatch, openUi: dispatch }),
    createUpdateHandler({ dispatch }),
  ]) {
    let status;
    await handler({
      method: "POST",
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json" },
      [Symbol.asyncIterator]() { assert.fail("unauthenticated request body was read"); },
    }, { writeHead(value) { status = value; }, end() {} });
    assert.equal(status, 401);
  }
});

test("real Harness cookies protect settings and preparation from a different working directory", { timeout: 60_000 }, async (t) => {
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-route-auth-"));
  const harnessHome = path.join(sandbox, "dsh");
  let child;
  let logs = "";
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      await exited;
      clearTimeout(timer);
    }
    await rm(sandbox, { recursive: true, force: true });
  });
  await prepareOpenQuantumHarnessHome({ projectRoot, harnessHome });
  // Use the real Desktop capability Host inside an isolated Web Host. This
  // exercises its Application and credential channel without launching Electron,
  // creating a Session, installing an SDK or starting an MCP/Model request.
  await appendFile(path.join(harnessHome, "cordis.patch.yml"), `
- insert:
    - id: openquantum-capability-host
      name: '@openquantum/harness-capability-host'
      inject: [credentials, webServer, connection]
`);
  // All update state is temporary; no check is requested and fallback is loopback.
  const updateState = path.join(harnessHome, "updates/openquantum.json");
  await mkdir(path.dirname(updateState), { recursive: true });
  await writeFile(updateState, JSON.stringify({ schemaVersion: 1, automatic: false, lastCheckedAt: Date.now(), lastCheckStatus: "unpublished" }));
  const reserved = createServer();
  reserved.listen(0, "127.0.0.1");
  await once(reserved, "listening");
  const port = reserved.address().port;
  await new Promise((resolve) => reserved.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, [path.join(projectRoot, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--no-open", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: sandbox,
    env: {
      ...process.env, DSH_HOME: harnessHome, DSH_TELEMETRY_DISABLED: "1", DSH_TELEMETRY_MODE: "DISABLED",
      OPENQUANTUM_LEARNING_DIR: path.join(sandbox, "classrooms"),
      OPENQUANTUM_DISABLE_QISKIT_MCP: "1", OPENQUANTUM_UPDATE_CHECK: "0",
      OPENQUANTUM_UPDATE_FEED_URL: "https://127.0.0.1:1/fixture",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk) => { logs = (logs + chunk).slice(-30_000); };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  const diagnostics = () => redactHarnessLaunchTokens(logs);
  let cookie;
  const deadline = Date.now() + 40_000;
  while (!cookie && Date.now() < deadline) {
    if (child.exitCode !== null) assert.fail(`Harness exited during startup: ${diagnostics()}`);
    try { cookie = await harnessHttpCookie(base, logs); } catch { await delay(100); }
  }
  assert.ok(cookie, `Harness did not start: ${diagnostics()}`);
  const invalidCookie = cookie.replace(/=[^;]*/g, "=invalid");
  const endpoints = [
    ["/openquantum/api/capabilities", { action: "snapshot" }],
    ["/openquantum/api/channels", { action: "snapshot" }],
    ["/openquantum/api/runtime-readiness", { action: "snapshot" }],
    ["/openquantum/api/learning", { action: "list" }],
    ["/openquantum/api/updates", { action: "snapshot" }],
    ["/openquantum/api/preparation", { action: "snapshot" }],
    ["/openquantum/api/preparation", { action: "credential.field.prepare", id: "pasqal_cloud", field: "PASQAL_AUTH_TOKEN", operation: "set" }],
  ];
  const request = (endpoint, command, headers = {}) => fetch(`${base}${endpoint}`, {
    method: "POST", headers: { "content-type": "application/json", origin: base, ...headers },
    body: JSON.stringify(command), signal: AbortSignal.timeout(5000),
  });
  for (const [endpoint, command] of endpoints) {
    for (const headers of [{}, { cookie: invalidCookie }]) {
      const response = await request(endpoint, command, headers);
      assert.equal(response.status, 401, `${endpoint}: ${diagnostics()}`);
      await response.arrayBuffer();
    }
    const response = await request(endpoint, command, { cookie });
    assert.equal(response.status, 200, `${endpoint}: ${diagnostics()}`);
    const result = await response.json();
    if (command.action === "credential.field.prepare") {
      assert.equal(typeof result.nonce, "string");
      assert.equal(result.algorithm, "RSA-OAEP-256");
      assert.equal(result.encryption, "A256GCM");
      assert.equal(result.publicKey.kty, "RSA");
      assert.equal(result.publicKey.d, undefined, "only the public encryption key crosses the route");
    }
    const foreign = await request(endpoint, command, { cookie, origin: "https://foreign.example" });
    assert.equal(foreign.status, 403, endpoint);
    await foreign.arrayBuffer();
  }
  // The attack's write path must reject before registration; use a deliberately
  // invalid command so even a regression cannot change the project fixture.
  for (const action of ["mcp.register", "mcp.update"]) {
    const rejected = await request(endpoints[0][0], { action });
    assert.equal(rejected.status, 401);
    await rejected.arrayBuffer();
  }
  for (const headers of [{}, { cookie: invalidCookie }]) {
    const rejected = await fetch(`${base}/openquantum/api/preparation`, {
      method: "POST", headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ action: "snapshot" }), signal: AbortSignal.timeout(5000),
    });
    assert.equal(rejected.status, 401);
    await rejected.arrayBuffer();
  }
  const forwarded = await fetch(`${base}/openquantum/api/preparation`, {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ action: "snapshot" }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(forwarded.status, 200, diagnostics());
  assert.ok(Array.isArray((await forwarded.json()).services));
  const state = JSON.parse(await readFile(updateState, "utf8"));
  assert.equal(state.automatic, false);
});

test("OpenQuantum update registration leaves the original Desktop update route untouched", async (t) => {
  const home = await mkdtemp(path.join(tmpdir(), "oq-update-route-"));
  const previous = { DSH_HOME: process.env.DSH_HOME, OPENQUANTUM_UPDATE_CHECK: process.env.OPENQUANTUM_UPDATE_CHECK };
  process.env.DSH_HOME = home;
  process.env.OPENQUANTUM_UPDATE_CHECK = "0";
  let pending, dispose;
  t.after(async () => {
    await dispose?.();
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(home, { recursive: true, force: true });
  });
  const routes = [];
  applyUpdates({
    connection: { requestRejection: () => undefined },
    webServer: { register(route) { routes.push(route.path); return () => {}; } },
    effect(callback) { pending = callback(); },
  });
  dispose = await pending;
  assert.deepEqual(routes, ["/openquantum/api/updates"]);
});
