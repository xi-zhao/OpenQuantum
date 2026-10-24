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
import { describeSdk } from "../src/lib/sdk-access.mjs";

async function listen(server) {
  server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port;
}
async function waitFor(probe, description, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const value = await probe(); if (value) return value; } catch (error) { last = error.message; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`${description}: ${last ?? "timed out"}`);
}
const quote = value => process.platform === "win32" ? "'" + value.replaceAll("'", "''") + "'" : "'" + value.replaceAll("'", "'\\''") + "'";

test("Harness discovers Pasqal, executes the real offline pipeline and Pulser Tool, then rereads persisted results", {
  skip: process.env.OPENQUANTUM_REAL_PASQAL !== "1", timeout: 180000,
}, async t => {
  const root = process.cwd();
  const sdk = await describeSdk(root, "pulser-dynamics");
  assert.equal(sdk.environmentState, "prepared");
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-pasqal-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  const skill = path.join(root, ".agents/skills/pasqal-experiments");
  const plan = path.join(sandbox, "plan.json"), raw = path.join(sandbox, "raw.json"), report = path.join(sandbox, "report.json");
  const shellTool = process.platform === "win32" ? "pwsh" : "bash";
  const command = args => `${process.platform === "win32" ? "& " : ""}${[sdk.run.command, "-B", path.join(skill, "scripts/experiment.py"), ...args].map(quote).join(" ")}`;
  const calls = [
    { id: "pasqal-skill", name: "skill", input: { name: "pasqal-experiments" } },
    ...[
      ["prepare", ["prepare", "--spec", path.join(skill, "examples/rabi_spec.json"), "--sequence", path.join(skill, "examples/rabi_sequence.py"), "--out", plan]],
      ["simulate", ["local-run", "--plan", plan, "--out", raw]],
      ["analyze", ["analyze", "--raw", raw, "--sequence", path.join(skill, "examples/rabi_sequence.py"), "--out", report]],
    ].map(([id, args]) => ({ id: `pasqal-${id}`, name: shellTool, input: { command: command(args), workdir: sandbox, timeoutMs: 30000, description: "Run the local Pasqal experiment workflow" } })),
    { id: "pasqal-pulser", name: "mcp__pulser_local__simulate_pulser_rydberg", input: { atomPositionsUm: [[0, 0]], pulses: [{ durationNs: 200, amplitudeRadPerUs: [2, 2], detuningRadPerUs: [0, 0], phaseRad: 0 }], timeSteps: 4 } },
    { id: "pasqal-invalid", name: "mcp__pulser_local__simulate_pulser_rydberg", input: { atomPositionsUm: [[0, 0], [0, 0]] } },
  ];
  let logs = "", child;
  const delivered = new Set();
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    for (const item of body.messages ?? []) if (item.role === "tool") delivered.add(item.tool_call_id);
    // Auxiliary title/summary requests must not consume fixture actions.
    const actionable = body.tools?.some(tool => tool.function.name === shellTool);
    const next = actionable && calls.find(call => !delivered.has(call.id));
    const delta = next ? { role: "assistant", tool_calls: [{ index: 0, id: next.id, type: "function", function: { name: next.name, arguments: JSON.stringify(next.input) } }] }
      : { role: "assistant", content: "Local Pasqal workflow finished; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const choice of [{ delta, finish_reason: null }, { delta: {}, finish_reason: next ? "tool_calls" : "stop" }]) {
      response.write(`data: ${JSON.stringify({ id: "pasqal-fixture", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, ...choice }] })}\n\n`);
    }
    response.end("data: [DONE]\n\n");
  });
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit"); child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000); await exited; clearTimeout(timer);
    }
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
    await rm(sandbox, { recursive: true, force: true });
  });
  const modelPort = await listen(model);
  const reserved = createServer(), port = await listen(reserved); await new Promise(resolve => reserved.close(resolve));
  await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome });
  child = spawn(process.execPath, [path.join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root, env: { ...process.env, DSH_HOME: harnessHome, DSH_TELEMETRY_DISABLED: "1", OPENQUANTUM_DISABLE_QISKIT_MCP: "1", OPENQUANTUM_PUBLIC_API_KEY: "local-fixture-only", OPENQUANTUM_PUBLIC_BASE_URL: `http://127.0.0.1:${modelPort}/v1` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { logs = (logs + chunk).slice(-24000); });
  const base = `http://127.0.0.1:${port}`;
  let cookie;
  async function rpc(method, payload = {}) {
    cookie ??= await harnessHttpCookie(base, logs);
    const response = await fetch(`${base}/api/${method}`, { method: "POST", headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "client-request", rpcId: crypto.randomUUID(), method, payload }), signal: AbortSignal.timeout(method === "session.create" ? 30000 : 5000) });
    const result = (await response.json()).result;
    assert.equal(result.ok, true, `${JSON.stringify(result)}\n${redactHarnessLaunchTokens(logs)}`);
    return result.value;
  }
  await waitFor(() => rpc("llm.models"), "Harness startup");
  const sessionId = `session-pasqal-${crypto.randomUUID()}`;
  await rpc("session.create", { sessionId, cwd: root, agentPreset: "openquantum" });
  const catalog = await rpc("skill.list", { sessionId });
  assert.ok(catalog.skills.some(skill => skill.name === "pasqal-experiments" && skill.modelInvocable));
  await rpc("session.prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Run the local Pasqal fixture pipeline and Pulser regression, preserving actual results and the rejected input." }] });
  const history = await waitFor(async () => {
    const data = await harnessSessionSnapshot(base, cookie, sessionId, 400);
    return data.records.some(row => row.event?.type === "turn/end") && data;
  }, "Pasqal Harness workflow", 120000);
  const events = history.records.map(row => row.event);
  for (const call of calls) {
    const result = events.find(event => event.type === "tool/result" && JSON.stringify(event).includes(call.id));
    assert.ok(result, `${call.id}: missing persisted result\n${redactHarnessLaunchTokens(logs)}`);
    const block = result.data.message.content.find(item => item.type === "tool-result");
    assert.equal(block.isError, call.id === "pasqal-invalid", JSON.stringify(block));
    assert.ok(delivered.has(call.id));
  }
  assert.equal(JSON.parse(await readFile(report, "utf8")).complete, true);
  const replay = await harnessSessionSnapshot(base, cookie, sessionId, 400);
  assert.deepEqual(replay.records.filter(row => row.event?.type === "tool/result"), history.records.filter(row => row.event?.type === "tool/result"));
  const evidence = path.join(root, ".openquantum/pasqal-evidence");
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "harness-session.json"), JSON.stringify({ model: "local protocol fixture", externalModelTested: false, sessionId, events }, null, 2));
  for (const [name, file] of [["ideal-plan.json", plan], ["ideal-raw.json", raw], ["ideal-analysis.json", report]]) {
    await writeFile(path.join(evidence, name), await readFile(file));
  }
});
