import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { redactHarnessLaunchTokens } from "../scripts/lib/harness-http-auth.mjs";
import { probeHarnessHealth } from "../scripts/probe-harness-health.mjs";

const challenge = "dsh web authentication required; reopen the URL printed by dsh web.\n";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

async function serve(t, handler) {
  const server = createServer(handler);
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return listen(server);
}

async function runProbe(script, baseUrl, input = "") {
  const child = spawn(process.execPath, [script, baseUrl], {
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 10_000,
  });
  const exited = once(child, "close");
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdin.end(input);
  const [code, signal] = await exited;
  return { code, signal, stdout, stderr };
}

test("health check accepts the Harness challenge without sending credentials", async (t) => {
  const base = await serve(t, (request, response) => {
    assert.equal(request.url, "/");
    assert.equal(request.headers.cookie, undefined);
    assert.equal(request.headers.authorization, undefined);
    response.writeHead(401, { "content-type": "text/plain; charset=utf-8" });
    response.end(challenge);
  });
  await probeHarnessHealth(base);
});

for (const [status, body] of [
  [200, "<title>OpenQuantum</title>"],
  [401, "unauthorized"],
  [403, challenge],
  [404, challenge],
  [500, challenge],
  [302, challenge],
]) {
  test(`health check rejects an unexpected HTTP ${status} response`, async (t) => {
    const base = await serve(t, (_request, response) => {
      response.writeHead(status, { location: "/" });
      response.end(body);
    });
    await assert.rejects(probeHarnessHealth(base), /Harness health check/);
  });
}

test("health check times out even when the response body stalls", async (t) => {
  const base = await serve(t, (_request, response) => {
    response.writeHead(401);
    response.flushHeaders();
  });
  await assert.rejects(probeHarnessHealth(base, { timeoutMs: 100 }), { name: "TimeoutError" });
});

test("health check exits nonzero when the server is unavailable", async () => {
  const server = createServer();
  const base = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  const result = await runProbe("scripts/probe-harness-health.mjs", base);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim(), "Harness HTTP health check failed");
});

test("real Harness passes anonymous health and authenticated page/RPC probes", { timeout: 60_000 }, async (t) => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-host-health-"));
  let child;
  t.after(async () => {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      await exited;
      clearTimeout(timer);
    }
    await rm(sandbox, { recursive: true, force: true });
  });
  let modelRequests = 0;
  const modelBase = await serve(t, (_request, response) => {
    modelRequests += 1;
    response.writeHead(500);
    response.end("No model requests are expected from host health probes");
  });
  const reserved = createServer();
  const base = await listen(reserved);
  await new Promise((resolve) => reserved.close(resolve));
  child = spawn(process.execPath, [
    "scripts/run-harness.mjs", "--no-open", "--host", "127.0.0.1", "--port", new URL(base).port,
  ], {
    env: {
      ...process.env,
      DSH_HOME: path.join(sandbox, "dsh"),
      DSH_TELEMETRY_MODE: "DISABLED",
      DSH_TELEMETRY_DISABLED: "1",
      OPENQUANTUM_DISABLE_QISKIT_MCP: "1",
      OPENQUANTUM_PUBLIC_BASE_URL: `${modelBase}/v1`,
      OPENQUANTUM_PUBLIC_API_KEY: "local-fixture-only",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (chunk) => { logs = (logs + chunk).slice(-20_000); });
  child.stderr.on("data", (chunk) => { logs = (logs + chunk).slice(-20_000); });
  const deadline = Date.now() + 40_000;
  let ready = false;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      await probeHarnessHealth(base);
      if (logs.includes("?token=")) { ready = true; break; }
    } catch { /* Startup may not have bound the port yet. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Harness did not become ready: ${redactHarnessLaunchTokens(logs)}`);
  const health = await runProbe("scripts/probe-harness-health.mjs", base);
  assert.equal(health.code, 0, health.stderr);
  assert.equal(health.stdout, "");
  const authenticated = await runProbe("scripts/probe-harness-host.mjs", base, logs);
  assert.equal(authenticated.code, 0, authenticated.stderr);
  assert.deepEqual(JSON.parse(authenticated.stdout), {
    status: "pass", branding: "OpenQuantum", authenticatedRpc: true, modelRequests: 0,
  });
  const unauthenticated = await runProbe("scripts/probe-harness-host.mjs", base);
  assert.equal(unauthenticated.code, 1, "an anonymous health response cannot replace authenticated verification");
  assert.match(unauthenticated.stderr, /Harness has not published its authenticated launch URL/);
  assert.equal(modelRequests, 0);
});
