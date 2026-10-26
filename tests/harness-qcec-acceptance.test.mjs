import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { harnessHttpCookie, harnessSessionSnapshot, redactHarnessLaunchTokens } from "../scripts/lib/harness-http-auth.mjs";
import { preparePythonFixture } from "./helpers/prepared-python.mjs";
import { parseScientificToolResult, QUANTUM_CIRCUIT_VERIFICATION_TOOL as TOOL } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-protocol.mjs";
import { loadCapability, loadResultPackage, loadAcceptanceReport, validateResultCommitValue } from "../.agents/skill-contracts/index.mjs";

const realBridge = process.env.OPENQUANTUM_REAL_QCEC_DELIVERY === "1";
const qasm = 'OPENQASM 2.0; include "qelib1.inc"; qreg q[1]; h q[0];';
async function listen(server) {
  server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port;
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit"); child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  try { await exited; } finally { clearTimeout(timer); }
}

test("real Harness persists QCEC Acceptance before the model finishes and replays it after restart", {
  timeout: 120000,
  skip: process.platform === "win32" && !realBridge ? "The protocol fixture uses a POSIX shebang" : false,
}, async t => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-qcec-harness-"));
  const harnessHome = path.join(sandbox, "dsh"), workspace = path.join(sandbox, "workspace");
  let child, logs = "", cookie, stage = 0, presentation, reportPath, readAfterRestart = false;
  const modelErrors = [];
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    let call, finish = "stop";
    try {
      if (body.tools?.some(tool => tool.function?.name === TOOL)) {
        const replies = body.messages.filter(message => message.role === "tool");
        if (stage === 0) {
          stage = 1;
          call = { id: "qcec-audit-call", name: TOOL, args: { circuitAOpenQasm2: qasm, circuitBOpenQasm2: qasm } };
        } else if (stage === 1) {
          stage = 2;
          const text = replies.find(message => message.tool_call_id === "qcec-audit-call")?.content;
          presentation = parseScientificToolResult(TOOL, text);
          assert.equal(presentation?.acceptanceStatus, "passed", text);
          reportPath = presentation.details.find(item => item.label === "可读验收报告").value;
          assert.match(await readFile(path.join(workspace, reportPath), "utf8"), /判定复核状态：`passed`/);
          // File delivery and Acceptance cannot depend on final model prose.
          finish = "length";
        } else if (!replies.some(message => message.tool_call_id === "qcec-report-read")) {
          call = { id: "qcec-report-read", name: "read", args: { file_path: reportPath, offset: 1, limit: 50 } };
        } else {
          assert.match(String(replies.find(message => message.tool_call_id === "qcec-report-read").content), /passed/);
          readAfterRestart = true;
        }
      }
    } catch (error) { modelErrors.push(error.message); }
    const delta = call ? { role: "assistant", tool_calls: [{ index: 0, id: call.id, type: "function", function: { name: call.name, arguments: JSON.stringify(call.args) } }] }
      : { role: "assistant", content: "Controlled QCEC delivery response." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const choice of [{ delta, finish_reason: null }, { delta: {}, finish_reason: call ? "tool_calls" : finish }]) {
      response.write(`data: ${JSON.stringify({ id: "qcec-fixture", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, ...choice }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })}\n\n`);
    }
    response.end("data: [DONE]\n\n");
  });
  t.after(async () => { await stop(child); model.closeAllConnections(); await new Promise(resolve => model.close(resolve)); await rm(sandbox, { recursive: true, force: true }); });
  await mkdir(workspace);
  let prepared = {};
  if (!realBridge) {
    const executable = path.join(sandbox, "fixture-python");
    await writeFile(executable, `#!${process.execPath}
const {createHash}=require('node:crypto');
let input=''; process.stdin.on('data',c=>input+=c);
process.stdin.on('end',()=>{
  const r=JSON.parse(input), hash=s=>createHash('sha256').update(s).digest('hex');
  const result = r.action === 'verify'
    ? {schemaVersion:'1.0',packageVersion:'3.10.0',inputDigests:{circuitA:hash(r.circuitA),circuitB:hash(r.circuitB)},equivalence:'equivalent',statistics:{preprocessingSeconds:0,checkSeconds:0.002,performedSimulations:0,performedInstantiations:0,checkers:[]},timeoutSeconds:0}
    : {schemaVersion:'1.0',engine:{name:'qiskit',version:'2.5.2'},inputDigests:{circuitA:hash(r.circuitAOpenQasm2),circuitB:hash(r.circuitBOpenQasm2)},maxDenseQubits:8,mode:'input-identity',qubits:1,unitaryDomainChecked:true,strictResidual:0,globalPhaseResidual:0,phase:{real:1,imag:0}};
  process.stdout.write(JSON.stringify(result));
});
`);
    await chmod(executable, 0o755);
    prepared = await preparePythonFixture({ root, sandbox, id: "quantum-circuit-verification", executable });
  }
  const modelPort = await listen(model), reserved = createServer(), port = await listen(reserved);
  await new Promise(resolve => reserved.close(resolve));
  const { presetTarget } = await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome });
  const presetPath = path.join(presetTarget, "agent.cordis.yml");
  const preset = (await readFile(presetPath, "utf8")).split(/(?=^- id: )/m).filter(block => {
    const id = block.match(/^- id: (.+)$/m)?.[1];
    return !id?.startsWith("mcp-") || id === "mcp-quantum-circuit-verification";
  }).join("");
  await writeFile(presetPath, preset);
  const base = `http://127.0.0.1:${port}`;
  function start() {
    logs = ""; cookie = undefined;
    child = spawn(process.execPath, [path.join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--host", "127.0.0.1", "--port", String(port)], {
      cwd: root, env: { ...process.env, ...prepared, DSH_HOME: harnessHome, DSH_TELEMETRY_DISABLED: "1", DSH_TELEMETRY_MODE: "DISABLED", OPENQUANTUM_DISABLE_QISKIT_MCP: "1", OPENQUANTUM_PUBLIC_API_KEY: "local-fixture-only", OPENQUANTUM_PUBLIC_BASE_URL: `http://127.0.0.1:${modelPort}/v1` },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { logs = (logs + chunk).slice(-16000); });
  }
  async function rpc(method, payload = {}) {
    cookie ??= await harnessHttpCookie(base, logs);
    const response = await fetch(`${base}/api/${method}`, { method: "POST", headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "client-request", rpcId: randomUUID(), method, payload }), signal: AbortSignal.timeout(10000) });
    const result = (await response.json()).result;
    assert.equal(result.ok, true, JSON.stringify(result)); return result.value;
  }
  async function waitFor(probe) {
    const deadline = Date.now() + 40000;
    let last;
    while (Date.now() < deadline) {
      try { const result = await probe(); if (result) return result; } catch (error) { last = error.message; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`${last ?? "Timed out"}\n${redactHarnessLaunchTokens(logs)}`);
  }
  start(); await waitFor(() => rpc("llm.models"));
  const sessionId = `qcec-acceptance-${randomUUID()}`;
  await rpc("session.create", { sessionId, cwd: workspace, agentPreset: "openquantum" });
  await rpc("session.prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Verify the circuit and save its scientific report." }] });
  const first = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 200);
    return snapshot.records.some(record => record.event?.type === "turn/end") && snapshot;
  });
  assert.deepEqual(modelErrors, []);
  assert.ok(presentation?.resultCommit, redactHarnessLaunchTokens(logs));
  const reportBefore = await readFile(path.join(workspace, reportPath), "utf8");
  const events = first.records.map(record => record.event);
  const results = events.filter(event => event.type === "tool/result" && event.data.message.source.callId === "qcec-audit-call");
  assert.equal(results.length, 2, JSON.stringify(events.map(event => ({ type: event.type, dataKeys: Object.keys(event.data) }))));
  const [resultEvent, replacement] = results;
  assert.equal(resultEvent.surfaceOp, "append");
  assert.equal(parseScientificToolResult(TOOL, resultEvent.data.message.content[0].content[0].text).scientificStatus, "observations_available");
  assert.deepEqual(replacement.surfaceOp, { op: "replace", start: resultEvent.seq, end: resultEvent.seq });
  assert.deepEqual(replacement.sourceEventSeqs, [resultEvent.seq]);
  assert.equal(parseScientificToolResult(TOOL, replacement.data.message.content[0].content[0].text).acceptanceStatus, "passed");
  assert.ok(replacement.seq < events.find(event => event.type === "turn/end").seq);
  const capability = await loadCapability(path.join(root, ".agents/skills/quantum-circuit-verification"));
  const commit = presentation.resultCommit;
  const resultPackage = loadResultPackage(path.join(workspace, commit.resultPackage.path), capability);
  const acceptanceReport = loadAcceptanceReport(path.join(workspace, commit.acceptanceReport.path), capability, resultPackage);
  assert.deepEqual(resultPackage.value.executionRef, { sessionId, eventRange: {
    from: events.find(event => event.type === "tool/call" && event.data.callId === "qcec-audit-call").seq, to: resultEvent.seq,
  } });
  assert.deepEqual(validateResultCommitValue(commit, { capability, resultPackage, acceptanceReport, artifactRoot: workspace }), []);
  await stop(child); start(); await waitFor(() => rpc("llm.models"));
  const replay = await harnessSessionSnapshot(base, cookie, sessionId, 200);
  assert.deepEqual(replay.records.filter(record => record.event?.type === "tool/result"), first.records.filter(record => record.event?.type === "tool/result"));
  await rpc("session.prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Read the existing report without recomputing." }] });
  const resumed = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 200);
    return snapshot.records.filter(record => record.event?.type === "turn/end").length === 2 && snapshot;
  });
  assert.deepEqual(modelErrors, []);
  assert.equal(readAfterRestart, true);
  assert.equal(resumed.records.filter(record => record.event?.type === "tool/call" && record.event.data.name === TOOL).length, 1);
  assert.equal(await readFile(path.join(workspace, reportPath), "utf8"), reportBefore);
});
