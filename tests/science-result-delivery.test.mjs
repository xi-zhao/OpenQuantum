import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Context } from "@deepseek-ai/cordis";
import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";
import { SandboxedFileSystem } from "@deepseek-ai/dsh-fs-sandbox";
import { SandboxPolicyService } from "@deepseek-ai/dsh-sandbox-policy";
import { scienceResultSummary, SCIENCE_SUMMARY_MAX_CHARS } from "../src/lib/science-result-summary.mjs";
import { apply } from "../runtime/openquantum/agent-presets/openquantum/science-result-delivery.mjs";
import { definition } from "../.agents/skills/pennylane-differentiable/mcp/contracts.mjs";
import { scienceResultFixture, scienceToolResponse } from "./fixtures/science-result.mjs";

const TOOL = "mcp__pennylane_local__differentiate_pennylane_circuit";
const hash = text => createHash("sha256").update(text).digest("hex");

async function setup(t, value = scienceResultFixture()) {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "oq-science-delivery-"));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  const fileSystem = new LocalFileSystem(new Context(), { cwd: workspaceRoot, diffBasisMaxBytes: 1024 * 1024 });
  const event = { type: "tool/call", seq: 4, data: { name: TOOL, callId: "call-a", arguments: JSON.stringify(value.input) } };
  const exec = { name: TOOL, callId: "call-a", arguments: value.input, signal: new AbortController().signal,
    agent: { session: { id: "session-a", header: { cwd: workspaceRoot }, events: [event] } } };
  const response = scienceToolResponse(value);
  const result = { value: response, content: response.content, isError: false };
  let listener;
  const warnings = [];
  const ctx = { fs: fileSystem, sandboxPolicy: { resolve: () => ({ mode: "workspace-write", workspaceRoot }) }, logger: { warn: message => warnings.push(message) }, on: (name, callback) => {
    assert.equal(name, "tools/post-execute"); listener = callback;
  } };
  apply(ctx);
  const downstream = { kind: "accept", additionalContexts: [{ role: "user", content: [] }] };
  return { workspaceRoot, exec, event, ctx, warnings, result, downstream,
    run: (e = exec, r = result, d = downstream) => listener(e, r, async () => d) };
}

test("small results and the MCP structured contract remain unchanged", async t => {
  const value = scienceResultFixture(2);
  assert.ok(definition.validateOutput(value), JSON.stringify(definition.validateOutput.errors));
  const response = scienceToolResponse(value);
  assert.equal(response.structuredContent, value);
  assert.deepEqual(JSON.parse(response.content[0].text), value);
  assert.equal(scienceResultSummary(value), undefined);
  const fixture = await setup(t, value);
  assert.equal(await fixture.run(), fixture.downstream);
  assert.deepEqual(await readdir(fixture.workspaceRoot), []);
});

test("large numerical arrays are described while expectations, gradients, units and limitations survive", () => {
  const value = scienceResultFixture();
  const before = JSON.stringify(value);
  const summary = scienceResultSummary(value);
  assert.ok(JSON.stringify(summary).length <= SCIENCE_SUMMARY_MAX_CHARS);
  for (const key of ["stateNormSquared", "expectations", "jacobian", "trainableGateIndices", "bitOrder", "angleUnit", "backend", "gradientMethod"]) {
    assert.deepEqual(summary.result[key], value.result[key], key);
  }
  assert.deepEqual(summary.result.amplitudes, { omitted: true, jsonPointer: "/result/amplitudes", type: "array", length: 4096, shape: [4096, 2] });
  assert.deepEqual(summary.result.probabilities.shape, [4096]);
  assert.equal(summary.scientificValidation, "not_evaluated");
  assert.deepEqual(summary.limitations, value.limitations);
  assert.equal(JSON.stringify(value), before);
});

test("large strings, ragged data and JSON pointers are explicit and bounded", () => {
  const value = scienceResultFixture();
  value.input = { "a/b~c": "x".repeat(12000) };
  value.result.ragged = Array.from({ length: 20 }, (_, i) => Array(i).fill(0));
  const summary = scienceResultSummary(value);
  assert.equal(summary.input["a/b~c"].jsonPointer, "/input/a~1b~0c");
  assert.deepEqual(summary.result.ragged.shape, [20, null]);
  value.result = Object.fromEntries(Array.from({ length: 10000 }, (_, i) => [String(i), i]));
  assert.ok(JSON.stringify(scienceResultSummary(value)).length <= SCIENCE_SUMMARY_MAX_CHARS);
});

test("delivery is lossless, hash-verifiable, repeatable and isolated by session and call event", async t => {
  const f = await setup(t);
  const canonical = JSON.stringify(f.result.value);
  const decision = await f.run();
  const presentation = JSON.parse(decision.content[0].text);
  assert.equal(presentation.kind, "openquantum-science-summary");
  assert.equal(decision.additionalContexts, f.downstream.additionalContexts);
  const location = path.join(f.workspaceRoot, presentation.fullResult.path);
  const saved = await readFile(location, "utf8");
  assert.deepEqual(JSON.parse(saved), f.result.value.structuredContent);
  assert.equal(hash(saved), presentation.fullResult.sha256);
  assert.equal(Buffer.byteLength(saved), presentation.fullResult.bytes);
  assert.equal(JSON.stringify(f.result.value), canonical);
  assert.ok(decision.content[0].text.length < 8192);
  assert.deepEqual(await f.run(), decision);
  assert.deepEqual(f.warnings, []);
  f.exec.agent.session.id = "session-b";
  const second = JSON.parse((await f.run()).content[0].text);
  assert.notEqual(second.fullResult.path, presentation.fullResult.path);
  f.event.seq = 9;
  const third = JSON.parse((await f.run()).content[0].text);
  assert.notEqual(third.fullResult.path, second.fullResult.path);
  assert.deepEqual(JSON.parse(await readFile(location, "utf8")), f.result.value.structuredContent);
});

test("errors, nested calls, foreign/read-only Tools, invalid provenance and changed downstream content are untouched", async t => {
  const f = await setup(t);
  const cases = [
    [{ ...f.exec, parent: "parent" }, f.result, f.downstream],
    [{ ...f.exec, agent: undefined }, f.result, f.downstream],
    [{ ...f.exec, name: "mcp__custom__differentiate_pennylane_circuit" }, f.result, f.downstream],
    [{ ...f.exec, name: "mcp__qiskit_ibm_runtime__list_backends_tool" }, f.result, f.downstream],
    [f.exec, { ...f.result, isError: true }, f.downstream],
    [f.exec, { ...f.result, value: { ...f.result.value, structuredContent: { ...f.result.value.structuredContent, inputSha256: "0".repeat(64) } } }, f.downstream],
    [f.exec, f.result, { kind: "reject", reason: "policy" }],
    [f.exec, f.result, { kind: "accept", value: {} }],
    [f.exec, f.result, { kind: "accept", content: [{ type: "text", text: "Another hook's explanation" }] }],
  ];
  for (const [exec, result, downstream] of cases) assert.equal(await f.run(exec, result, downstream), downstream);
  assert.deepEqual(await readdir(f.workspaceRoot), []);
});

test("the real Harness sandbox honors a read-only session override without granting write access", async t => {
  const f = await setup(t);
  const context = new Context();
  f.exec.agent.session.events.unshift({ type: "sandbox/mode", data: { mode: "read-only" } });
  f.ctx.sandboxPolicy = new SandboxPolicyService(context, { mode: "workspace-write", workspaceRoot: f.workspaceRoot });
  f.ctx.fs = new SandboxedFileSystem(context, { cwd: f.workspaceRoot, diffBasisMaxBytes: 1024 * 1024 });
  const denied = await f.run();
  assert.deepEqual(denied.content[0], f.result.content[0]);
  assert.deepEqual(await readdir(f.workspaceRoot), []);
  f.exec.agent.session.events.push({ type: "sandbox/mode", data: { mode: "workspace-write" } });
  const delivered = JSON.parse((await f.run()).content[0].text);
  assert.equal(delivered.kind, "openquantum-science-summary");
  assert.deepEqual(JSON.parse(await readFile(path.join(f.workspaceRoot, delivered.fullResult.path), "utf8")), f.result.value.structuredContent);
});

for (const failure of ["missing-call", "arguments", "cancelled", "write", "readback", "collision", "escape"]) {
  test(`delivery failure (${failure}) retains the complete result and never claims successful storage`, async t => {
    const f = await setup(t);
    if (failure === "missing-call") f.exec.agent.session.events = [];
    if (failure === "arguments") f.event.data.arguments = "{}";
    if (failure === "cancelled") f.exec.signal = AbortSignal.abort();
    if (failure === "write") f.ctx.fs.writeText = async () => { throw new Error("Disk full"); };
    if (failure === "readback") {
      const write = f.ctx.fs.writeText.bind(f.ctx.fs);
      f.ctx.fs.writeText = async (...args) => { await write(...args); await writeFile(f.ctx.fs.processPath(args[0]), "corrupt"); };
    }
    let collisionPath;
    if (failure === "collision") {
      const previous = JSON.parse((await f.run()).content[0].text);
      collisionPath = path.join(f.workspaceRoot, previous.fullResult.path);
      await writeFile(collisionPath, "existing user data");
    }
    if (failure === "escape") {
      const outside = await mkdtemp(path.join(tmpdir(), "oq-delivery-outside-"));
      await mkdir(path.join(f.workspaceRoot, "results"));
      await symlink(outside, path.join(f.workspaceRoot, "results/openquantum"), process.platform === "win32" ? "junction" : "dir");
      t.after(async () => { assert.deepEqual(await readdir(outside), []); await rm(outside, { recursive: true, force: true }); });
    }
    const decision = await f.run();
    assert.deepEqual(decision.content[0], f.result.content[0]);
    assert.match(decision.content[1].text, /原始输出已保留/);
    assert.doesNotMatch(decision.content[1].text, /已保存/);
    assert.equal(f.warnings.length, 1);
    if (collisionPath) assert.equal(await readFile(collisionPath, "utf8"), "existing user data");
  });
}
