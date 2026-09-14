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

import { PAPER_TOOLS } from "./fixtures/paper-tools.mjs";
import { SCALABLE_BRIDGES } from "./fixtures/scalable-bridges.mjs";
const scalable = process.env.OPENQUANTUM_REAL_SCALABLE_BRIDGES === "1";
const cases = scalable ? SCALABLE_BRIDGES : PAPER_TOOLS;
const enabled = scalable || process.env.OPENQUANTUM_REAL_PAPER_TOOLS === "1";
const toolNames = cases.map(c => `mcp__${c.server}__${c.tool}`);
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

test("Harness loads Skills, dispatches real scientific tools and persists each result", { skip: !enabled, timeout: 600000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-paper-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  let dispatched = false;
  let sawModelToolResult = false;
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    sawModelToolResult ||= body.messages?.some((message) => message.role === "tool");
    const initial = !dispatched;
    dispatched = true;
    const delta = initial ? { role: "assistant", tool_calls: cases.map((c, index) => ({ index, id: `paper-fixture-${index}`, type: "function", function: { name: toolNames[index], arguments: JSON.stringify(c.input) } })) } : { role: "assistant", content: "Local scientific experiments completed; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const item of [
      { choices: [{ index: 0, delta, finish_reason: null }] },
      { choices: [{ index: 0, delta: {}, finish_reason: initial ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } },
    ]) response.write(`data: ${JSON.stringify({ id: "paper-tools-fixture", object: "chat.completion.chunk", created: 1, model: body.model, ...item })}\n\n`);
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
  const sessionId = `session-paper-${crypto.randomUUID()}`;
  await rpc("session/create", { sessionId, cwd: root, agentPreset: "openquantum" });
  const skillList = await rpc("skills/list", { sessionId });
  for (const c of cases) assert.ok(skillList.skills.some(skill => skill.name === c.id && skill.modelInvocable), c.id);
  await rpc("session/prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Run the fixed scientific tool cases and return their actual evidence." }] });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 500);
    return snapshot.records.some((entry) => entry.event?.type === "turn/end") && snapshot;
  }, "completed paper-tools Harness turn", 540000);
  const events = history.records.map((entry) => entry.event);
  for (const [index, capability] of cases.entries()) {
    const call = events.find(event => event.type === "tool/call" && JSON.stringify(event).includes(toolNames[index]));
    assert.ok(call, `${capability.id}: missing call\n${redactHarnessLaunchTokens(logs)}`);
    const result = events.find(event => event.type === "tool/result" && JSON.stringify(event).includes(`paper-fixture-${index}`));
    assert.ok(result, `${capability.id}: missing result`);
    const serialized = JSON.stringify(result);
    assert.match(serialized, /not_evaluated/);
    assert.match(serialized, /dependencyLockSha256/);
    assert.doesNotMatch(serialized, /"isError":true/);
    const block = result.data.message.content.find(item => item.type === "tool-result");
    assert.equal(block.isError, false);
    const output = JSON.parse(block.content.find(item => item.type === "text").text);
    const { definition } = await import(`../.agents/skills/${capability.id}/mcp/contracts.mjs`);
    assert.ok(definition.validateOutput(output), `${capability.id}: invalid persisted result`);
    assert.deepEqual(output.input, definition.normalize(capability.tool, capability.input));
    if (scalable) {
      assert.equal(output.result.reference.mode, "auto");
      assert.equal(output.result.reference.status, capability.id === "sqd-chemistry" ? "computed" : "not_run");
      if (capability.id !== "sqd-chemistry") capability.referenceFields.forEach(key => assert.equal(output.result[key], null));
    }
  }
  assert.equal(sawModelToolResult, true);
  const evidence = path.join(root, scalable ? ".openquantum/scalable-bridge-evidence-2026-09-14" : ".openquantum/paper-tools-evidence");
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "harness-session.json"), JSON.stringify({ verifiedAt: new Date().toISOString(), model: "local protocol fixture", externalModelTested: false, sessionId, events }, null, 2));
});
