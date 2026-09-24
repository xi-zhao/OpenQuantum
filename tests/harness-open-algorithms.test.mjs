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
import coverage from "../examples/quantum-algorithms/coverage.json" with { type: "json" };

const toolName = process.platform === "win32" ? "pwsh" : "bash";
function shellQuote(value) {
  return process.platform === "win32"
    ? "'" + value.replaceAll("'", "''") + "'"
    : "'" + value.replaceAll("'", "'\\''") + "'";
}

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

test("Harness discovers all 66 open workflows and executes SDK examples through its existing shell Tool", { skip: process.env.OPENQUANTUM_REAL_ALGORITHMS !== "1", timeout: 120_000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-open-algorithms-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  const python = path.join(root, "examples/quantum-algorithms/.venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const runner = path.join(root, "examples/quantum-algorithms/run.py");
  const prefix = process.platform === "win32" ? "& " : "";
  const run = (algorithm) => `${prefix}${shellQuote(python)} ${shellQuote(runner)} --algorithm ${algorithm}`;
  const skill = shellQuote(path.join(root, ".agents/skills/quantum-hhl/SKILL.md"));
  const fixtureCalls = [
    { id: "open-skill-read", command: process.platform === "win32" ? `Get-Content -Raw ${skill}` : `cat ${skill}` },
    { id: "open-hhl", command: run("hhl") },
    { id: "open-qsvt", command: run("qsvt_qlsa") },
    { id: "open-invalid", command: run("unknown_algorithm") },
  ].map(call => ({ ...call, name: toolName, input: { command: call.command, workdir: root, timeoutMs: 30000, description: "Read and run the open quantum workflow" } }));
  fixtureCalls.unshift(
    { id: "open-leaf-load", name: "skill", input: { name: "quantum-hhl" } },
    { id: "open-category-reject", name: "skill", input: { name: "quantum-guide-algorithms" } },
  );
  let registeredTool;
  let manualNavigationReceived = false;
  const registeredToolNames = new Set();
  let child;
  const deliveredResults = [];
  const model = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    registeredTool ??= body.tools?.find(tool => tool.function?.name === toolName);
    for (const tool of body.tools ?? []) registeredToolNames.add(tool.function.name);
    manualNavigationReceived ||= JSON.stringify(body.messages).includes("分类导航：保留用户显式调用");
    deliveredResults.push(...(body.messages ?? []).filter(message => message.role === "tool"));
    const completed = new Set(deliveredResults.map(message => message.tool_call_id));
    const next = fixtureCalls.find(call => !completed.has(call.id));
    const initial = Boolean(next);
    const delta = next ? {
      role: "assistant",
      tool_calls: [{ index: 0, id: next.id, type: "function", function: { name: next.name, arguments: JSON.stringify(next.input) } }],
    } : { role: "assistant", content: "Open SDK workflows complete; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const choice of [
      { delta, finish_reason: null },
      { delta: {}, finish_reason: initial ? "tool_calls" : "stop" },
    ]) {
      response.write(`data: ${JSON.stringify({ id: "open-algorithms-model-fixture", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, ...choice }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })}\n\n`);
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
  const sessionId = `session-open-algorithms-${crypto.randomUUID()}`;
  await rpc("session/create", { sessionId, cwd: root, agentPreset: "openquantum" });
  const skills = await rpc("skills/list", { sessionId });
  for (const row of coverage.guides) {
    const skill = skills.skills.find(skill => skill.name === row.skill);
    assert.ok(skill, `Existing user-visible Skill must be preserved: ${row.skill}`);
    assert.equal(skill.modelInvocable, row.invocation !== "manual", `${row.skill}: wrong automatic selection policy`);
  }
  await rpc("session/prompt", {
    sessionId, mode: "queue",
    content: [{ type: "text", text: "/quantum-guide-algorithms Read the local HHL Skill, run HHL and QSVT through the existing shell Tool, and report the actual invalid-algorithm failure." }],
  });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 200);
    return snapshot.records.some(entry => entry.event?.type === "turn/end") && snapshot;
  }, "completed open-algorithm workflow", 90000);
  assert.ok(registeredTool, "real Harness request must include the registered Tool");
  assert.equal(registeredTool.function.parameters.properties.command.type, "string");
  const events = history.records.map(entry => entry.event);
  assert.ok(manualNavigationReceived, "Explicit user invocation must still inject the category instructions");
  const catalogNames = events.filter(event => event.type === "user/message" && event.data.source?.kind === "skill-catalog")
    .flatMap(event => event.data.source.entries.map(entry => entry.name));
  assert.ok(catalogNames.includes("quantum-hhl"));
  for (const row of coverage.guides.filter(row => row.invocation === "manual")) {
    assert.ok(!catalogNames.includes(row.skill), `${row.skill}: manual navigation must not clutter the model catalog`);
  }
  const evidence = [];
  for (const call of fixtureCalls) {
    const called = events.find(event => event.type === "tool/call" && JSON.stringify(event).includes(call.id));
    const result = events.find(event => event.type === "tool/result" && JSON.stringify(event).includes(call.id));
    assert.ok(called, `${call.id}: missing persisted call`);
    assert.ok(result, `${call.id}: missing persisted result`);
    const block = result.data.message.content.find(item => item.type === "tool-result");
    const content = block.content.map(item => item.text ?? "").join("\n");
    if (call.id === "open-category-reject") {
      assert.equal(block.isError, true);
      assert.match(content, /not available for model invocation/);
    } else if (call.id === "open-leaf-load") {
      assert.equal(block.isError, false);
      assert.match(content, /--algorithm hhl/);
    } else if (call.id === "open-invalid") {
      assert.match(content, /Unknown algorithm unknown_algorithm/);
      assert.match(content, /exit code: 2/);
    } else if (call.id === "open-skill-read") {
      assert.equal(block.isError, false);
      assert.match(content, /name: quantum-hhl/);
      assert.match(content, /--algorithm hhl/);
    } else {
      assert.equal(block.isError, false);
      const first = content.indexOf('{');
      const last = content.lastIndexOf('}');
      const output = JSON.parse(content.slice(first, last + 1));
      assert.equal(output.algorithm, call.id === "open-hhl" ? "hhl" : "qsvt_qlsa");
      assert.equal(output.scientificValidation, "not_evaluated");
      assert.ok(output.result.referenceFidelity > 0.99);
    }
    assert.ok(deliveredResults.some(message => message.tool_call_id === call.id), `${call.id}: result must return to the model protocol`);
    evidence.push({ call: called, result });
  }
  const replay = await harnessSessionSnapshot(base, cookie, sessionId, 200);
  assert.deepEqual(replay.records.filter(item => item.event?.type === "tool/result").map(item => item.event),
    history.records.filter(item => item.event?.type === "tool/result").map(item => item.event));
  const target = path.join(root, ".openquantum/open-algorithms-harness.json");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify({
    verifiedAt: new Date().toISOString(), harness: "0.1.5-rc.1",
    model: "local protocol fixture", externalModelTested: false,
    skillCount: coverage.guides.length, skills: coverage.guides.map(row => row.skill),
    automaticSkills: coverage.guides.filter(row => row.invocation !== "manual").length,
    manualNavigationReceived, registeredToolNames: [...registeredToolNames].sort(),
    tool: toolName, sessionId, events: evidence,
  }, null, 2) + "\n");
});
