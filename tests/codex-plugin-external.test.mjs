import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { createBackend } from "../runtime/chatgpt/backend.mjs";
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
  const contract = await externalContract(root, id);
  Object.assign(f.backend, { root, providers: [{ key: id, environmentId: entry.environmentId, upstreamTools: contract.tools, tools: [{ name: entry.toolName, capabilityId: entry.skillId }] }],
    tools: [{ name: entry.toolName }], providerFor: () => id,
    sourceCapabilities: [{ id: entry.skillId, title: entry.title, status: "available", skill: "workflow", tools: [entry.toolName], sdkIds: [], mcp: [{ name: id }] }] });
  let starts = 0;
  f.settings.environments = { snapshot: async () => [], status: async value => ({ id: value, ready: false, state: "not_installed", installation: "missing" }),
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

test("individual operation choices are bounded, reversible and take effect before execution", async t => {
  const f = await externalFixture(t, "qiskit");
  const operation = "analyze_circuit_tool";
  const initial = { schemaVersion: 1, connections: [], disabledProviders: [], disabledTools: [operation, "unrelated_tool", "setup_ibm_quantum_account_tool"] };
  await fs.mkdir(path.dirname(f.settings.file), { recursive: true });
  await fs.writeFile(f.settings.file, JSON.stringify(initial));
  const row = value => value.tools.find(item => item.id === f.entry.toolName).operationOverrides;
  const snapshot = await f.settings.snapshot();
  assert.deepEqual(row(snapshot).map(item => [item.id, item.enabled]), [[operation, false]]);
  const change = { action: "tool.operation.set", id: f.entry.toolName, tool: operation, enabled: true, revision: snapshot.revision };
  const before = await fs.readFile(f.settings.file, "utf8");
  for (const input of [{ tool: "unknown" }, { tool: "setup_ibm_quantum_account_tool" }, { tool: "run_circuit" }, { id: "run_qiskit_gym" }, { enabled: "true" }, { revision: "stale" }]) {
    await assert.rejects(f.settings.command({ ...change, ...input }));
    assert.equal(await fs.readFile(f.settings.file, "utf8"), before);
  }
  const allowed = await f.settings.command(change);
  assert.deepEqual(row(allowed).map(item => [item.id, item.enabled]), [[operation, true]]);
  assert.deepEqual((await f.settings.read()).config.disabledTools, initial.disabledTools.slice(1));
  const selection = { skillId: f.entry.skillId, toolName: f.entry.toolName, operationName: operation };
  assert.equal((await inspectPreparation(f.settings, selection)).state, "environment_required");
  const args = { operation, arguments: { circuit: 'OPENQASM 3.0; include "stdgates.inc"; qubit q;' } };
  Object.assign(f.settings.environments, { status: async id => ({ id, ready: true, state: "ready" }), read: async () => ({}), values: () => ({}) });
  assert.equal((await f.settings.callBuiltin(f.entry.toolName, args)).isError, undefined);
  assert.equal(f.calls(), 1);
  await f.settings.command({ ...change, enabled: false, revision: allowed.revision });
  assert.equal((await f.settings.callBuiltin(f.entry.toolName, args)).isError, true);
  assert.equal(f.calls(), 1, "a cached wrapper cannot execute a newly prohibited operation");
  assert.equal(f.starts(), 0, "editing policy never prepares an environment");
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

async function backendFixture(t, { provider = "qpanda_runtime" } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-external-backend-"));
  const entry = externalMcp(provider), contract = await externalContract(root, entry.id);
  const externalDirectory = path.join(directory, "runtime/chatgpt/external/environments", entry.id);
  for (const name of [".agents", "examples/quantum-algorithms", "dist/chatgpt", externalDirectory]) await fs.mkdir(path.resolve(directory, name), { recursive: true });
  await fs.writeFile(path.join(directory, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [] }));
  await fs.writeFile(path.join(directory, "examples/quantum-algorithms/coverage.json"), JSON.stringify({ guides: [] }));
  await fs.writeFile(path.join(directory, ".agents/capability-packages.yml"), JSON.stringify({ schemaVersion: "1.1", packages: [
    { id: entry.skillId, execution: { mcpServers: [{ name: entry.id, source: "package", activation: "opt-in",
      tools: contract.tools.map(({ name }) => ({ name, effect: "external-write" })) }] } },
  ] }));
  await fs.writeFile(path.join(externalDirectory, "tools.json"), JSON.stringify(contract));
  let values = {}, leases = 0, reads = 0;
  const events = [], overrides = {};
  const options = { root: directory,
    connect: async () => { throw new Error("native providers must not start"); },
    connectExternal: async (_root, _entry, current, options) => {
      events.push({ type: "connect", values: current });
      if (overrides.connect) await overrides.connect(current, options);
      return { client: {
        listTools: async () => {
          if (overrides.list) await overrides.list(current);
          return { tools: contract.tools };
        },
        callTool: async (input, _schema, request) => {
          events.push({ type: "call", ...input });
          return overrides.call ? overrides.call(input, current, request) : text({ status: "success" });
        },
      }, close: async () => { events.push({ type: "close" }); if (overrides.close) await overrides.close(); } };
    },
  };
  const built = await createBackend({ ...options, discover: true });
  const bytes = JSON.stringify({ providers: built.providers, tools: built.tools });
  await built.close();
  await fs.writeFile(path.join(directory, "dist/chatgpt/capabilities.json"), bytes);
  await fs.writeFile(path.join(directory, "dist/chatgpt/release.json"), JSON.stringify({ contractDigest: createHash("sha256").update(bytes).digest("hex") }));
  const backend = await createBackend(options);
  t.after(async () => { try { await backend.close(); } finally { await fs.rm(directory, { recursive: true, force: true }); } });
  const lifecycle = {
    values: async () => { reads++; return overrides.values ? overrides.values() : values; },
    acquire: async () => { events.push({ type: "acquire" }); leases++; return { release: async () => { events.push({ type: "release" }); leases--; } }; },
  };
  return { backend, entry, events, overrides, lifecycle, value: next => { values = next; }, leases: () => leases, reads: () => reads,
    call: (operation, { id, args = {}, signal, initial = {}, authorize = async () => true } = {}) => backend.call(entry.toolName,
      { operation, arguments: args, ...(id ? { sessionId: id } : {}) }, signal, authorize, initial, lifecycle) };
}

test("backend and real ExternalSessions redact actual credentials across nested JSON, even with no old value", async t => {
  for (const initial of [{ QPANDA3_API_KEY: "fixture-obsolete-key" }, {}]) {
    await t.test(Object.keys(initial).length ? "rotated snapshot" : "empty snapshot", async t => {
      const f = await backendFixture(t);
      const secret = 'fixture-new-"quoted"-key\\with-slash';
      f.value({ QPANDA3_API_KEY: secret });
      const body = { source: { name: "text" }, nested: { echo: secret }, status: "success" };
      f.overrides.call = async input => input.name === "setup_origin_quantum_account_tool" ? text({ status: "success" }) : {
        content: [{ type: "text", text: JSON.stringify(body) }, { type: "text", text: JSON.stringify(JSON.stringify(body)) }], structuredContent: body,
      };
      const result = await f.call("list_qpu_devices_tool", { initial });
      assert.equal(CallToolResultSchema.safeParse(result).success, true);
      assert.equal(result.structuredContent.nested.echo, "[redacted]");
      assert.equal(JSON.parse(result.content[0].text).nested.echo, "[redacted]");
      assert.equal(JSON.parse(JSON.parse(result.content[1].text)).nested.echo, "[redacted]");
      assert.deepEqual(result.structuredContent.source, body.source);
      assert.doesNotMatch(JSON.stringify(result), /fixture-new|fixture-obsolete/);
      assert.equal(f.events.find(event => event.type === "connect").values.QPANDA3_API_KEY, secret);
      assert.equal(f.events.find(event => event.name === "setup_origin_quantum_account_tool").arguments.api_key, secret);
      assert.equal(f.reads(), 2, "authentication generation is rechecked before the operation");
      assert.equal(f.leases(), 1);
      await f.call("close_session", { id: sessionId(result) });
      assert.equal(f.leases(), 0);
      assert.equal(f.events.filter(event => event.name === "list_qpu_devices_tool").length, 1);
    });
  }
});

test("backend redacts every actual service secret in upstream business errors and preserves protocol types", async t => {
  const f = await backendFixture(t, { provider: "quantum_hardware" });
  f.value({ QISKIT_IBM_TOKEN: "text", IONQ_API_KEY: "fixture-ionq-key" });
  f.overrides.call = async () => ({ content: [{ type: "text", text: JSON.stringify({ status: "error", details: ["text", "fixture-ionq-key"] }) }],
    structuredContent: { status: "error", message: "text / fixture-ionq-key" } });
  const result = await f.call("ionq_devices");
  assert.equal(result.isError, true);
  assert.equal(CallToolResultSchema.safeParse(result).success, true);
  assert.deepEqual(JSON.parse(result.content[0].text).details, ["[redacted]", "[redacted]"]);
  assert.equal(result.structuredContent.message, "[redacted] / [redacted]");
  assert.equal(f.leases(), 0);
});

test("backend masks new-credential exceptions from connection, handshake, authentication, execution and cleanup", async t => {
  for (const phase of ["connect", "list", "authenticate", "execute", "close"]) {
    await t.test(phase, async t => {
      const f = await backendFixture(t), secret = `fixture-${phase}-new-key`;
      f.value({ QPANDA3_API_KEY: secret });
      const fail = () => { throw Object.assign(new Error(`provider echoed ${secret}`, { cause: new Error(secret) }), { detail: { secret } }); };
      if (["connect", "list"].includes(phase)) f.overrides[phase] = fail;
      else if (phase === "close") {
        f.overrides.close = fail;
        f.overrides.call = async input => { if (input.name !== "setup_origin_quantum_account_tool") fail(); return text({ status: "success" }); };
      } else f.overrides.call = async input => {
        if ((input.name === "setup_origin_quantum_account_tool") === (phase === "authenticate")) fail();
        return text({ status: "success" });
      };
      await assert.rejects(f.call("list_qpu_devices_tool"), error => {
        assert.match(error.message, /服务调用失败/);
        assert.doesNotMatch(String(error.stack) + JSON.stringify(error), /fixture-/);
        assert.equal(error.cause, undefined);
        return true;
      });
      assert.equal(f.leases(), 0);
      assert.ok(f.events.filter(event => event.name === "list_qpu_devices_tool").length <= 1);
      f.overrides.connect = f.overrides.list = f.overrides.close = f.overrides.call = undefined;
    });
  }
});

test("backend masks credential-read failures without an old value and preserves errors for credential-free calls", async t => {
  const f = await backendFixture(t);
  f.overrides.values = async () => { throw new Error("fixture-secret-in-store-error"); };
  await assert.rejects(f.call("list_bindings_tool"), error => {
    assert.match(error.message, /服务凭据读取失败/);
    assert.doesNotMatch(error.stack, /fixture-secret/);
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.deepEqual(f.events, []);
  f.overrides.values = undefined;
  f.overrides.call = async () => { throw new Error("local fixture failure"); };
  await assert.rejects(f.call("list_bindings_tool"), /local fixture failure/);
  assert.equal(f.leases(), 0);
});

test("backend rotation preserves first-save state, closes authenticated sessions and never replays a cloud submission", async t => {
  const f = await backendFixture(t);
  const id = sessionId(await f.call("list_bindings_tool"));
  f.value({ QPANDA3_API_KEY: "fixture-first-key" });
  await f.backend.reconcileExternal();
  assert.equal(f.leases(), 1);
  const args = { circuit: "QINIT 1", device_id: "20" };
  assert.equal(sessionId(await f.call("sample_tool", { id, args })), id);
  f.value({ QPANDA3_API_KEY: "fixture-rotated-key" });
  await f.backend.reconcileExternal();
  assert.equal(f.leases(), 0);
  await assert.rejects(f.call("sample_tool", { id, args }), /会话已失效/);
  assert.equal(f.events.filter(event => event.name === "sample_tool").length, 1);
  assert.equal(f.events.filter(event => event.type === "connect").length, 1);
});

test("backend detects credential rotation during authentication before any cloud submission", async t => {
  const f = await backendFixture(t);
  f.value({ QPANDA3_API_KEY: "fixture-first-key" });
  f.overrides.call = async () => { f.value({ QPANDA3_API_KEY: "fixture-rotated-key" }); return text({ status: "success" }); };
  await assert.rejects(f.call("sample_tool", { args: { circuit: "QINIT 1", device_id: "20" } }), /服务调用失败/);
  assert.deepEqual(f.events.filter(event => event.type === "call").map(event => event.name), ["setup_origin_quantum_account_tool"]);
  assert.equal(f.leases(), 0);
});

test("backend cleanup errors stay safe without rereading credentials on close, reconcile and shutdown", async t => {
  for (const action of ["close_session", "reconcile", "shutdown"]) await t.test(action, async t => {
    const f = await backendFixture(t), secret = "fixture-historical-authentication-key";
    f.value({ QPANDA3_API_KEY: secret });
    const id = sessionId(await f.call("list_qpu_devices_tool")), reads = f.reads();
    f.overrides.close = async () => { throw new Error(`cleanup echoed ${secret}`); };
    f.value({ QPANDA3_API_KEY: "fixture-rotated-key" });
    const pending = action === "close_session" ? f.call(action, { id })
      : action === "reconcile" ? f.backend.reconcileExternal() : f.backend.close();
    await assert.rejects(pending, error => {
      assert.match(error.message, /MCP 连接回收失败/);
      assert.doesNotMatch(String(error.stack) + JSON.stringify(error), /fixture-/);
      for (const child of error.errors ?? []) assert.doesNotMatch(child.stack, /fixture-/);
      return true;
    });
    if (action !== "reconcile") assert.equal(f.reads(), reads, "cleanup must work even when credentials cannot be read");
    assert.equal(f.leases(), 0);
    if (action === "shutdown") f.backend.close = async () => {};
  });
});

test("backend cancellation masks the actual credential and retains leases until connection cleanup finishes", async t => {
  const f = await backendFixture(t), started = Promise.withResolvers(), finish = Promise.withResolvers();
  const secret = "fixture-cancel-new-key", controller = new AbortController();
  f.value({ QPANDA3_API_KEY: secret });
  f.overrides.call = async (input, _current, { signal }) => {
    if (input.name === "setup_origin_quantum_account_tool") return text({ status: "success" });
    started.resolve();
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error(`cancelled ${secret}`)), { once: true }));
  };
  f.overrides.close = async () => { await finish.promise; };
  const pending = f.call("list_qpu_devices_tool", { signal: controller.signal });
  const rejected = assert.rejects(pending, error => {
    assert.match(error.message, /服务调用失败/);
    assert.doesNotMatch(error.stack, /fixture-cancel/);
    return true;
  });
  await started.promise;
  controller.abort();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.leases(), 1, "the environment remains leased during connection cleanup");
  finish.resolve(); await rejected;
  assert.equal(f.leases(), 0);
  assert.equal(f.events.filter(event => event.name === "list_qpu_devices_tool").length, 1);
  assert.deepEqual(f.events.slice(-2).map(event => event.type), ["close", "release"]);
});

test("ExternalSessions retains the original getter without retaining a call's redaction scope", async t => {
  const f = await poolFixture(t);
  f.value({ QPANDA3_API_KEY: "fixture-first-key" });
  f.client.callTool = async input => input.name === "setup_origin_quantum_account_tool" ? text({ status: "success" }) : text({ echo: "fixture-first-key" });
  const first = await f.call("list_qpu_devices_tool");
  assert.equal(JSON.parse(first.content[0].text).echo, "[redacted]");
  assert.equal(f.pool.sessions.get(sessionId(first)).values, f.options.values);
  f.value({ QPANDA3_API_KEY: "fixture-second-key" });
  await f.pool.reconcile();
  f.client.callTool = async input => input.name === "setup_origin_quantum_account_tool" ? text({ status: "success" }) : text({ echo: "fixture-second-key" });
  const second = await f.call("list_qpu_devices_tool");
  assert.equal(JSON.parse(second.content[0].text).echo, "[redacted]");
  assert.notEqual(sessionId(second), sessionId(first));
  assert.equal(f.pool.sessions.get(sessionId(second)).values, f.options.values);
});

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
