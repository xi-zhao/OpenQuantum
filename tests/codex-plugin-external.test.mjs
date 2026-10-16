import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fixture } from "./fixtures/codex-settings.mjs";
import { EXTERNAL_MCP, externalMcp, externalContract, operationCredential, ACCOUNT_OPERATIONS } from "../runtime/chatgpt/external/catalog.mjs";
import { ExternalSessions, validateExternal, externalResult } from "../runtime/chatgpt/external/client.mjs";
import { inspectPreparation, prepareSkill, recentSkills } from "../src/settings/codex/preparation.mjs";
import { serviceById, serviceValues, saveServiceValues } from "../src/settings/codex/service-catalog.mjs";
import { writeCredentialField } from "../src/settings/codex/credential-field-write.mjs";
import { readCapabilities, providerGroups } from "../runtime/chatgpt/catalog.mjs";
import { credentialEntries } from "../runtime/chatgpt/ui/credential-groups.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sessionId = result => JSON.parse(result.content.at(-1).text).sessionId;
const text = value => ({ content: [{ type: "text", text: JSON.stringify(value) }] });

test("all seven upstream surfaces and both Skills have executable Codex projections", async () => {
  const capabilities = await readCapabilities(root), providers = providerGroups(capabilities.filter(item => item.status === "available"));
  for (const id of ["qiskit-circuit-workbench", "platform-diagnostics"]) assert.equal(capabilities.find(item => item.id === id).status, "available");
  for (const entry of EXTERNAL_MCP) {
    const provider = providers.find(item => item.key === entry.id);
    const contract = await externalContract(root, entry.id);
    assert.deepEqual(contract.tools.map(tool => tool.name).sort(), provider.upstreamTools.map(tool => tool.name).sort());
    assert.equal(provider.environmentId, entry.environmentId);
    assert.ok(capabilities.find(item => item.id === entry.skillId).tools.includes(entry.toolName));
    for (const operation of contract.tools.filter(tool => !ACCOUNT_OPERATIONS.has(tool.name))) assert.doesNotThrow(() => operationCredential(entry, operation.name));
  }
});

async function externalFixture(t, id) {
  const f = await fixture(t), entry = externalMcp(id);
  Object.assign(f.backend, { root, providers: [{ key: id, environmentId: entry.environmentId, tools: [{ name: entry.toolName, capabilityId: entry.skillId }] }],
    tools: [{ name: entry.toolName }], providerFor: () => id,
    sourceCapabilities: [{ id: entry.skillId, title: entry.title, status: "available", skill: "workflow", tools: [entry.toolName], sdkIds: [], mcp: [{ name: id }] }] });
  let starts = 0;
  f.settings.environments = { status: async value => ({ id: value, ready: false, state: "not_installed", installation: "missing" }),
    start: async value => { assert.equal(value, entry.environmentId); starts++; } };
  return { ...f, entry, starts: () => starts };
}

test("discovery selects one operation; only its environment is prepared and arguments are not persisted", async t => {
  const f = await externalFixture(t, "quantum_hardware");
  const selection = { skillId: f.entry.skillId, toolName: f.entry.toolName };
  const choice = await inspectPreparation(f.settings, selection);
  assert.equal(choice.state, "choice_required"); assert.equal(choice.operations.length, 53); assert.equal(f.starts(), 0);
  const local = { ...selection, operationName: "verify_stabilizer_circuit", operationArguments: { qasm_string: "private-scientific-input" } };
  const plan = await prepareSkill(f.settings, local);
  assert.equal(plan.environment.id, "mcp-quantum-hardware"); assert.equal(f.starts(), 1);
  assert.ok(plan.operation.inputSchema.properties.qasm_string);
  assert.doesNotMatch(JSON.stringify(await recentSkills(f.settings)), /private-scientific-input|operationArguments/);
  const cloud = await inspectPreparation(f.settings, { ...selection, operationName: "estimate_ionq_gates" });
  assert.equal(cloud.state, "credentials_required"); assert.deepEqual(cloud.fields.map(field => field.name), ["IONQ_API_KEY"]);
  assert.equal(f.starts(), 1);
  await assert.rejects(prepareSkill(f.settings, { ...local, operationArguments: { qasm_string: 1 } }), /参数无效/);
  assert.equal(f.starts(), 1);
});

test("explicit legacy operation prohibitions prevent discovery and preparation", async t => {
  const f = await externalFixture(t, "qiskit");
  await fs.mkdir(path.dirname(f.settings.file), { recursive: true });
  await fs.writeFile(f.settings.file, JSON.stringify({ schemaVersion: 1, connections: [], disabledProviders: [], disabledTools: ["analyze_circuit_tool"] }));
  const input = { skillId: f.entry.skillId, toolName: f.entry.toolName };
  assert.equal((await inspectPreparation(f.settings, input)).operations.some(item => item.name === "analyze_circuit_tool"), false);
  assert.equal((await prepareSkill(f.settings, { ...input, operationName: "analyze_circuit_tool" })).state, "blocked");
  assert.equal(f.starts(), 0);
});

test("unsupported upstream remote cancellation never installs, asks for a key or claims cancellation", async t => {
  const f = await externalFixture(t, "qpanda_runtime");
  const plan = await prepareSkill(f.settings, { skillId: f.entry.skillId, toolName: f.entry.toolName,
    operationName: "cancel_task_tool", operationArguments: { task_id: "existing-task" } });
  assert.equal(plan.state, "unavailable");
  assert.match(plan.message, /任务尚未取消/);
  assert.equal(plan.fields, undefined);
  assert.equal(f.starts(), 0);
  await assert.rejects(validateExternal(root, f.entry, { operation: "cancel_task_tool", arguments: { task_id: "existing-task" } }), /任务尚未取消/);
});

test("credentials follow real local/cloud parameters instead of service-wide requirements", () => {
  const hardware = externalMcp("quantum_hardware"), ibm = externalMcp("qiskit_ibm_runtime");
  assert.equal(operationCredential(hardware, "run_vqe"), null);
  assert.equal(operationCredential(hardware, "run_vqe", { backend_name: "ibm_real" }), "QISKIT_IBM_TOKEN");
  assert.equal(operationCredential(hardware, "estimate_expectation", { simulate: true }), "QISKIT_IBM_TOKEN");
  assert.equal(operationCredential(hardware, "debug_circuit"), null);
  assert.equal(operationCredential(hardware, "debug_circuit", { device_name: "ibm_real" }), "QISKIT_IBM_TOKEN");
  assert.equal(operationCredential(hardware, "get_amplification", { provider: "ionq" }), "IONQ_API_KEY");
  for (const name of ["run_search_experiment", "encode_4way_collision", "equality_oracle_search", "run_parallel_collision_search"]) {
    assert.equal(operationCredential(hardware, name), null);
    assert.equal(operationCredential(hardware, name, { simulate_only: false }), "QISKIT_IBM_TOKEN");
  }
  assert.equal(operationCredential(ibm, "get_coupling_map_tool", { backend_name: "fake_brisbane" }), null);
  assert.throws(() => operationCredential(hardware, "discover_energy_landscape"), /未知/);
});

test("a forbidden workbench MCP does not block an unrelated SDK; the SDK owner's policy still applies", async t => {
  const f = await fixture(t);
  f.backend.sourceCapabilities = await readCapabilities(root);
  f.backend.providers = providerGroups(f.backend.sourceCapabilities.filter(item => item.status === "available"));
  f.backend.tools = f.backend.providers.flatMap(item => item.tools);
  f.backend.providerFor = name => f.backend.providers.find(item => item.tools.some(tool => tool.name === name))?.key;
  f.settings.environments = { status: async id => ({ id, ready: true, state: "ready", installation: "present" }) };
  await fs.mkdir(path.dirname(f.settings.file), { recursive: true });
  const config = { schemaVersion: 1, connections: [], disabledProviders: ["qpanda_runtime"], disabledTools: [] };
  await fs.writeFile(f.settings.file, JSON.stringify(config));
  const input = { skillId: "quantum-sdk-workbench", sdkId: "qrisp-arithmetic" };
  assert.equal((await inspectPreparation(f.settings, input)).state, "ready");
  const owner = f.backend.sourceCapabilities.find(item => item.id === input.sdkId);
  config.disabledProviders.push(f.backend.providerFor(owner.tools[0]));
  await fs.writeFile(f.settings.file, JSON.stringify(config));
  assert.equal((await inspectPreparation(f.settings, input)).state, "blocked");
});

test("shared IBM save/remove/reopen is consistent and never deletes independent IonQ credentials", async t => {
  const f = await fixture(t);
  const ids = ["qiskit_ibm_runtime", "qiskit_ibm_transpiler", "quantum_hardware"];
  f.backend.providers = ids.map(key => ({ key }));
  f.secrets.set("service-qiskit_ibm_runtime", JSON.stringify({ QISKIT_IBM_TOKEN: "legacy-one" }));
  f.secrets.set("service-quantum_hardware", JSON.stringify({ QISKIT_IBM_TOKEN: "legacy-two", IONQ_API_KEY: "fixture-ionq" }));
  await assert.rejects(serviceValues(f.credentials, serviceById(ids[0])), /不同凭据/);
  assert.equal((await writeCredentialField(f, { id: "quantum_hardware", field: "IONQ_API_KEY", operation: "set", expires: Date.now() + 10000 }, { value: "fixture-ionq" })).status, 200, "an IBM conflict must not prevent editing independent IonQ fields");
  const session = { id: "quantum_hardware", field: "QISKIT_IBM_TOKEN", operation: "set", expires: Date.now() + 10000 };
  assert.equal((await writeCredentialField(f, session, { value: "fixture-shared" })).status, 200);
  for (const id of ids) assert.equal((await serviceValues(f.credentials, serviceById(id))).QISKIT_IBM_TOKEN, "fixture-shared");
  assert.equal((await serviceValues(f.credentials, serviceById("quantum_hardware"))).IONQ_API_KEY, "fixture-ionq");
  await saveServiceValues(f.credentials, serviceById("qiskit_ibm_transpiler"), {});
  for (const id of ids) assert.equal((await serviceValues(f.credentials, serviceById(id))).QISKIT_IBM_TOKEN, undefined);
  assert.equal((await serviceValues(f.credentials, serviceById("quantum_hardware"))).IONQ_API_KEY, "fixture-ionq");
});

test("IBM conflicts do not block independent IonQ preparation, execution credentials or form state", async t => {
  const f = await externalFixture(t, "quantum_hardware");
  f.secrets.set("service-qiskit_ibm_runtime", JSON.stringify({ QISKIT_IBM_TOKEN: "legacy-one" }));
  f.secrets.set("service-quantum_hardware", JSON.stringify({ QISKIT_IBM_TOKEN: "legacy-two", IONQ_API_KEY: "fixture-ionq" }));
  const args = { operation: "ionq_devices", arguments: {} };
  const plan = await inspectPreparation(f.settings, { skillId: f.entry.skillId, toolName: f.entry.toolName, operationName: args.operation });
  assert.equal(plan.state, "environment_required");
  assert.deepEqual(await f.settings.providerEnvironment(f.entry.toolName, args), { IONQ_API_KEY: "fixture-ionq" });
  f.settings.environments.snapshot = async () => [];
  const entries = credentialEntries((await f.settings.snapshot()).services);
  assert.equal(entries.find(item => item.id === "ionq").configuration, "configured");
  assert.equal(entries.find(item => item.id === "ibm_quantum").configuration, "unavailable");
  assert.equal(entries.find(item => item.id === "ionq").fields[0].unavailable, false);
});

async function poolFixture(t, { connect: customConnect, idleMs = 1800000, provider = "qpanda_runtime" } = {}) {
  const entry = externalMcp(provider), contract = await externalContract(root, entry.id);
  let values = {}, authorized = true, leases = 0, closes = 0;
  const calls = [];
  const client = { listTools: async () => ({ tools: contract.tools }), callTool: async input => {
    calls.push(input.name);
    return text(input.name === "setup_origin_quantum_account_tool" ? { status: "success" } : { status: "success", known: calls.length });
  } };
  const pool = new ExternalSessions({ root, idleMs, connect: customConnect ?? (async () => ({ client, close: async () => { closes++; } })) });
  t.after(() => pool.close());
  const options = { authorize: async () => authorized, values: async () => values, acquire: async () => { leases++; return { release: async () => { leases--; } }; } };
  return { entry, pool, options, client, calls, value: value => { values = value; }, authorize: value => { authorized = value; }, leases: () => leases, closes: () => closes,
    call: (operation, id, args = {}) => pool.call(entry, { operation, arguments: args, ...(id ? { sessionId: id } : {}) }, options) };
}

test("one session survives local work, first credential save and cloud authentication; rotation closes it", async t => {
  const f = await poolFixture(t);
  const id = sessionId(await f.call("list_bindings_tool"));
  assert.equal(f.leases(), 1); assert.equal(f.calls.length, 1);
  f.value({ QPANDA3_API_KEY: "fixture-first-key" }); await f.pool.reconcile();
  assert.equal(f.pool.sessions.size, 1, "first credential save must preserve local state");
  assert.equal(sessionId(await f.call("list_qpu_devices_tool", id)), id);
  await f.call("list_bindings_tool", id);
  assert.deepEqual(f.calls, ["list_bindings_tool", "setup_origin_quantum_account_tool", "list_qpu_devices_tool", "list_bindings_tool"]);
  f.value({ QPANDA3_API_KEY: "fixture-rotated-key" }); await f.pool.reconcile();
  assert.equal(f.closes(), 1); assert.equal(f.leases(), 0);
  await assert.rejects(f.call("list_qpu_devices_tool", id), /会话已失效/);
  assert.equal(f.calls.length, 4, "cloud work must never replay after rotation");
});

test("cancelling an in-flight connection waits for cleanup before releasing its environment", async t => {
  let finish, closed = false;
  const gate = new Promise(resolve => { finish = resolve; });
  const f = await poolFixture(t, { connect: async () => { await gate; return { client: f.client, close: async () => { closed = true; } }; } });
  const controller = new AbortController();
  const call = f.pool.call(f.entry, { operation: "list_bindings_tool", arguments: {} }, { ...f.options, signal: controller.signal });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(f.leases(), 1); controller.abort();
  assert.equal(f.leases(), 1, "lease cannot be released while connection may still appear");
  finish(); await assert.rejects(call);
  assert.equal(closed, true); assert.equal(f.leases(), 0); assert.equal(f.pool.sessions.size, 0);
});

test("disable, explicit close, expiry and contract drift reclaim sessions", async t => {
  const f = await poolFixture(t, { idleMs: 1 });
  let id = sessionId(await f.call("list_bindings_tool"));
  await f.call("close_session", id); assert.equal(f.leases(), 0);
  id = sessionId(await f.call("list_bindings_tool"));
  f.pool.sessions.get(id).lastUsed -= 20; await f.pool.reconcile(); assert.equal(f.leases(), 0);
  await f.call("list_bindings_tool"); f.authorize(false); await f.pool.reconcile(); assert.equal(f.leases(), 0);
  f.authorize(true); f.client.listTools = async () => ({ tools: [] });
  await assert.rejects(f.call("list_bindings_tool"), /合同/); assert.equal(f.leases(), 0);
});

test("Agent close waits for a policy cleanup already removed from the active sessions", async t => {
  const gate = Promise.withResolvers(), started = Promise.withResolvers();
  const f = await poolFixture(t, { connect: async () => ({ client: f.client, close: async () => {
    started.resolve(); await gate.promise;
  } }) });
  await f.call("list_bindings_tool"); f.authorize(false);
  const reconcile = f.pool.reconcile();
  await started.promise;
  assert.equal(f.pool.sessions.size, 0); assert.equal(f.leases(), 1);
  let returned = false;
  const closing = f.pool.close().then(() => { returned = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(returned, false, "removal from the catalog does not mean resource cleanup completed");
  gate.resolve(); await Promise.all([closing, reconcile]);
  assert.equal(f.leases(), 0);
});

test("Agent close prevents an operation awaiting credentials from opening a new session", async t => {
  const gate = Promise.withResolvers(), started = Promise.withResolvers();
  const f = await poolFixture(t);
  const pending = f.pool.call(f.entry, { operation: "list_bindings_tool", arguments: {} }, {
    ...f.options, values: async () => { started.resolve(); await gate.promise; return {}; },
  });
  await started.promise; await f.pool.close(); gate.resolve();
  await assert.rejects(pending, /已关闭/);
  assert.equal(f.pool.sessions.size, 0); assert.equal(f.leases(), 0); assert.equal(f.calls.length, 0);
});

test("invalid schemas and account/secret arguments fail before connection or credential reads", async () => {
  const entry = externalMcp("qpanda_runtime");
  await assert.rejects(validateExternal(root, entry, { operation: "setup_origin_quantum_account_tool", arguments: { api_key: "fixture" } }), /账户配置/);
  await assert.rejects(validateExternal(root, entry, { operation: "create_circuit_observable_binding_tool", arguments: { circuits: [], observables: [{ api_key: "fixture" }] } }), /凭据/);
  await assert.rejects(validateExternal(root, entry, { operation: "add_product_rule_tool", arguments: {} }), /参数无效/);
});

test("upstream business errors cannot be recorded as successful executions", () => {
  assert.equal(externalResult({ ...text({ status: "error", message: "request failed" }), isError: false }).isError, true);
  assert.equal(externalResult({ structuredContent: { result: JSON.stringify({ error: "backend unavailable" }) } }).isError, true);
  assert.equal(externalResult({ structuredContent: { status: "success", job_status: "failed" } }).isError, undefined, "reading a failed cloud job is a successful query");
});

test("stopping TensorBoard preserves Gym state; stopping training closes all owned work", async t => {
  const f = await poolFixture(t, { provider: "qiskit_gym" });
  const id = sessionId(await f.call("list_environments_tool"));
  await f.call("stop_tensorboard_tool", id);
  assert.equal(f.pool.sessions.size, 1); assert.equal(f.leases(), 1);
  await f.call("list_environments_tool", id);
  await f.call("stop_training_tool", id, { session_id: "training-fixture" });
  assert.equal(f.pool.sessions.size, 0); assert.equal(f.leases(), 0);
  const selected = await externalFixture(t, "qiskit_gym");
  const plan = await inspectPreparation(selected.settings, { skillId: selected.entry.skillId, toolName: selected.entry.toolName, operationName: "stop_training_tool" });
  assert.match(plan.operation.description, /全部训练/); assert.match(plan.operation.description, /未保存/);
});
