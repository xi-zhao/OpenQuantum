import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Context } from "@deepseek-ai/cordis";
import ToolRuntime from "@deepseek-ai/dsh-tools";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import { createLearningApplication, validateRequirements } from "../src/learning/application.mjs";
import { generateClassroom, validateSlide, validateQuiz } from "../src/learning/generation.mjs";
import { classroomTool, createHarnessAiCall } from "../runtime/openquantum/agent-presets/openquantum/learning-tools.mjs";
import { createLearningHandler } from "../runtime/openquantum/web-learning/index.mjs";
import { fixtureResponses, requirements } from "./fixtures/quantum-learning.mjs";

const signal = () => new AbortController().signal;

test("actual OpenMAIC SDK builds lecture, narration and a graded quiz", async () => {
  const answers = fixtureResponses();
  const seen = [];
  const document = await generateClassroom({ id: randomUUID(), requirements, signal: signal(), aiCall: async (system, user) => { seen.push([system, user]); return answers.shift(); } });
  assert.equal(answers.length, 0);
  assert.equal(seen.length, 7);
  assert.ok(seen[0][1].includes(requirements.material));
  assert.ok(seen.every(([, user]) => user.includes(requirements.material)), "source material reaches each content/action generation");
  assert.doesNotMatch(seen[1][0], /提纲严格生成/, "page prompts must not receive outline-only output instructions");
  assert.deepEqual(document.scenes.map((s) => s.type), ["slide", "slide", "quiz"]);
  assert.match(document.scenes[0].content.canvas.elements[0].content, /font-size:36px/);
  assert.equal(document.scenes[0].actions[0].type, "speech");
  assert.deepEqual(document.scenes[2].content.questions[0].answer, ["B"]);
});

test("course requests are session-bound, durable, and idempotent; cancellation publishes no classroom", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "oq-classroom-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const app = createLearningApplication({ directory });
  const sessionId = `session-learning-${randomUUID()}`;
  const created = await app.dispatch({ action: "create", requirements, sessionId });
  assert.deepEqual(await app.dispatch({ action: "create", requirements, sessionId }), created);
  await assert.rejects(app.dispatch({ action: "create", requirements: { ...requirements, topic: "different" }, sessionId }), /不同要求/);
  await assert.rejects(app.generate(created.id, { sessionId: "wrong", signal: signal() }), /原会话/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(app.generate(created.id, { sessionId, signal: controller.signal }), /abort/i);
  assert.equal((await app.dispatch({ action: "get", id: created.id })).document, undefined);
  const answers = fixtureResponses();
  const completed = await app.generate(created.id, { sessionId, aiCall: async () => answers.shift(), signal: signal(), model: { provider: "test", model: "fixture" } });
  assert.equal(completed.sceneCount, 3);
  const fresh = createLearningApplication({ directory });
  assert.equal((await fresh.dispatch({ action: "get", id: created.id })).provenance.reviewStatus, "unreviewed");
  assert.deepEqual(await fresh.generate(created.id, { sessionId, signal: signal(), aiCall: () => { throw new Error("must not call model twice"); } }), completed);
  await assert.rejects(fresh.dispatch({ action: "get", id: "../secrets" }), /编号无效/);
  assert.equal((await readdir(directory)).length, 1);
});

test("input boundaries and untrusted model content fail closed", () => {
  assert.throws(() => validateRequirements({ ...requirements, material: "x".repeat(24_001) }), /限制/);
  assert.throws(() => validateRequirements({ ...requirements, provider: "different" }), /不支持/);
  const malicious = { elements: [{ id: "t1", type: "text", left: 0, top: 0, width: 900,
    content: '<script>window.pwned=1</script><p style="position:fixed;color:#123456" onclick="evil()">量子</p>',
  }] };
  const safe = validateSlide(malicious);
  assert.equal(safe.elements[0].content, '<p style="color:#123456">量子</p>');
  assert.throws(() => validateSlide({ elements: [{ id: "media", type: "image", left: 0, top: 0, width: 5, src: "https://example.com/tracker" }] }), /不支持/);
  assert.throws(() => validateQuiz({ questions: [{ type: "single", question: "bad", options: [{ value: "A", label: "a" }, { value: "B", label: "b" }], answer: ["C"] }] }), /不匹配/);
  const formula = validateSlide({ elements: [{ id: "formula", type: "latex", left: 30, top: 40, width: 900, height: 100, latex: "0 \\leq |\\alpha|^2 < 1", html: "<script>evil()</script>" }] }).elements[0];
  assert.equal(formula.latex, "0 \\leq |\\alpha|^2 < 1");
  assert.match(formula.html, /katex/); assert.doesNotMatch(formula.html, /<script/);
});

test("SDK calls inherit the logged Harness route, forward abort, redact provider errors", async () => {
  const calls = [];
  const agent = { id: "session-test", session: { events: [{ type: "request/header", data: { header: { config: { provider: "kept-route", model: "kept-model", reasoningEffort: "high" } } } }] } };
  const abort = signal();
  const bridge = createHarnessAiCall({ agent, signal: abort, llm: { async *stream(options) { calls.push(options); yield { type: "text-delta", text: "{}" }; yield { type: "finish", reason: { kind: "stop" } }; } } });
  assert.equal(await bridge.aiCall("system", "user"), "{}");
  assert.equal(calls[0].provider, "kept-route"); assert.equal(calls[0].model, "kept-model");
  assert.equal(calls[0].signal, abort); assert.equal(calls[0].sessionId, agent.id);
  const broken = createHarnessAiCall({ agent, signal: abort, llm: { async *stream() { yield await Promise.reject(new Error("secret-credential-value")); } } });
  await assert.rejects(broken.aiCall("s", "u"), (error) => !error.message.includes("secret-credential-value") && /模型请求失败/.test(error.message));
  const truncated = createHarnessAiCall({ agent, signal: abort, llm: { async *stream() { yield { type: "text-delta", text: "{}" }; yield { type: "finish", reason: { kind: "max-tokens" } }; } } });
  await assert.rejects(truncated.aiCall("s", "u"), /截断/);
});

test("cancellation during the SDK request settles without publishing a partial course", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "oq-learning-abort-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const app = createLearningApplication({ directory });
  const sessionId = `session-learning-${randomUUID()}`;
  const course = await app.dispatch({ action: "create", requirements, sessionId });
  const controller = new AbortController();
  const pending = app.generate(course.id, { sessionId, signal: controller.signal, aiCall: async () => { controller.abort(); throw controller.signal.reason; } });
  await assert.rejects(pending, /abort/i);
  assert.equal((await app.dispatch({ action: "get", id: course.id })).document, undefined);
});

test("native Tool registers its canonical contract in the actual Harness registry", async () => {
  const ctx = new Context();
  const promptFiber = await ctx.plugin(SystemPrompt, {});
  const toolsFiber = await ctx.plugin(ToolRuntime, { mode: "native" });
  const tool = classroomTool({ llm: {} });
  ctx.tools.register(tool);
  assert.ok(ctx.tools.schemas().some((schema) => schema.name === "generate_quantum_classroom"));
  assert.equal(tool.timeoutMs, 600_000);
  await assert.rejects(tool.execute({ courseId: randomUUID() }, { signal: signal() }), /Harness 会话/);
  const unguard = ctx.tools.guard(() => "fixture-denied");
  const denied = await ctx.tools.execute({ name: tool.name, callId: "denied-learning", arguments: { courseId: randomUUID() }, signal: signal() });
  assert.equal(denied.isError, true);
  assert.match(JSON.stringify(denied), /fixture-denied/);
  unguard();
  await toolsFiber.dispose(); await promptFiber.dispose();
});

test("a failed generation cannot spend another SDK budget in the same Harness turn", async () => {
  let attempts = 0;
  const tool = classroomTool({ llm: {}, application: { async generate() { attempts++; throw new TypeError("fixture-failure"); } } });
  const events = [{ type: "turn/start", data: { turn: 1 } }, { type: "request/header", data: { header: { config: { provider: "test", model: "test" } } } }];
  const exec = { signal: signal(), agent: { id: "fixture", session: { events } } };
  const args = { courseId: randomUUID() };
  await assert.rejects(tool.execute(args, exec), /fixture-failure/);
  await assert.rejects(tool.execute(args, exec), /不自动重复/);
  assert.equal(attempts, 1);
  events.push({ type: "turn/start", data: { turn: 2 } });
  await assert.rejects(tool.execute(args, exec), /fixture-failure/);
  assert.equal(attempts, 2);
});

test("host route rejects foreign origins and oversized bodies without touching the application", async () => {
  let called = 0;
  const handler = createLearningHandler({ dispatch: async () => { called++; return {}; } });
  const headers = { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json" };
  const invoke = async (overrides, body = "{}") => {
    const req = { method: "POST", headers: { ...headers, ...overrides }, async *[Symbol.asyncIterator]() { yield Buffer.from(body); } };
    const out = { status: 0 }; await handler(req, { writeHead(status) { out.status = status; }, end(body) { out.body = body; } }); return out;
  };
  assert.equal((await invoke({ origin: "https://evil.example" })).status, 403);
  assert.equal((await invoke({}, "x".repeat(130_000 + 2048))).status, 413);
  assert.equal(called, 0);
  assert.equal((await invoke({ "content-length": "80000" }, JSON.stringify({ material: "中".repeat(23_000) }))).status, 200);
  assert.equal(called, 1);
});
