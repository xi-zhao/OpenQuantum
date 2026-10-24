import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { harnessHttpCookie, harnessSessionSnapshot, redactHarnessLaunchTokens } from "../scripts/lib/harness-http-auth.mjs";
import { preparePythonFixture } from "./helpers/prepared-python.mjs";
import { scienceResultFixture } from "./fixtures/science-result.mjs";

const TOOL = "mcp__pennylane_local__differentiate_pennylane_circuit";
const hash = value => createHash("sha256").update(value).digest("hex");
async function listen(server) {
  server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port;
}
async function waitFor(probe, diagnostics) {
  const deadline = Date.now() + 45000;
  let last;
  while (Date.now() < deadline) {
    try { const result = await probe(); if (result) return result; } catch (error) { last = error.message; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`${last ?? "Timed out"}\n${diagnostics()}`);
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  await exited; clearTimeout(timer);
}

test("real Harness/MCP delivery reaches model context, native file read and process restart without recomputation", {
  timeout: 120000,
  skip: process.platform === "win32" ? "The numerical protocol fixture uses a POSIX shebang; Windows execution is not covered" : false,
}, async t => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-result-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  const workspace = path.join(sandbox, "workspace");
  await mkdir(workspace);
  const large = scienceResultFixture();
  const small = scienceResultFixture(2);
  const counter = path.join(sandbox, "worker-calls.txt");
  const executable = path.join(sandbox, "fixture-worker");
  await writeFile(executable, `#!${process.execPath}\nconst fs=require('node:fs');let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>{const r=JSON.parse(data);fs.appendFileSync(${JSON.stringify(counter)},'call\\n');const v=r.input.numQubits===2?${JSON.stringify(small)}:${JSON.stringify(large)};process.stdout.write(JSON.stringify({...v,input:r.input,inputSha256:r.inputSha256,dependencyLockSha256:r.dependencyLockSha256,source:r.source}));});\n`);
  await chmod(executable, 0o755);
  const prepared = await preparePythonFixture({ root, sandbox, id: "pennylane-differentiable", executable });
  let child, logs = "", cookie, restarting = false, fullResult, sawRead = false, sawSmall = false, sawRestartRead = false;
  const modelErrors = [];
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const replies = new Map(body.messages?.filter(message => message.role === "tool").map(message => [message.tool_call_id, message.content]));
    let call;
    try {
      if (body.tools?.some(tool => tool.function?.name === TOOL)) {
        if (restarting) {
          if (!replies.has("delivery-restart-read")) call = { id: "delivery-restart-read", name: "read", args: { file_path: fullResult.path, offset: 1, limit: 35 } };
          else { assert.match(String(replies.get("delivery-restart-read")), /schemaVersion/); sawRestartRead = true; }
        } else if (!replies.has("delivery-large")) call = { id: "delivery-large", name: TOOL, args: large.input };
        else {
          const text = replies.get("delivery-large");
          assert.equal(typeof text, "string");
          assert.ok(text.length < 8192);
          const presentation = JSON.parse(text);
          assert.equal(presentation.kind, "openquantum-science-summary");
          assert.deepEqual(presentation.summary.result.expectations, large.result.expectations);
          assert.deepEqual(presentation.summary.result.jacobian, large.result.jacobian);
          assert.equal(presentation.summary.scientificValidation, "not_evaluated");
          fullResult = presentation.fullResult;
          if (!replies.has("delivery-read")) call = { id: "delivery-read", name: "read", args: { file_path: fullResult.path, offset: 1, limit: 35 } };
          else {
            assert.match(String(replies.get("delivery-read")), /schemaVersion/); sawRead = true;
            if (!replies.has("delivery-small")) call = { id: "delivery-small", name: TOOL, args: small.input };
            else { assert.deepEqual(JSON.parse(replies.get("delivery-small")).result, small.result); sawSmall = true; }
          }
        }
      }
    } catch (error) { modelErrors.push(error.message); }
    const delta = call ? { role: "assistant", tool_calls: [{ index: 0, id: call.id, type: "function", function: { name: call.name, arguments: JSON.stringify(call.args) } }] }
      : { role: "assistant", content: "Delivery protocol fixture complete; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const choice of [{ delta, finish_reason: null }, { delta: {}, finish_reason: call ? "tool_calls" : "stop" }]) {
      response.write(`data: ${JSON.stringify({ id: "delivery-fixture", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, ...choice }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })}\n\n`);
    }
    response.end("data: [DONE]\n\n");
  });
  t.after(async () => { await stop(child); model.closeAllConnections(); await new Promise(resolve => model.close(resolve)); await rm(sandbox, { recursive: true, force: true }); });
  const modelPort = await listen(model);
  const reserved = createServer(); const port = await listen(reserved); await new Promise(resolve => reserved.close(resolve));
  const { presetTarget } = await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome });
  const presetPath = path.join(presetTarget, "agent.cordis.yml");
  const preset = (await readFile(presetPath, "utf8")).split(/(?=^- id: )/m).filter(block => {
    const id = block.match(/^- id: (.+)$/m)?.[1];
    return !id?.startsWith("mcp-") || id === "mcp-pennylane-differentiable";
  }).join("");
  assert.match(preset, /id: science-result-delivery/);
  assert.match(preset, /serverName: pennylane_local/);
  await writeFile(presetPath, preset);
  const base = `http://127.0.0.1:${port}`;
  const diagnostics = () => redactHarnessLaunchTokens(logs);
  function start() {
    logs = ""; cookie = undefined;
    child = spawn(process.execPath, [path.join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--host", "127.0.0.1", "--port", String(port)], {
      cwd: root, env: { ...process.env, ...prepared, DSH_HOME: harnessHome, DSH_TELEMETRY_DISABLED: "1", DSH_TELEMETRY_MODE: "DISABLED", OPENQUANTUM_DISABLE_QISKIT_MCP: "1", OPENQUANTUM_PUBLIC_API_KEY: "local-fixture-only", OPENQUANTUM_PUBLIC_BASE_URL: `http://127.0.0.1:${modelPort}/v1` }, stdio: ["ignore", "pipe", "pipe"],
    });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { logs = (logs + chunk).slice(-16000); });
  }
  async function rpc(method, payload = {}) {
    cookie ??= await harnessHttpCookie(base, logs);
    const response = await fetch(`${base}/api/${method}`, { method: "POST", headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "client-request", rpcId: crypto.randomUUID(), method, payload }), signal: AbortSignal.timeout(15000) });
    const result = (await response.json()).result;
    assert.equal(result.ok, true, JSON.stringify(result)); return result.value;
  }
  start();
  await waitFor(() => rpc("llm.models"), diagnostics);
  const sessionId = `science-delivery-${crypto.randomUUID()}`;
  await rpc("session.create", { sessionId, cwd: workspace, agentPreset: "openquantum" });
  await rpc("session.prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Run delivery protocol fixtures and read the saved result." }] });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 200);
    return snapshot.records.some(entry => entry.event?.type === "turn/end") && snapshot;
  }, diagnostics);
  assert.deepEqual(modelErrors, []);
  assert.equal(sawRead, true, diagnostics());
  assert.equal(sawSmall, true);
  const saved = await readFile(path.join(workspace, fullResult.path), "utf8");
  assert.deepEqual(JSON.parse(saved).result, large.result);
  assert.equal(hash(saved), fullResult.sha256);
  assert.equal(Buffer.byteLength(saved), fullResult.bytes);
  const toolEvents = snapshot => snapshot.records.filter(entry => entry.event?.type === "tool/result").map(entry => entry.event);
  const originalEvents = toolEvents(history);
  const callCount = await readFile(counter, "utf8");
  assert.equal(callCount.split("call\n").length - 1, 2);
  await stop(child); restarting = true; start();
  await waitFor(() => rpc("llm.models"), diagnostics);
  const replay = await harnessSessionSnapshot(base, cookie, sessionId, 200);
  assert.deepEqual(toolEvents(replay), originalEvents);
  await rpc("session.prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Read the existing saved result after restart." }] });
  await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 200);
    return snapshot.records.filter(entry => entry.event?.type === "turn/end").length === 2 && snapshot;
  }, diagnostics);
  assert.deepEqual(modelErrors, []);
  assert.equal(sawRestartRead, true);
  assert.equal(await readFile(counter, "utf8"), callCount, "Restart must not recalculate scientific data");
  assert.equal(await readFile(path.join(workspace, fullResult.path), "utf8"), saved);
});
