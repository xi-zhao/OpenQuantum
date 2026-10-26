import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { fixture } from "./fixtures/codex-settings.mjs";
import { Settings, skillEnabled } from "../src/settings/codex/application.mjs";
import { discoverSkills, prepareSkill, inspectPreparation, DISCOVER_TOOL, PREPARE_TOOL } from "../src/settings/codex/preparation.mjs";
import { createMcpServer, SETTINGS_TOOL } from "../runtime/chatgpt/server.mjs";
import { EXECUTE_TOOL, executeTool } from "../runtime/chatgpt/agent-tools.mjs";
import { createCredentialWindow } from "../src/settings/codex/credential-window.mjs";
import { sealCredentialField } from "../src/settings/credential-seal.mjs";
import { skillIssue, skillPreparation } from "../runtime/chatgpt/ui/settings-model.mjs";

async function setup(t) {
  const f = await fixture(t);
  f.backend.sourceCapabilities[0].sdkIds = ["example"];
  f.backend.providers[0].defaultEnabled = false;
  f.backend.tools[0].outputSchema = { type: "object", properties: { answer: { type: "number" } }, required: ["answer"], additionalProperties: false };
  const compute = f.backend.call;
  f.backend.call = async (...args) => ({ ...await compute(...args), structuredContent: { answer: 42 } });
  let state = "not_installed", installs = 0, leases = 0;
  const manager = { status: async id => ({ id, title: id, state, ready: state === "ready", installation: state === "ready" ? "present" : "missing",
    job: state === "preparing" ? { id: "job-1", status: "running", operation: "install" } : ["cancelled", "failed", "interrupted"].includes(state) ? { id: "job-1", status: state, operation: "install" } : null }),
    snapshot: async ids => Promise.all(ids.map(id => manager.status(id))),
    start: async (id, operation) => { assert.equal(id, "example"); assert.equal(operation, "install"); state = "preparing"; installs++; },
    acquire: async () => { assert.equal(state, "ready"); leases++; return { values: {}, release: async () => { leases--; } }; } };
  f.options.environments = f.settings.environments = manager;
  const window = await createCredentialWindow(f); t.after(() => window.close());
  const server = createMcpServer({ ...f, connections: {}, credentialWindow: window, html: "<html></html>", release: { version: "0.8.4" } });
  const client = new Client({ name: "same-conversation", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(right); await client.connect(left);
  t.after(async () => { await client.close(); await server.close(); });
  return { ...f, client, window, state: value => { state = value; }, installs: () => installs, leases: () => leases,
    call: async (name, args) => client.callTool({ name, arguments: args }),
    command: async input => f.settings.command({ ...input, revision: (await f.settings.read()).revision }) };
}

test("a growing scientific catalog cannot crowd discovery, preparation or execution out of the model surface", async t => {
  const f = await setup(t);
  f.backend.tools.push(...Array.from({ length: 80 }, (_, index) => ({ name: `analyze_fixture_${index}`, inputSchema: { type: "object", properties: {} } })));
  f.backend.providerFor = () => "local";
  const visible = (await f.client.listTools()).tools.filter(tool => !tool._meta?.ui?.visibility || tool._meta.ui.visibility.includes("model"));
  const bounded = visible.toSorted((a, b) => a.name.localeCompare(b.name)).slice(0, 32);
  for (const name of [DISCOVER_TOOL, PREPARE_TOOL, EXECUTE_TOOL]) assert.ok(bounded.some(tool => tool.name === name), `${name} must remain reachable in a bounded host`);
  assert.deepEqual(visible.map(tool => tool.name).sort(), [DISCOVER_TOOL, PREPARE_TOOL, EXECUTE_TOOL].sort());
  assert.equal(f.installs(), 0);
  assert.equal(f.calls(), 0);
});

test("one connected conversation discovers before install, prepares one environment, executes and reuses it", async t => {
  const f = await setup(t);
  const initial = (await f.client.listTools()).tools;
  assert.ok(!initial.some(tool => tool.name === "calculate"));
  assert.deepEqual(initial.find(tool => tool.name === SETTINGS_TOOL)._meta.ui.visibility, ["app"]);
  assert.equal(initial.find(tool => tool.name === PREPARE_TOOL).annotations.readOnlyHint, false);
  assert.equal(initial.find(tool => tool.name === DISCOVER_TOOL).annotations.readOnlyHint, true);
  assert.equal((await f.call(DISCOVER_TOOL, { query: "Example" })).structuredContent.matches[0].skillId, "example");
  const selected = (await f.call(DISCOVER_TOOL, { skillId: "example" })).structuredContent;
  assert.deepEqual(selected.tool.inputSchema, f.backend.tools[0].inputSchema);
  assert.deepEqual(selected.tool.outputSchema, f.backend.tools[0].outputSchema);
  const run = () => f.call(selected.execution.name, { ...selected.execution.arguments, arguments: {} });
  assert.equal(f.installs(), 0); assert.equal(f.calls(), 0);
  const missing = JSON.parse((await run()).content[0].text);
  assert.equal(missing.state, "environment_required");
  assert.equal(missing.execution.name, EXECUTE_TOOL);
  assert.equal(f.installs(), 0, "read-only scientific Tool never installs implicitly");
  assert.equal((await f.call(PREPARE_TOOL, { skillId: "example" })).structuredContent.state, "preparing");
  await f.call(PREPARE_TOOL, { skillId: "example" });
  assert.equal(f.installs(), 1); assert.equal(f.calls(), 0);
  f.state("ready");
  assert.equal((await f.call(DISCOVER_TOOL, { skillId: "example" })).structuredContent.state, "ready");
  assert.deepEqual((await run()).structuredContent, { answer: 42 });
  assert.equal(f.leases(), 0);
  await f.call(PREPARE_TOOL, { skillId: "example" });
  await run();
  assert.equal(f.calls(), 2); assert.equal(f.installs(), 1);
  assert.deepEqual((await f.client.listTools()).tools.map(tool => tool.name), initial.map(tool => tool.name));
  const restored = await new Settings(f.options).snapshot();
  assert.equal(restored.recentSkills[0].id, "example"); assert.ok(restored.recentSkills[0].lastUsedAt);
});

test("the catalog executor rejects foreign targets, malformed inputs and cancellation without installation or calls", async t => {
  const f = await setup(t);
  f.state("ready");
  for (const input of [
    {}, { skillId: "example", toolName: "calculate" },
    { skillId: "example", toolName: "calculate", arguments: [] },
    { skillId: "other", toolName: "calculate", arguments: {} },
    { skillId: "example", toolName: SETTINGS_TOOL, arguments: {} },
    { skillId: "example", toolName: "calculate", arguments: {}, command: "arbitrary" },
  ]) assert.equal((await f.call(EXECUTE_TOOL, input)).isError, true);
  await assert.rejects(executeTool(f.settings, { skillId: "example", toolName: "calculate", arguments: {} }, AbortSignal.abort()), { name: "AbortError" });
  assert.equal(f.calls(), 0); assert.equal(f.installs(), 0);
});

test("explicit policies block preparation and cached calls across processes, including SDK aliases", async t => {
  const f = await setup(t);
  const other = new Settings(f.options);
  for (const [action, id] of [["skill.set", "example"], ["tool.set", "calculate"], ["provider.set", "local"]]) {
    await other.command({ action, id, enabled: false, revision: (await other.read()).revision });
    assert.equal((await f.call(PREPARE_TOOL, { skillId: "example" })).structuredContent.state, "blocked");
    assert.equal((await f.call("calculate", {})).isError, true);
    assert.equal((await f.call(EXECUTE_TOOL, { skillId: "example", toolName: "calculate", arguments: {} })).isError, true);
    assert.equal(f.installs(), 0); assert.equal(f.calls(), 0);
    await other.command({ action, id, enabled: true, revision: (await other.read()).revision });
  }
  f.backend.sourceCapabilities.push({ id: "workbench", status: "available", title: "Workbench", skill: "text", tools: [], sdkIds: ["example", "other"] });
  assert.equal((await prepareSkill(f.settings, { skillId: "workbench" })).state, "choice_required");
  await f.command({ action: "skill.set", id: "example", enabled: false });
  assert.equal((await prepareSkill(f.settings, { skillId: "workbench", sdkId: "example" })).state, "blocked");
  assert.equal(f.installs(), 0);
  await f.command({ action: "skill.set", id: "example", enabled: true });
  await f.call(PREPARE_TOOL, { skillId: "example" });
  await other.command({ action: "skill.set", id: "example", enabled: false, revision: (await other.read()).revision });
  f.state("ready");
  assert.equal((await f.call("calculate", {})).isError, true, "a new prohibition wins even after installation completes");
  assert.equal((await discoverSkills(f.settings, { query: "Example" })).matches.some(item => item.skillId === "example"), false);
});

test("the executor checks a selected shared-Tool Skill before and immediately before execution", async t => {
  const f = await setup(t);
  f.state("ready");
  f.backend.sourceCapabilities.push({ id: "alias", title: "Alias", status: "available", skill: "workflow", tools: ["calculate"] });
  const invocation = { skillId: "alias", toolName: "calculate", arguments: {} };
  await f.command({ action: "skill.set", id: "alias", enabled: false });
  assert.equal((await f.call(DISCOVER_TOOL, { skillId: "alias", toolName: "calculate" })).structuredContent.state, "blocked");
  assert.equal((await f.call(EXECUTE_TOOL, invocation)).isError, true);
  assert.equal(f.calls(), 0);
  await f.command({ action: "skill.set", id: "alias", enabled: true });
  // Reproduce a prohibition arriving after the initial authorization while
  // environment/credential checks are awaiting their result.
  const acquire = f.settings.environments.acquire;
  f.settings.environments.acquire = async (...args) => {
    const lease = await acquire(...args);
    await f.command({ action: "skill.set", id: "alias", enabled: false });
    return lease;
  };
  const call = f.backend.call;
  f.backend.call = async (name, args, signal, authorize) => {
    if (!await authorize()) throw new Error("禁止的选择不能启动计算");
    return call(name, args, signal, authorize);
  };
  assert.equal((await f.call(EXECUTE_TOOL, invocation)).isError, true);
  assert.equal(f.calls(), 0);
  assert.equal(f.leases(), 0);
  assert.equal(f.installs(), 0);
});

test("cancelled/failed/interrupted preparation requires an explicit retry and never runs computation", async t => {
  const f = await setup(t);
  for (const state of ["cancelled", "failed", "interrupted"]) {
    f.state(state);
    const before = f.installs();
    assert.equal((await prepareSkill(f.settings, { skillId: "example" })).state, "retry_required");
    assert.equal(f.installs(), before);
    assert.equal((await prepareSkill(f.settings, { skillId: "example", retry: true })).state, "preparing");
    assert.equal(f.installs(), before + 1);
  }
  assert.equal(f.calls(), 0);
  await assert.rejects(prepareSkill(f.settings, { skillId: "example", sdkId: "../../other" }), /不属于/);
  await assert.rejects(prepareSkill(f.settings, { skillId: "example", command: "arbitrary" }), /无效/);
});

test("local and cloud branches prepare independently; encrypted credentials resume the same conversation", async t => {
  const f = await setup(t);
  const cap = f.backend.sourceCapabilities[0]; cap.id = "aqt-workbench"; cap.tools = ["simulate_aqt_circuit", "list_aqt_devices"];
  f.backend.providers[0] = { key: "aqt_local", defaultEnabled: false };
  f.backend.providerFor = name => cap.tools.includes(name) ? "aqt_local" : undefined;
  f.backend.tools = cap.tools.map(name => ({ name, inputSchema: { type: "object", properties: {}, additionalProperties: false }, outputSchema: { type: "object", properties: { answer: { type: "number" } }, required: ["answer"], additionalProperties: false } }));
  await f.client.listTools();
  const selection = { skillId: cap.id, toolName: "list_aqt_devices" };
  assert.equal((await f.call(PREPARE_TOOL, { skillId: cap.id })).structuredContent.state, "choice_required");
  const missing = await f.call(PREPARE_TOOL, selection);
  assert.equal(missing.structuredContent.state, "credentials_required");
  assert.equal(missing._meta.openquantumFocus.serviceId, "aqt_local");
  let snapshot = await f.settings.snapshot();
  assert.match(skillPreparation(snapshot.skills.find(item => item.id === cap.id), snapshot), /待填写.*凭据/);
  assert.equal(f.installs(), 0);
  assert.equal((await f.call(PREPARE_TOOL, { skillId: cap.id, toolName: "simulate_aqt_circuit" })).structuredContent.state, "preparing");
  f.state("ready");
  assert.equal((await f.call("simulate_aqt_circuit", {})).isError, undefined);
  assert.equal((await f.call(PREPARE_TOOL, selection)).structuredContent.state, "credentials_required");
  snapshot = await f.settings.snapshot();
  assert.match(skillIssue(snapshot.skills.find(item => item.id === cap.id), snapshot), /待填写.*凭据/);
  const authorization = await f.window.prepareField({ id: "aqt_local", field: "AQT_API_TOKEN", operation: "set" });
  const sealed = await sealCredentialField(authorization, { value: "synthetic-never-networked" });
  assert.equal((await f.window.commitField({ nonce: authorization.nonce, ciphertext: sealed })).status, 200);
  snapshot = await f.settings.snapshot();
  assert.equal(skillIssue(snapshot.skills.find(item => item.id === cap.id), snapshot), null, "saved credentials clear the current issue before another prepare call");
  const ready = await f.call(PREPARE_TOOL, selection);
  assert.equal(ready.structuredContent.state, "ready");
  snapshot = await f.settings.snapshot();
  assert.equal(skillIssue(snapshot.skills.find(item => item.id === cap.id), snapshot), null);
  assert.doesNotMatch(JSON.stringify(ready), /synthetic-never-networked/);
  assert.equal((await f.call("list_aqt_devices", {})).isError, undefined);
  const removal = await f.window.prepareField({ id: "aqt_local", field: "AQT_API_TOKEN", operation: "remove" });
  assert.equal((await f.window.commitField({ nonce: removal.nonce, ciphertext: await sealCredentialField(removal, {}) })).status, 200);
  assert.equal(JSON.parse((await f.call("list_aqt_devices", {})).content[0].text).state, "credentials_required");
  assert.equal((await f.settings.snapshot()).providers[0].enabled, true);
  assert.equal(f.calls(), 2);
});

test("old cache path choices survive versions with last-selector precedence and exact plugin ownership", () => {
  const root = "/fixture/.codex/plugins/cache/personal/openquantum/0.8.5/skills";
  const old = "/fixture/.codex/plugins/cache/personal/openquantum/0.8.4/skills/example/SKILL.md";
  const codex = { skills: { config: [{ path: old, enabled: false }] } };
  assert.equal(skillEnabled(codex, "example", root), false);
  codex.skills.config.push({ name: "openquantum:example", enabled: true });
  assert.equal(skillEnabled(codex, "example", root), true);
  codex.skills.config.push({ path: old, enabled: false });
  assert.equal(skillEnabled(codex, "example", root), false);
  for (const other of [old.replace("personal", "foreign"), old.replace("/openquantum/", "/other/"), old.replace("/fixture/", "/elsewhere/")]) {
    assert.equal(skillEnabled({ skills: { config: [{ path: other, enabled: false }] } }, "example", root), true);
  }
});

test("knowledge and selection queries do not create user files or inspect all environments", async t => {
  const f = await setup(t);
  f.backend.sourceCapabilities.push({ id: "reference", title: "参考", description: "解释量子概念", status: "available", tools: [], skill: "text", sdkIds: [] });
  assert.equal((await inspectPreparation(f.settings, { skillId: "reference" })).state, "ready");
  await discoverSkills(f.settings, { query: "量子概念" });
  await assert.rejects(fs.stat(f.settings.file), { code: "ENOENT" });
  await assert.rejects(fs.stat(path.join(path.dirname(f.settings.file), "activity.json")), { code: "ENOENT" });
  assert.equal(f.installs(), 0); assert.equal(f.calls(), 0);
});

test("Tool-only capabilities remain discoverable and executable without inventing a Skill or installation", async t => {
  const f = await setup(t);
  f.backend.sourceCapabilities.push({ id: "reference-data", title: "Reference data", status: "available", tools: ["reference_data"], sdkIds: [] });
  f.backend.tools.push({ name: "reference_data", inputSchema: { type: "object", properties: {}, additionalProperties: false } });
  f.backend.providerFor = () => "local";
  const search = (await f.call(DISCOVER_TOOL, { query: "reference_data" })).structuredContent;
  assert.ok(search.matches.some(item => item.skillId === "reference-data"));
  const selection = { skillId: "reference-data", toolName: "reference_data" };
  const selected = (await f.call(DISCOVER_TOOL, selection)).structuredContent;
  assert.equal(selected.state, "ready");
  assert.deepEqual(selected.tool.inputSchema, f.backend.tools[1].inputSchema);
  assert.equal((await f.call(PREPARE_TOOL, selection)).structuredContent.state, "ready");
  assert.equal((await f.call(EXECUTE_TOOL, { ...selection, arguments: {} })).isError, undefined);
  assert.equal(f.installs(), 0); assert.equal(f.calls(), 1);
  await f.command({ action: "tool.set", id: "reference_data", enabled: false });
  assert.equal((await f.call(DISCOVER_TOOL, selection)).structuredContent.state, "blocked");
  assert.equal((await f.call(EXECUTE_TOOL, { ...selection, arguments: {} })).isError, true);
  assert.equal(f.calls(), 1);
});

test("a Tool-only alias cannot prepare an environment when its canonical owner Skill is forbidden", async t => {
  const f = await setup(t);
  f.backend.sourceCapabilities.push({ id: "tool-alias", title: "Tool alias", status: "available", tools: ["calculate"], sdkIds: [] });
  await f.command({ action: "skill.set", id: "example", enabled: false });
  const selection = { skillId: "tool-alias", toolName: "calculate" };
  assert.equal((await f.call(DISCOVER_TOOL, selection)).structuredContent.state, "blocked");
  assert.equal((await f.call(PREPARE_TOOL, selection)).structuredContent.state, "blocked");
  assert.equal(f.installs(), 0);
  assert.equal(f.calls(), 0);
});

test("a cancellation during status inspection cannot start installation", async t => {
  const f = await setup(t);
  const controller = new AbortController();
  const status = f.settings.environments.status;
  f.settings.environments.status = async id => { controller.abort(); return status(id); };
  await assert.rejects(prepareSkill(f.settings, { skillId: "example" }, controller.signal), { name: "AbortError" });
  assert.equal(f.installs(), 0);
  assert.equal(f.calls(), 0);
});

test("retrying a cancelled check rechecks the existing installation", async t => {
  const f = await setup(t);
  let operation;
  f.settings.environments.status = async id => ({ id, title: id, state: "cancelled", ready: false, installation: "present", job: { id: "check-1", operation: "check", status: "cancelled" } });
  f.settings.environments.start = async (id, value) => { operation = value; };
  assert.equal((await prepareSkill(f.settings, { skillId: "example" })).state, "retry_required");
  assert.equal(operation, undefined);
  await prepareSkill(f.settings, { skillId: "example", retry: true });
  assert.equal(operation, "check");
});


test("Tool-only execution still requires its selected environment and never installs it implicitly", async t => {
  const f = await setup(t);
  delete f.backend.sourceCapabilities[0].skill;
  const result = await f.call(EXECUTE_TOOL, { skillId: "example", toolName: "calculate", arguments: {} });
  assert.equal(result.isError, true);
  assert.equal(JSON.parse(result.content[0].text).state, "environment_required");
  assert.equal(f.calls(), 0); assert.equal(f.installs(), 0);
});
