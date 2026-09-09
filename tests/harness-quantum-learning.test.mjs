import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { fixtureResponses, requirements } from "./fixtures/quantum-learning.mjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function listen(server) { server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port; }
async function waitFor(fn, description) {
  const deadline = Date.now() + 45_000;
  let last;
  while (Date.now() < deadline) {
    try { const result = await fn(); if (result) return result; } catch (error) { last = error.message; }
    await delay(100);
  }
  throw new Error(`${description}: ${last || "timed out"}`);
}

test("native UI/API → Harness Session → OpenMAIC SDK → saved classroom and durable tool result", { timeout: 90_000 }, async (t) => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-learning-harness-"));
  const harnessHome = path.join(sandbox, "dsh");
  const classrooms = path.join(sandbox, "classrooms");
  const answers = fixtureResponses();
  let courseId;
  let sdkCalls = 0;
  const requests = [];
  const model = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    requests.push({ model: body.model, tools: Boolean(body.tools?.length) });
    const initial = body.tools?.some((tool) => tool.function?.name === "generate_quantum_classroom");
    const delta = initial ? { role: "assistant", tool_calls: [{ index: 0, id: "call-classroom-fixture", type: "function", function: { name: "generate_quantum_classroom", arguments: JSON.stringify({ courseId }) } }] } : { role: "assistant", content: answers[sdkCalls++] || "[]" };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const item of [
      { choices: [{ index: 0, delta, finish_reason: null }] },
      { choices: [{ index: 0, delta: {}, finish_reason: initial ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } },
    ]) response.write(`data: ${JSON.stringify({ id: "fixture", object: "chat.completion.chunk", created: 1, model: body.model, ...item })}\n\n`);
    response.end("data: [DONE]\n\n");
  });
  const modelPort = await listen(model);
  const reserved = createServer(); const port = await listen(reserved); await new Promise((resolve) => reserved.close(resolve));
  const prepared = await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome });
  const bundle = await readFile(path.join(prepared.learningTarget, "client.js"), "utf8");
  assert.match(bundle, /@openquantum\/harness-web-learning/);
  assert.ok(bundle.length > 100_000, "actual renderer is bundled");
  let logs = "";
  const child = spawn(process.execPath, [path.join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root, env: { ...process.env, DSH_HOME: harnessHome, DSH_TELEMETRY_DISABLED: "1", OPENQUANTUM_LEARNING_DIR: classrooms,
      OPENQUANTUM_DISABLE_QISKIT_MCP: "1", OPENQUANTUM_PUBLIC_API_KEY: "fixture-only", OPENQUANTUM_PUBLIC_BASE_URL: `http://127.0.0.1:${modelPort}/v1` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { logs = (logs + chunk).slice(-10_000); });
  child.stderr.on("data", (chunk) => { logs = (logs + chunk).slice(-10_000); });
  t.after(async () => {
    if (child.exitCode === null) { const exited = once(child, "exit"); child.kill("SIGTERM"); const timer = setTimeout(() => child.kill("SIGKILL"), 5000); await exited; clearTimeout(timer); }
    await new Promise((resolve) => model.close(resolve));
    await rm(sandbox, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  async function rpc(method, payload = {}) {
    const response = await fetch(`${base}/api/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "client-request", rpcId: crypto.randomUUID(), method, payload }), signal: AbortSignal.timeout(5000) });
    const result = (await response.json()).result;
    assert.equal(result.ok, true, `${JSON.stringify(result)}\n${logs}`);
    return result.value;
  }
  async function command(value) {
    const response = await fetch(`${base}/openquantum/api/learning`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify(value) });
    assert.equal(response.status, 200, logs); return response.json();
  }
  await waitFor(() => rpc("host.describe"), "Harness startup");
  const roster = await rpc("agentPreset.list");
  assert.ok(roster.presets.some((p) => p.id === "quantum-learning"));
  const sessionId = `session-learning-${crypto.randomUUID()}`;
  const course = await command({ action: "create", requirements, sessionId }); courseId = course.id;
  await rpc("session.create", { sessionId, agentPreset: "quantum-learning" });
  await rpc("session.rename", { sessionId, title: "OpenMAIC integration fixture" });
  await rpc("session.prompt", { sessionId, mode: "queue", content: [{ type: "text", text: `Generate courseId=${course.id}` }] });
  const saved = await waitFor(async () => { const value = await command({ action: "get", id: course.id }); return value.document && value; }, "saved classroom");
  assert.equal(saved.document.scenes.length, 3);
  assert.equal(saved.provenance.model.model, "kimi-k2.7-code");
  assert.equal(sdkCalls, 7);
  assert.ok(requests.every((r) => r.model === "kimi-k2.7-code"));
  const history = await waitFor(async () => { const value = await rpc("session.history", { sessionId, maxMessages: 20 }); return value.events.some((entry) => entry.event?.type === "turn/end") && value; }, "completed Harness turn");
  const serialized = JSON.stringify(history);
  assert.match(serialized, /generate_quantum_classroom/);
  assert.match(serialized, /课堂.*已保存/);
  const persisted = JSON.parse(await readFile(path.join(classrooms, `${courseId}.json`), "utf8"));
  assert.equal(persisted.document.scenes[2].content.questions[0].answer[0], "B");
  const requestCount = requests.length;
  await rpc("session.prompt", { sessionId, mode: "queue", content: [{ type: "text", text: `Generate courseId=${course.id} again` }] });
  await waitFor(async () => !(await rpc("session.list")).items.find((s) => s.sessionId === sessionId)?.running, "idempotent retry");
  assert.equal(requests.length, requestCount + 1, "only the ordinary Agent dispatch, no repeated SDK generation");
});
