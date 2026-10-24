import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { harnessHttpCookie, harnessSessionSnapshot, redactHarnessLaunchTokens } from "../scripts/lib/harness-http-auth.mjs";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";

import { CANDIDATE_TOOLS } from "./fixtures/candidate-tools.mjs";
const enabled = process.env.OPENQUANTUM_REAL_CANDIDATE_TOOLS === "1";
const CASES = [...CANDIDATE_TOOLS,
  { id: "flagquantum-workbench", server: "flagquantum", tool: "simulate_circuit_tool", input: { circuit: '[{"name":"h","index":[0]},{"name":"cx","index":[0,1]}]', circuit_format: "qir" } },
  { ...CANDIDATE_TOOLS[1], id: "compact-invalid", input: { gates: [{ gate: "CX", targets: [0,0] }] }, expectError: true },
];
const toolNames = CASES.map(c => c.server ? `mcp__${c.server}__${c.tool}` : c.tool);
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

test("Harness discovers candidate Skills, runs all five real integrations and persists a rejected input", { skip: !enabled, timeout: 600000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-candidate-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  let dispatched = false;
  let sawModelToolResult = false;
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    sawModelToolResult ||= body.messages?.some((message) => message.role === "tool");
    const initial = !dispatched;
    dispatched = true;
    const delta = initial ? { role: "assistant", tool_calls: CASES.map((c, index) => ({ index, id: `candidate-fixture-${index}`, type: "function", function: { name: toolNames[index], arguments: JSON.stringify(c.input) } })) } : { role: "assistant", content: "Five local ecosystem actions completed and one invalid circuit was rejected as expected; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const item of [
      { choices: [{ index: 0, delta, finish_reason: null }] },
      { choices: [{ index: 0, delta: {}, finish_reason: initial ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } },
    ]) response.write(`data: ${JSON.stringify({ id: "candidate-tools-fixture", object: "chat.completion.chunk", created: 1, model: body.model, ...item })}\n\n`);
    response.end("data: [DONE]\n\n");
  });
  const modelPort = await listen(model);
  const reserved = createServer(); const port = await listen(reserved); await new Promise((resolve) => reserved.close(resolve));
  const { presetTarget } = await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome });
  const presetPath = path.join(presetTarget, "agent.cordis.yml");
  let preset = await readFile(presetPath, "utf8");
  for (const id of ["cqlib-kernel", "flagquantum-workbench"]) {
    preset = preset.replace(new RegExp(`(- id: mcp-${id}\\n  name: [^\\n]+\\n)  disabled: true\\n`), "$1");
  }
  await writeFile(presetPath, preset); // isolated test home only; product defaults stay opt-in.
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
  const sessionId = `session-candidate-${crypto.randomUUID()}`;
  await rpc("session/create", { sessionId, cwd: root, agentPreset: "openquantum" });
  const skillList = await rpc("skills/list", { sessionId });
  for (const c of CANDIDATE_TOOLS) assert.ok(skillList.skills.some(skill => skill.name === c.id && skill.modelInvocable), c.id);
  await rpc("session/prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Run the six fixed small-system candidate-tool cases and return their actual evidence." }] });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 500);
    return snapshot.records.some((entry) => entry.event?.type === "turn/end") && snapshot;
  }, "completed candidate-tools Harness turn", 540000);
  const events = history.records.map((entry) => entry.event);
  for (const [index, capability] of CASES.entries()) {
    const call = events.find(event => event.type === "tool/call" && JSON.stringify(event).includes(toolNames[index]));
    assert.ok(call, `${capability.id}: missing call\n${redactHarnessLaunchTokens(logs)}`);
    const result = events.find(event => event.type === "tool/result" && JSON.stringify(event).includes(`candidate-fixture-${index}`));
    assert.ok(result, `${capability.id}: missing result`);
    const serialized = JSON.stringify(result);
    const block = result.data.message.content.find(item => item.type === "tool-result");
    if (capability.expectError) {
      assert.equal(block.isError, true);
      assert.match(serialized, /targets/);
      continue;
    }
    if (capability.id === "flagquantum-workbench") {
      assert.equal(block.isError, false);
      const output = JSON.parse(block.content.find(item => item.type === "text").text);
      assert.equal(output.status, "success");
      assert.equal(output.execution.accuracy.metric, "not_measured");
      assert.ok(Math.abs(output.outputs[0].value[0]-0.5) < 1e-6);
      continue;
    }
    assert.match(serialized, /not_evaluated/);
    assert.match(serialized, capability.server ? /dependencyLockSha256/ : /snapshotSha256/);
    assert.doesNotMatch(serialized, /"isError":true/);
    assert.equal(block.isError, false);
    const output = JSON.parse(block.content.find(item => item.type === "text").text);
    if (capability.server) {
      const { definition } = await import(`../.agents/skills/${capability.id}/mcp/contracts.mjs`);
      assert.ok(definition.validateOutput(output), `${capability.id}: invalid persisted result`);
      assert.deepEqual(output.input, definition.normalize(capability.tool, capability.input));
    }
  }
  assert.equal(sawModelToolResult, true);
  const evidence = path.join(root, ".openquantum/candidate-tools-evidence");
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "harness-session.json"), JSON.stringify({ verifiedAt: new Date().toISOString(), model: "local protocol fixture", externalModelTested: false, sessionId, events }, null, 2));
});
