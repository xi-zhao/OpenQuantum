import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { harnessHttpCookie, harnessSessionSnapshot, redactHarnessLaunchTokens } from "../scripts/lib/harness-http-auth.mjs";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { SOURCE } from "../src/quantum-practices/index.mjs";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

async function waitFor(probe, description, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value) return value;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`${description}: ${lastError ?? "timed out"}`);
}

test("Harness invokes reference retrieval, persists sources and returns invalid-input errors", { timeout: 60_000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-practices-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  const fixtureCalls = [
    { id: "practice-hhl", input: { action: "get", query: "HHL matrix constraints" } },
    { id: "practice-heat", input: { action: "get", query: "一维热方程的假设" } },
    { id: "practice-invalid", input: { action: "get", id: "../../.env" } },
  ];
  let dispatched = false;
  let registeredTool;
  let child;
  const deliveredResults = [];
  const model = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    registeredTool ??= body.tools?.find(tool => tool.function?.name === "quantum_practices");
    deliveredResults.push(...(body.messages ?? []).filter(message => message.role === "tool"));
    const initial = !dispatched;
    dispatched = true;
    const delta = initial ? {
      role: "assistant",
      tool_calls: fixtureCalls.map((call, index) => ({
        index, id: call.id, type: "function",
        function: { name: "quantum_practices", arguments: JSON.stringify(call.input) },
      })),
    } : { role: "assistant", content: "Reference retrieval complete; no scientific computation performed." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const choice of [
      { delta, finish_reason: null },
      { delta: {}, finish_reason: initial ? "tool_calls" : "stop" },
    ]) {
      response.write(`data: ${JSON.stringify({ id: "practice-model-fixture", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, ...choice }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })}\n\n`);
    }
    response.end("data: [DONE]\n\n");
  });
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      await exited;
      clearTimeout(timer);
    }
    model.closeAllConnections();
    await new Promise(resolve => model.close(resolve));
    await rm(sandbox, { recursive: true, force: true });
  });
  const modelPort = await listen(model);
  const reserved = createServer();
  const port = await listen(reserved);
  await new Promise(resolve => reserved.close(resolve));
  await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome });
  let logs = "";
  child = spawn(process.execPath, [path.join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--no-open", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      DSH_HOME: harnessHome,
      DSH_TELEMETRY_DISABLED: "1",
      OPENQUANTUM_DISABLE_QISKIT_MCP: "1",
      OPENQUANTUM_PUBLIC_API_KEY: "local-fixture-only",
      OPENQUANTUM_PUBLIC_BASE_URL: `http://127.0.0.1:${modelPort}/v1`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => { logs = (logs + chunk).slice(-20_000); });
  child.stderr.on("data", chunk => { logs = (logs + chunk).slice(-20_000); });
  const base = `http://127.0.0.1:${port}`;
  let cookie;
  async function rpc(method, payload = {}) {
    cookie ??= await harnessHttpCookie(base, logs);
    if (method === "session/prompt") payload = { requestId: crypto.randomUUID(), ...payload };
    const response = await fetch(`${base}/api/${method}`, {
      method: "POST", headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        type: "client-request", rpcId: crypto.randomUUID(), method,
        payload: { args: method === "session/modelCatalog" ? {} : { request: payload } },
      }),
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 200);
    const result = (await response.json()).result;
    assert.equal(result.ok, true, `${JSON.stringify(result)}\n${redactHarnessLaunchTokens(logs)}`);
    return result.value;
  }
  await waitFor(() => rpc("session/modelCatalog"), "Harness startup");
  const sessionId = `session-practices-${crypto.randomUUID()}`;
  await rpc("session/create", { sessionId, cwd: root, agentPreset: "openquantum" });
  await rpc("session/prompt", {
    sessionId, mode: "queue",
    content: [{ type: "text", text: "Look up the fixed HHL and heat-equation references; include the invalid-id error check." }],
  });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 200);
    return snapshot.records.some(entry => entry.event?.type === "turn/end") && snapshot;
  }, "completed reference retrieval turn");
  assert.ok(registeredTool, "real Harness request must include the registered Tool");
  assert.equal(registeredTool.function.parameters.additionalProperties, false);
  const events = history.records.map(entry => entry.event);
  const evidence = [];
  for (const call of fixtureCalls) {
    const called = events.find(event => event.type === "tool/call" && JSON.stringify(event).includes(call.id));
    const result = events.find(event => event.type === "tool/result" && JSON.stringify(event).includes(call.id));
    assert.ok(called, `${call.id}: missing persisted call`);
    assert.ok(result, `${call.id}: missing persisted result`);
    const block = result.data.message.content.find(item => item.type === "tool-result");
    const content = block.content.map(item => item.text ?? "").join("\n");
    if (call.id === "practice-invalid") {
      assert.equal(block.isError, true);
      assert.match(content, /not a filesystem path/);
    } else {
      assert.equal(block.isError, false);
      assert.ok(content.includes(SOURCE.commit));
      assert.match(content, /reference material only/);
      assert.match(content, call.id === "practice-hhl" ? /id: algorithms\/linear-systems\/hhl/ : /id: algorithms\/schrodingerization\/heat-1d-schrodingerization/);
    }
    assert.ok(deliveredResults.some(message => message.tool_call_id === call.id), `${call.id}: result must return to the model protocol`);
    evidence.push({ call: called, result });
  }
  if (process.env.OPENQUANTUM_PRACTICES_EVIDENCE) {
    const target = path.resolve(process.env.OPENQUANTUM_PRACTICES_EVIDENCE);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify({
      verifiedAt: new Date().toISOString(), harness: "0.1.5-rc.1",
      model: "local protocol fixture", externalModelTested: false,
      source: SOURCE, sessionId, events: evidence,
    }, null, 2) + "\n");
  }
});
