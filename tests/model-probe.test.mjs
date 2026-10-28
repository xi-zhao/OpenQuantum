import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const script = fileURLToPath(new URL("../scripts/probe-models.mjs", import.meta.url));
const secret = "local-probe-credential-fixture-only";
const model = "glm5.2";
async function runProbe(args, baseURL, environment = {}) {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: root,
    env: { ...process.env, NODE_USE_ENV_PROXY: "0",
      OPENQUANTUM_PUBLIC_API_KEY: secret, OPENQUANTUM_PUBLIC_BASE_URL: baseURL,
      OPENQUANTUM_PRIVATE_API_KEY: secret, OPENQUANTUM_PRIVATE_BASE_URL: baseURL, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const [code] = await once(child, "close");
  assert.ok(!(stdout + stderr).includes(secret), "provider echoes must not expose credentials");
  return { code, stdout, stderr };
}

async function fixture(t, mode, probeArgs = ["--provider", "openquantum-public", "--model", model], environment = {}) {
  const requests = [];
  const server = createServer(async (request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${secret}`);
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : null;
    requests.push({ url: request.url, body });
    if (!body) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: model }, { id: secret }, null, { id: "bad\nvalue" }] })); return;
    }
    if (mode === "forbidden") {
      response.writeHead(403, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: `refused Bearer ${secret}` } })); return;
    }
    if (mode === "non-json") {
      response.writeHead(401); response.end(`credential refused: ${secret}`); return;
    }
    const args = mode === "invalid-json" ? "{" : JSON.stringify({ marker: "OPENQUANTUM_OK", ...(mode === "extra-argument" ? { extra: secret } : {}) });
    const tool = { function: { name: mode === "wrong-tool" ? "other_tool" : "platform_health", arguments: args } };
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ choices: [{
      finish_reason: mode === "echo-finish" ? secret : mode === "truncated" ? "length" : body.tools ? "tool_calls" : "stop",
      message: body.tools ? { tool_calls: [tool] } : { content: mode === "wrong-text" ? "Something else" : "OPENQUANTUM_OK" },
    }] }));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const baseURL = `http://127.0.0.1:${server.address().port}/v1`;
  const result = await runProbe(probeArgs, mode === "endpoint-query" ? `${baseURL}?token=${secret}` : baseURL, environment);
  const reports = JSON.parse(result.stdout);
  return { ...result, report: reports[0], reports, requests, baseURL };
}
for (const mode of ["forbidden", "non-json", "wrong-text", "wrong-tool", "invalid-json", "extra-argument", "echo-finish", "truncated", "success", "endpoint-query"]) {
  test(`model probe ${mode} remains bounded, truthful and credential-free`, async t => {
    const result = await fixture(t, mode);
    const success = ["success", "endpoint-query"].includes(mode);
    assert.equal(result.requests.length, 3);
    assert.equal(result.report.models.length, 1);
    assert.deepEqual(result.report.modelsEndpoint.advertised, [model]);
    assert.equal(result.report.baseURL, result.baseURL);
    assert.equal(result.code, success ? 0 : 1);
    assert.equal(result.report.models[0].ok, success);
    assert.ok(result.requests.filter(r => r.body).every(r => r.body.model === model && r.body.max_tokens === 256 && r.body.reasoning_effort === undefined));
    assert.deepEqual(result.requests.find(r => r.body?.tools).body.tool_choice, { type: "function", function: { name: "platform_health" } });
    if (mode === "forbidden" || mode === "non-json") assert.match(result.report.models[0].textGeneration.error, /HTTP (401|403)/);
    if (mode === "wrong-text") assert.equal(result.report.models[0].textGeneration.exactText, false);
    if (mode === "echo-finish") assert.equal(result.report.models[0].textGeneration.finishReason, "unknown");
  });
}

test("a model-only probe neither requires nor contacts an unrelated provider", async t => {
  const unconfigured = await fixture(t, "success", ["--model", model], { OPENQUANTUM_PRIVATE_API_KEY: "", OPENQUANTUM_PRIVATE_BASE_URL: "" });
  assert.equal(unconfigured.code, 0);
  assert.deepEqual(unconfigured.reports.map(report => report.provider), ["openquantum-public"]);
  assert.equal(unconfigured.requests.length, 3);
  const configured = await fixture(t, "success", ["--model", model]);
  assert.equal(configured.code, 0);
  assert.deepEqual(configured.reports.map(report => report.provider), ["openquantum-public"]);
  assert.equal(configured.requests.length, 3, "the private catalog must not be requested even when configured");
});

test("Harness probe preserves matching reasoning selections through the pinned session RPC", async () => {
  const source = await readFile(new URL("../scripts/probe-quantum-harness-e2e.mjs", import.meta.url), "utf8");
  const start = source.indexOf("    let selectedReasoning = reasoningEffort;");
  const end = source.indexOf("\n    if (!selected.ok)", start);
  assert.ok(start >= 0 && end > start);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const select = new AsyncFunction("rpc", "provider", "selectedModel", "reasoningEffort", "sessionId", `${source.slice(start, end)}\nreturn selected;`);
  for (const [requested, current, expected] of [
    [undefined, { provider: "fixture", model: "fixture", reasoningEffort: "high" }, "high"],
    ["off", { provider: "fixture", model: "fixture", reasoningEffort: "high" }, "off"],
    ["default", { provider: "fixture", model: "fixture", reasoningEffort: "high" }, undefined],
    [undefined, { provider: "other", model: "fixture", reasoningEffort: "high" }, undefined],
  ]) {
    const calls = [];
    await select(async (method, payload) => {
      calls.push({ method, payload });
      if (method === "session.models") return { ok: true, value: { current } };
      assert.equal(method, "session.selectModel");
      return { ok: true, value: { selected: payload } };
    }, "fixture", "fixture", requested, "fixture-session");
    assert.equal(calls.at(-1).payload.reasoningEffort, expected);
    assert.deepEqual(calls.at(-1).payload, { sessionId: "fixture-session", provider: "fixture", model: "fixture", ...(expected ? { reasoningEffort: expected } : {}) });
  }
});

test("invalid or missing provider and model arguments fail before any request", async t => {
  let requests = 0;
  const server = createServer((_request, response) => { requests++; response.end("{}"); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const baseURL = `http://127.0.0.1:${server.address().port}/v1`;
  for (const args of [["--provider"], ["--provider", secret], ["--model"], ["--model", secret], ["--provider", "openquantum-private", "--model", model]]) {
    const result = await runProbe(args, baseURL);
    assert.equal(result.code, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Use --provider|Select a model/);
  }
  assert.equal(requests, 0);
});
