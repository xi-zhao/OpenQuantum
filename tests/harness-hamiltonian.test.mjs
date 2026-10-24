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
import { definition } from "../.agents/skills/hamiltonian-simulation/mcp/contracts.mjs";
import { HAMILTONIAN_INPUT } from "./fixtures/hamiltonian.mjs";

const toolName = "mcp__hamiltonian_local__simulate_hamiltonian";

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

test("Harness discovers the Hamiltonian Skill, runs both open formulas and rereads success and failure", { skip: process.env.OPENQUANTUM_REAL_HAMILTONIAN !== "1", timeout: 120_000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-hamiltonian-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  const fixtureCalls = [
    { id: "hamiltonian-trotter", input: HAMILTONIAN_INPUT },
    { id: "hamiltonian-qdrift", input: { numQubits: 1, terms: [{ pauli: "Y", coefficient: -0.7 }], time: 0.4, method: "qdrift", steps: 8, seed: 3 } },
    { id: "hamiltonian-invalid", input: { ...HAMILTONIAN_INPUT, order: 3 } },
  ];
  let registeredTool;
  let child;
  const deliveredResults = [];
  const model = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    registeredTool ??= body.tools?.find(tool => tool.function?.name === toolName);
    deliveredResults.push(...(body.messages ?? []).filter(message => message.role === "tool"));
    const completed = new Set(deliveredResults.map(message => message.tool_call_id));
    const next = fixtureCalls.find(call => !completed.has(call.id));
    const initial = Boolean(next);
    const delta = next ? {
      role: "assistant",
      tool_calls: [{ index: 0, id: next.id, type: "function", function: { name: toolName, arguments: JSON.stringify(next.input) } }],
    } : { role: "assistant", content: "Open Hamiltonian computations complete; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const choice of [
      { delta, finish_reason: null },
      { delta: {}, finish_reason: initial ? "tool_calls" : "stop" },
    ]) {
      response.write(`data: ${JSON.stringify({ id: "hamiltonian-model-fixture", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, ...choice }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })}\n\n`);
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
  const sessionId = `session-hamiltonian-${crypto.randomUUID()}`;
  await rpc("session/create", { sessionId, cwd: root, agentPreset: "openquantum" });
  const skills = await rpc("skills/list", { sessionId });
  assert.ok(skills.skills.some(skill => skill.name === "hamiltonian-simulation" && skill.modelInvocable));
  await rpc("session/prompt", {
    sessionId, mode: "queue",
    content: [{ type: "text", text: "Run both fixed Hamiltonian cases and the invalid-order case using their actual Tool results." }],
  });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 200);
    return snapshot.records.some(entry => entry.event?.type === "turn/end") && snapshot;
  }, "completed Hamiltonian turn", 90000);
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
    if (call.id === "hamiltonian-invalid") {
      assert.equal(block.isError, true);
      assert.match(content, /order must be 1 or even/);
    } else {
      assert.equal(block.isError, false);
      const output = JSON.parse(content);
      assert.ok(definition.validateOutput(output), JSON.stringify(definition.validateOutput.errors));
      assert.deepEqual(output.input, definition.normalize("simulate_hamiltonian", call.input));
      assert.equal(output.scientificValidation, "not_evaluated");
      assert.ok(output.result.unitaryFrobeniusError < 0.001);
    }
    assert.ok(deliveredResults.some(message => message.tool_call_id === call.id), `${call.id}: result must return to the model protocol`);
    evidence.push({ call: called, result });
  }
  const replay = await harnessSessionSnapshot(base, cookie, sessionId, 200);
  assert.deepEqual(replay.records.filter(item => item.event?.type === "tool/result").map(item => item.event),
    history.records.filter(item => item.event?.type === "tool/result").map(item => item.event));
  const target = path.join(root, ".openquantum/hamiltonian-evidence/harness-session.json");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify({
    verifiedAt: new Date().toISOString(), harness: "0.1.5-rc.1",
    model: "local protocol fixture", externalModelTested: false,
    source: definition.source, sessionId, events: evidence,
  }, null, 2) + "\n");
});
