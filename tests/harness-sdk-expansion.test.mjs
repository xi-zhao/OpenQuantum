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

import { SDK_EXPANSION_CIRCUITS } from "./fixtures/sdk-expansion-circuits.mjs";
import { SDK_EXPANSION_RESOURCES } from "./fixtures/sdk-expansion-resources.mjs";
import { SDK_EXPANSION_CLOUD_CONTROL, SDK_EXPANSION_CLOUD_CONTROL_AUTH } from "./fixtures/sdk-expansion-cloud-control.mjs";
import { SDK_EXPANSION_IO } from "./fixtures/sdk-expansion-io.mjs";
const enabled = process.env.OPENQUANTUM_REAL_SDK_EXPANSION === "1";
const SDK_EXPANSION = [...SDK_EXPANSION_CIRCUITS, ...SDK_EXPANSION_RESOURCES, ...SDK_EXPANSION_CLOUD_CONTROL, ...SDK_EXPANSION_IO];
const CASES = [...SDK_EXPANSION,
  ...SDK_EXPANSION_CLOUD_CONTROL_AUTH.map(c => ({ ...c, expectError: true, errorPattern: c.expectedError })),
  { ...SDK_EXPANSION[0], id: "sdk-invalid", input: { numQubits: 1, gates: [{ gate: "CX", targets: [0, 0] }] }, expectError: true, errorPattern: "targets" },
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

test("Harness discovers 20 SDK Skills, executes local SDK actions and persists unconfigured-service failures", { skip: !enabled, timeout: 900000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-sdk-expansion-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  let sawModelToolResult = false;
  const modelBatches = [];
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    sawModelToolResult ||= body.messages?.some((message) => message.role === "tool");
    // Small deterministic batches exercise the real scheduler without oversubscribing numerical libraries.
    // The host can also ask this provider to name the session. Derive progress from
    // actual tool replies so those independent requests cannot consume test cases.
    const batchStart = body.messages?.filter(message => message.role === "tool" && message.tool_call_id?.startsWith("expansion-fixture-")).length ?? 0;
    const isAgentRequest = body.tools?.some(tool => toolNames.includes(tool.function?.name));
    const batch = isAgentRequest ? CASES.slice(batchStart, batchStart + 3) : [];
    const initial = batch.length > 0;
    modelBatches.push({ start: batchStart, count: batch.length, toolResults: body.messages?.filter(message => message.role === "tool").length });
    const delta = initial ? { role: "assistant", tool_calls: batch.map((c, index) => ({ index, id: `expansion-fixture-${batchStart + index}`, type: "function", function: { name: toolNames[batchStart + index], arguments: JSON.stringify(c.input) } })) } : { role: "assistant", content: "Local SDK actions and explicit configuration failures recorded; scientificValidation=not_evaluated." };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const item of [
      { choices: [{ index: 0, delta, finish_reason: null }] },
      { choices: [{ index: 0, delta: {}, finish_reason: initial ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } },
    ]) response.write(`data: ${JSON.stringify({ id: "sdk-expansion-fixture", object: "chat.completion.chunk", created: 1, model: body.model, ...item })}\n\n`);
    response.end("data: [DONE]\n\n");
  });
  const modelPort = await listen(model);
  const reserved = createServer(); const port = await listen(reserved); await new Promise((resolve) => reserved.close(resolve));
  const { presetTarget } = await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome });
  const presetPath = path.join(presetTarget, "agent.cordis.yml");
  let preset = await readFile(presetPath, "utf8");
  // Keep the actual product entries for these 20 connections, opt in explicitly only in this test home.
  // Other MCP processes are excluded from this focused E2E; full composition is checked separately.
  const ids = new Set(SDK_EXPANSION.map(c => `mcp-${c.id}`));
  preset = preset.split(/(?=^- id: )/m).filter(block => {
    const id = block.match(/^- id: (.+)$/m)?.[1];
    return !id?.startsWith("mcp-") || ids.has(id);
  }).map(block => ids.has(block.match(/^- id: (.+)$/m)?.[1]) ? block.replace(/^ {2}disabled: true\n/m, "") : block).join("");
  await writeFile(presetPath, preset);
  let logs = "";
  const child = spawn(process.execPath, [path.join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--no-open", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root, env: { ...process.env, DSH_HOME: harnessHome, DSH_TELEMETRY_DISABLED: "1", OPENQUANTUM_DISABLE_QISKIT_MCP: "1", OPENQUANTUM_PUBLIC_API_KEY: "local-fixture-only", QCPORTAL_ADDRESS: "", QCPORTAL_USERNAME: "", QCPORTAL_PASSWORD: "", CLASSIQ_XCH_TOKEN: "", QCTRL_API_KEY: "", OPENQUANTUM_PUBLIC_BASE_URL: `http://127.0.0.1:${modelPort}/v1` },
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
    const response = await fetch(`${base}/api/${method}`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ type: "client-request", rpcId: crypto.randomUUID(), method, payload: { args: method === "session/modelCatalog" ? {} : { request: payload } } }), signal: AbortSignal.timeout(method === "session/create" ? 30000 : 5000) });
    const result = (await response.json()).result;
    assert.equal(result.ok, true, `${JSON.stringify(result)}\n${redactHarnessLaunchTokens(logs)}`);
    return result.value;
  }
  await waitFor(() => rpc("session/modelCatalog"), "Harness startup");
  const sessionId = `session-sdk-expansion-${crypto.randomUUID()}`;
  await rpc("session/create", { sessionId, cwd: root, agentPreset: "openquantum" });
  const skillList = await rpc("skills/list", { sessionId });
  for (const c of SDK_EXPANSION) assert.ok(skillList.skills.some(skill => skill.name === c.id && skill.modelInvocable), c.id);
  await rpc("session/prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "Run the fixed SDK expansion cases locally and verify the explicit missing-configuration and input errors, returning actual evidence." }] });
  const history = await waitFor(async () => {
    const snapshot = await harnessSessionSnapshot(base, cookie, sessionId, 500);
    return snapshot.records.some((entry) => entry.event?.type === "turn/end") && snapshot;
  }, "completed SDK expansion Harness turn", 840000);
  const events = history.records.map((entry) => entry.event);
  const evidence = path.join(root, ".openquantum/sdk-expansion-evidence/harness");
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "harness-session.json"), JSON.stringify({ verifiedAt: new Date().toISOString(), model: "local protocol fixture", externalModelTested: false, sessionId, modelBatches, events }, null, 2));
  for (const [index, capability] of CASES.entries()) {
    const call = events.find(event => event.type === "tool/call" && JSON.stringify(event).includes(toolNames[index]));
    assert.ok(call, `${capability.id}: missing call\n${redactHarnessLaunchTokens(logs)}`);
    const result = events.find(event => event.type === "tool/result" && JSON.stringify(event).includes(`expansion-fixture-${index}`));
    assert.ok(result, `${capability.id}: missing result`);
    const serialized = JSON.stringify(result);
    const block = result.data.message.content.find(item => item.type === "tool-result");
    if (capability.expectError) {
      assert.equal(block.isError, true);
      assert.match(serialized, new RegExp(capability.errorPattern));
      continue;
    }
    assert.match(serialized, /not_evaluated/);
    assert.match(serialized, capability.server ? /dependencyLockSha256/ : /snapshotSha256/);
    assert.doesNotMatch(serialized, /"isError":true/);
    assert.equal(block.isError, false);
    const output = JSON.parse(block.content.find(item => item.type === "text").text);
    if (capability.server) {
      const module = await import(`../.agents/skills/${capability.id}/mcp/contracts.mjs`);
      const definition = (module.definitions ?? [module.definition]).find(value => value.tool.name === capability.tool);
      assert.ok(definition.validateOutput(output), `${capability.id}: invalid persisted result`);
      assert.deepEqual(output.input, definition.normalize(capability.tool, capability.input));
    }
  }
  assert.equal(sawModelToolResult, true);
});
