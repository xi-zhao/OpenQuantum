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

const enabled = process.env.OPENQUANTUM_REAL_FATQAT === "1";
const toolName = "mcp__fatqat_local__simulate_fatqat_circuit";
async function listen(server) {
  server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port;
}
async function waitFor(probe, description, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try { const value = await probe(); if (value) return value; } catch (error) { last = error.message; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${description}: ${last ?? "timed out"}`);
}

test("Harness loads FatQat Skill, dispatches the real MCP computation and persists its data and image", { skip: !enabled, timeout: 180000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-fatqat-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  let dispatched = false;
  let sawModelToolResult = false;
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    sawModelToolResult ||= body.messages?.some((message) => message.role === "tool");
    const initial = !dispatched;
    dispatched = true;
    const delta = initial ? { role: "assistant", tool_calls: [{ index: 0, id: "fatqat-harness-fixture", type: "function", function: { name: toolName, arguments: JSON.stringify({ backend: "general", numQubits: 2, operations: [{ gate: "x", qubits: [0] }], shots: 16, seed: 7 }) } }] } : { role: "assistant", content: "FatQat experiment completed; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const item of [
      { choices: [{ index: 0, delta, finish_reason: null }] },
      { choices: [{ index: 0, delta: {}, finish_reason: initial ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } },
    ]) response.write(`data: ${JSON.stringify({ id: "fatqat-fixture", object: "chat.completion.chunk", created: 1, model: body.model, ...item })}\n\n`);
    response.end("data: [DONE]\n\n");
  });
  const modelPort = await listen(model);
  const reserved = createServer(); const port = await listen(reserved); await new Promise((resolve) => reserved.close(resolve));
  await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome });
  let logs = "";
  const child = spawn(process.execPath, [path.join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--no-open", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root, env: { ...process.env, DSH_HOME: harnessHome, DSH_TELEMETRY_DISABLED: "1", OPENQUANTUM_DISABLE_QISKIT_MCP: "1", OPENQUANTUM_PUBLIC_API_KEY: "local-fixture-only", OPENQUANTUM_PUBLIC_BASE_URL: `http://127.0.0.1:${modelPort}/v1` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { logs = (logs + chunk).slice(-20000); });
  child.stderr.on("data", (chunk) => { logs = (logs + chunk).slice(-20000); });
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = once(child, "exit"); child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000); await exited; clearTimeout(timer);
    }
    model.closeAllConnections(); await new Promise((resolve) => model.close(resolve));
    await rm(sandbox, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  let cookie;
  async function rpc(method, payload = {}) {
    cookie ??= await harnessHttpCookie(base, logs);
    if (method === "session/prompt") payload = { requestId: crypto.randomUUID(), ...payload };
    const response = await fetch(`${base}/api/${method}`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ type: "client-request", rpcId: crypto.randomUUID(), method, payload: { args: method === "session/modelCatalog" ? {} : { request: payload } } }), signal: AbortSignal.timeout(5000) });
    const result = (await response.json()).result;
    assert.equal(result.ok, true, `${JSON.stringify(result)}\n${redactHarnessLaunchTokens(logs)}`);
    return result.value;
  }
  await waitFor(() => rpc("session/modelCatalog"), "Harness startup");
  const sessionId = `session-fatqat-${crypto.randomUUID()}`;
  await rpc("session/create", { sessionId, cwd: root, agentPreset: "openquantum" });
  const skillList = await rpc("skills/list", { sessionId });
  assert.ok(skillList.skills.some((skill) => skill.name === "fatqat-workbench" && skill.modelInvocable));
  await rpc("session/prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Run the FatQat two-qubit X-on-q0 experiment with 16 shots." }] });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 200);
    return snapshot.records.some((entry) => entry.event?.type === "turn/end") && snapshot;
  }, "completed FatQat Harness turn", 135000);
  const events = history.records.map((entry) => entry.event);
  const call = events.find((event) => event.type === "tool/call" && JSON.stringify(event).includes(toolName));
  assert.ok(call, redactHarnessLaunchTokens(logs));
  const result = events.find((event) => event.type === "tool/result" && JSON.stringify(event).includes("39b75e30ae50ddb4a8c7b840847edce678aa814c"));
  assert.ok(result, JSON.stringify(events.filter((event) => event.type.startsWith("tool/") || event.type.includes("error"))));
  const serialized = JSON.stringify(result);
  assert.match(serialized, /not_evaluated/);
  assert.match(serialized, /q0_first_most_significant/);
  assert.match(serialized, /image\/png/);
  assert.equal(sawModelToolResult, true);
  const evidence = path.join(root, ".openquantum/fatqat-evidence");
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "harness-session.json"), JSON.stringify({ verifiedAt: new Date().toISOString(), model: "local protocol fixture", externalModelTested: false, sessionId, events }, null, 2));
});
