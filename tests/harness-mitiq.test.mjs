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

const CASES = ["zne", "rem", "pec", "cdr"].map(method => ({
  id: "mitiq-error-mitigation", server: "mitiq_local", tool: "run_mitiq_experiment",
  input: { method, replicates: 4, shotsBudget: 1024, ...(method === "rem" ? { readoutProbability: 0.1 } : {}), ...(method === "pec" ? { pecSamples: 16 } : {}) },
}));
const enabled = process.env.OPENQUANTUM_REAL_MITIQ === "1";
const toolNames = CASES.map(c => `mcp__${c.server}__${c.tool}`);
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

test("Harness loads the Mitiq Skill, runs all four real methods and rereads their persisted results", { skip: !enabled, timeout: 600000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-mitiq-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  let sawModelToolResult = false;
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    sawModelToolResult ||= body.messages?.some((message) => message.role === "tool");
    // Harness may also request a session title; that request must not consume a case.
    const completed = new Set(body.messages?.filter(message => message.role === "tool").map(message => message.tool_call_id));
    const index = CASES.findIndex((_, i) => !completed.has(`mitiq-fixture-${i}`));
    const initial = index >= 0 && body.tools?.some(tool => tool.function?.name === toolNames[0]);
    const delta = initial ? { role: "assistant", tool_calls: [{ index: 0, id: `mitiq-fixture-${index}`, type: "function", function: { name: toolNames[index], arguments: JSON.stringify(CASES[index].input) } }] } : { role: "assistant", content: "Four local Mitiq methods completed; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const item of [
      { choices: [{ index: 0, delta, finish_reason: null }] },
      { choices: [{ index: 0, delta: {}, finish_reason: initial ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } },
    ]) response.write(`data: ${JSON.stringify({ id: "mitiq-fixture", object: "chat.completion.chunk", created: 1, model: body.model, ...item })}\n\n`);
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
  const sessionId = `session-mitiq-${crypto.randomUUID()}`;
  await rpc("session/create", { sessionId, cwd: root, agentPreset: "openquantum" });
  const skillList = await rpc("skills/list", { sessionId });
  for (const c of CASES) assert.ok(skillList.skills.some(skill => skill.name === c.id && skill.modelInvocable), c.id);
  await rpc("session/prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Run the four bounded Mitiq cases and return their actual evidence." }] });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 500);
    return snapshot.records.some((entry) => entry.event?.type === "turn/end") && snapshot;
  }, "completed Mitiq Harness turn", 540000);
  const events = history.records.map((entry) => entry.event);
  const evidence = path.join(root, ".openquantum/mitiq-evidence");
  await mkdir(evidence, { recursive: true });
  const captured = { verifiedAt: new Date().toISOString(), model: "local protocol fixture", externalModelTested: false, sessionId, events };
  await writeFile(path.join(evidence, "harness-session.json"), JSON.stringify({ testStatus: "captured-before-assertions", ...captured }, null, 2));
  for (const [index, capability] of CASES.entries()) {
    const call = events.filter(event => event.type === "tool/call" && JSON.stringify(event).includes(toolNames[index]))[index];
    assert.ok(call, `${capability.id}: missing call\n${redactHarnessLaunchTokens(logs)}`);
    const result = events.find(event => event.type === "tool/result" && JSON.stringify(event).includes(`mitiq-fixture-${index}`));
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
  }
  assert.equal(sawModelToolResult, true);
  const reread = await harnessSessionSnapshot(base, cookie, sessionId, 500);
  assert.deepEqual(reread.records.filter(entry => entry.event?.type === "tool/result").map(entry => entry.event), events.filter(event => event.type === "tool/result"));
  await writeFile(path.join(evidence, "harness-session.json"), JSON.stringify({ testStatus: "passed", ...captured }, null, 2));
});
