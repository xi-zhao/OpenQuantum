import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Context, Service } from "@deepseek-ai/cordis";
import ToolRuntime from "@deepseek-ai/dsh-tools";
import Skills from "@deepseek-ai/dsh-skill";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import SessionProjections from "@deepseek-ai/dsh-session-projection";
import SandboxPolicy from "@deepseek-ai/dsh-sandbox-policy";
import ApprovalService from "@deepseek-ai/dsh-user-approval";
import { Session } from "@deepseek-ai/dsh-session";
import { createDesktopApplication } from "../src/settings/desktop/application.mjs";
import { apply } from "../src/settings/desktop/provider.mjs";
import { createBackend } from "../runtime/chatgpt/backend.mjs";
import { desktopPreset } from "../scripts/lib/desktop-profile-config.mjs";
import { migrateDesktopPreparation } from "../scripts/lib/desktop-preparation-migration.mjs";
import { writeCredentialField } from "../src/settings/codex/credential-field-write.mjs";
import { runPasqalWorkflow } from "../src/settings/codex/pasqal-workflow.mjs";
import { parse, parseDocument } from "yaml";
import { projectScientificToolResult } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-protocol.mjs";
import { withDesktopWorkflow } from "../src/settings/desktop/workflow.mjs";
import { apply as additionalSkills } from "../runtime/openquantum/agent-presets/openquantum/additional-skills.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const signal = () => new AbortController().signal;
const fixtureCredentials = () => {
  const values = new Map();
  return { values, resolve: async ref => values.has(ref) ? { value: values.get(ref), source: "fixture" } : undefined,
    describe: async ref => ({ configured: values.has(ref), writable: true, source: "fixture" }),
    set: async (ref, value) => values.set(ref, value), unset: async ref => values.delete(ref) };
};
async function fixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-desktop-preparation-"));
  const credentials = fixtureCredentials();
  const app = await createDesktopApplication({ root, directory, credentials, ...options });
  t.after(async () => { await app.close(); await fs.rm(directory, { recursive: true, force: true }); });
  return { app, directory, credentials };
}
async function native(t, app, outcome = "allowed-once", nativePermissions = false) {
  const ctx = new Context(), fibers = [], asks = [];
  fibers.push(await ctx.plugin(SystemPrompt), await ctx.plugin(ToolRuntime, { mode: "native" }), await ctx.plugin(Skills));
  class Capabilities extends Service { constructor(ctx) { super(ctx, "openquantumCapabilities"); this.application = app; } }
  class Approval extends Service { constructor(ctx) { super(ctx, "approval"); } async request(input) { asks.push(input.toolName); return outcome; } }
  fibers.push(await ctx.plugin(Capabilities));
  if (nativePermissions) fibers.push(await ctx.plugin(SessionProjections), await ctx.plugin(SandboxPolicy, { mode: "read-only", workspaceRoot: root }), await ctx.plugin(ApprovalService, { policy: "never" }));
  else fibers.push(await ctx.plugin(Approval));
  const provider = await ctx.plugin({ name: "test-native-provider", inject: ["tools", "skills", "openquantumCapabilities"], apply }); fibers.push(provider);
  t.after(async () => { for (const fiber of fibers.reverse()) await fiber.dispose(); });
  return { ctx, asks, provider, call: (agent, name, args) => ctx.tools.execute({ name, arguments: args, callId: crypto.randomUUID(), agent, signal: signal() }) };
}

test("Desktop native catalog, Skill changes and cached calls use the same current policy", async t => {
  const { app } = await fixture(t); const { ctx, call } = await native(t, app); const agent = {};
  assert.equal(ctx.tools.schemas().filter(item => item.name === "find_openquantum_skills").length, 1);
  assert.ok(ctx.tools.schemas().some(item => item.name === "run_qiskit_circuit"));
  assert.ok((await ctx.skills.get("qiskit-circuit-workbench")).content.includes("prepare_openquantum_skill"));
  const discovered = await call(agent, "find_openquantum_skills", { query: "qiskit" }); assert.equal(discovered.isError, false);
  await app.request({ action: "skill.set", id: "qiskit-circuit-workbench", enabled: false, revision: (await app.settings.read()).revision });
  assert.ok(!ctx.tools.schemas().some(item => item.name === "run_qiskit_circuit"));
  assert.equal((await ctx.skills.list()).find(item => item.name === "qiskit-circuit-workbench").invocation.modelInvocable, false);
  assert.equal((await call(agent, "run_qiskit_circuit", { operation: "run_circuit", arguments: {} })).isError, true);
  assert.equal((await app.discover({ skillId: "qiskit-circuit-workbench" })).state, "blocked");
});

test("native credentials save one field, share IBM, reopen, remove and never return the secret", async t => {
  const { app, directory, credentials } = await fixture(t);
  const session = { id: "pasqal_cloud", field: "PASQAL_AUTH_TOKEN", operation: "set", expires: Date.now() + 10000 };
  const token = "fixture-desktop-secret";
  assert.equal((await writeCredentialField(app, session, { value: token })).status, 200);
  const snapshot = await app.settings.snapshot();
  assert.equal(snapshot.services.find(item => item.id === "pasqal_cloud").configuration, "configured");
  assert.ok(!JSON.stringify(snapshot).includes(token));
  const reopened = await createDesktopApplication({ root, directory, credentials });
  assert.equal((await reopened.discover({ skillId: "pasqal-experiments", serviceId: "pasqal_cloud" })).state, "environment_required");
  await writeCredentialField(reopened, { ...session, operation: "remove" }, {});
  assert.equal((await reopened.discover({ skillId: "pasqal-experiments", serviceId: "pasqal_cloud" })).state, "credentials_required");
  await reopened.close();
  credentials.values.set("QISKIT_IBM_TOKEN", token);
  const ibm = (await app.settings.snapshot()).services.filter(item => ["qiskit_ibm_runtime", "qiskit_ibm_transpiler", "quantum_hardware"].includes(item.id));
  assert.ok(ibm.every(item => item.fields.find(field => field.name === "QISKIT_IBM_TOKEN").configured));
});

test("preparation goes through native approval including existing asks and retry; denial starts nothing", async t => {
  for (const outcome of ["allowed-once", "rejected", "unavailable", "cancelled"]) {
    const { app } = await fixture(t); const { ctx, call, asks } = await native(t, app, outcome);
    let preparations = 0;
    app.discover = async () => ({ state: "environment_required" });
    app.prepare = async (_args, _exec, options) => { preparations++; assert.equal(options.allowInstall(), true); return { state: "ready" }; };
    const upstream = await ctx.plugin({ name: "upstream-ask", apply(ctx) { ctx.on("tools/pre-execute", async (_exec, next) => { const value = await next(); return value.kind === "deny" ? value : { kind: "ask", reason: "test policy" }; }); } });
    const result = await call({}, "prepare_openquantum_skill", { skillId: "simqn-network", retry: true });
    assert.equal(preparations, outcome === "allowed-once" ? 1 : 0); assert.equal(result.isError, outcome !== "allowed-once"); assert.equal(asks.length, 1);
    await upstream.dispose();
  }
});

test("real native full access prepares without an ask; a live confined override still rejects", async t => {
  const { app } = await fixture(t); const { ctx, call } = await native(t, app, undefined, true);
  const session = Session.create("desktop-permission-test");
  session.append("sandbox/mode", { mode: "danger-full-access" });
  session.append("turn/start", { turn: 1 });
  const agent = { session }; let preparations = 0;
  app.discover = async () => ({ state: "environment_required" });
  app.prepare = async (_args, _exec, options) => { assert.equal(options.allowInstall(), true); preparations++; return { state: "ready" }; };
  const selection = { skillId: "qiskit-circuit-workbench" };
  assert.equal((await call(agent, "prepare_openquantum_skill", selection)).isError, false);
  assert.equal(preparations, 1);
  assert.equal(session.snapshotEvents().filter(event => event.type === "approval/asked").length, 0);
  session.append("sandbox/mode", { mode: "workspace-write" });
  assert.equal((await call(agent, "prepare_openquantum_skill", selection)).isError, true);
  assert.equal(preparations, 1);
  assert.equal(session.snapshotEvents().findLast(event => event.type === "approval/decided").data.outcome, "rejected");
  session.append("approval/policy", { policy: "ask" });
  ctx.on("approval/request", async () => "allowed-once");
  assert.equal((await call(agent, "prepare_openquantum_skill", selection)).isError, false);
  assert.equal(preparations, 2);
  assert.equal(session.snapshotEvents().findLast(event => event.type === "approval/decided").data.outcome, "allowed-once");
});

test("full access preserves other host asks and denials, and does not grant external writes", async t => {
  const { app } = await fixture(t); const { ctx, call } = await native(t, app, undefined, true);
  const session = Session.create("desktop-permission-boundaries");
  session.append("sandbox/mode", { mode: "danger-full-access" });
  session.append("turn/start", { turn: 1 });
  const agent = { session }; let preparations = 0, executions = 0;
  app.discover = async () => ({ state: "environment_required" });
  app.prepare = async () => { preparations++; return { state: "ready" }; };
  app.execute = async () => { executions++; return { content: [{ type: "text", text: "local result" }] }; };
  for (const kind of ["ask", "deny"]) {
    const other = await ctx.plugin({ name: `other-host-${kind}`, apply(scope) { scope.on("tools/pre-execute", async () => ({ kind, reason: "another host policy" })); } });
    assert.equal((await call(agent, "prepare_openquantum_skill", { skillId: "qiskit-circuit-workbench" })).isError, true);
    assert.equal(preparations, 0);
    await other.dispose();
  }
  const declared = app.settings.backend.providers.flatMap(provider => provider.tools);
  const schema = ctx.tools.schemas();
  const local = declared.find(item => item.effect === "workspace-write" && schema.some(tool => tool.name === item.name));
  assert.ok(local);
  // Invoke the policy waterfall directly for arbitrary declared schemas; the
  // real Tool Runtime above covers approval resolution and dispatch gating.
  const gate = name => ctx.waterfall("tools/pre-execute", { name, arguments: {}, token: {}, agent }, async () => ({ kind: "allow" }));
  assert.equal((await gate(local.name)).kind, "allow");
  assert.equal((await gate("run_pasqal_workflow")).kind, "ask");
  session.append("sandbox/mode", { mode: "read-only" });
  assert.equal((await gate(local.name)).kind, "ask");
  assert.equal(executions, 0);
});

test("a standing installation grant is rechecked after the owner and plan are ready", async t => {
  const { app, directory } = await fixture(t); const { call } = await native(t, app, undefined, true);
  const session = Session.create("desktop-live-permission-change");
  session.append("sandbox/mode", { mode: "danger-full-access" });
  session.append("turn/start", { turn: 1 });
  const prepare = app.prepare;
  app.prepare = (...args) => {
    session.append("sandbox/mode", { mode: "read-only" });
    return prepare(...args);
  };
  const result = await call({ session }, "prepare_openquantum_skill", { skillId: "qiskit-circuit-workbench", toolName: "run_qiskit_circuit", operationName: "analyze_circuit_tool" });
  assert.equal(result.isError, false);
  assert.equal(result.value.state, "environment_required");
  assert.match(result.value.message, /权限已变化/);
  const files = await fs.readdir(directory, { recursive: true });
  assert.ok(!files.some(file => file.endsWith("mcp-qiskit.json")));
});

test("a standing local write grant is rechecked before dispatch to the backend", async t => {
  let dispatched = 0;
  const { app } = await fixture(t, { backendFactory: async () => {
    const backend = await createBackend({ root });
    const call = backend.call;
    backend.call = (...args) => { dispatched++; return call(...args); };
    return backend;
  } });
  const { call } = await native(t, app, undefined, true);
  const session = Session.create("desktop-live-write-permission-change");
  session.append("sandbox/mode", { mode: "danger-full-access" });
  session.append("turn/start", { turn: 1 });
  const execute = app.execute;
  app.execute = (...args) => {
    session.append("sandbox/mode", { mode: "read-only" });
    return execute(...args);
  };
  const result = await call({ session }, "solve_and_validate_ground_state", { request: {} });
  assert.equal(result.isError, true);
  assert.match(JSON.stringify(result), /权限已变化/);
  assert.equal(dispatched, 0);
});

test("chat teardown and plugin close drain the same in-flight resource, without closing another chat", async t => {
  const backends = [];
  let release, delayClose = false, closeReturned = false;
  const barrier = new Promise(resolve => { release = resolve; });
  const { app } = await fixture(t, { backendFactory: async () => { const backend = await createBackend({ root }); const index = backends.length; const close = backend.close; backend.close = async () => { if (index === 1 && delayClose) await barrier; await close(); }; backends.push(backend); return backend; } });
  const a = {}, b = {};
  await app.prepare({ skillId: "quantum-sdk-advisor" }, { agent: a, signal: signal() });
  await app.prepare({ skillId: "quantum-sdk-advisor" }, { agent: b, signal: signal() });
  delayClose = true;
  const closingA = app.closeAgent(a);
  assert.equal((await app.prepare({ skillId: "quantum-sdk-advisor" }, { agent: b, signal: signal() })).state, "ready");
  const closingPlugin = app.close().then(() => { closeReturned = true; });
  await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(closeReturned, false);
  release(); await closingA; await closingPlugin;
  await assert.rejects(app.prepare({ skillId: "quantum-sdk-advisor" }, { agent: a, signal: signal() }), /关闭|有效/);
  assert.equal(backends.length, 3);
});

test("Desktop projection removes overlapping old MCP registrations and migration preserves actual prohibitions", async t => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "oq-desktop-migration-")); t.after(() => fs.rm(home, { recursive: true, force: true }));
  const original = await fs.readFile(path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8");
  const projected = desktopPreset(original, root, process.execPath, { onDemand: true });
  const entries = parse(projected, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
  assert.ok(entries.some(row => row.id === "openquantum-adaptive-capabilities"));
  assert.ok(!entries.some(row => row.config?.serverName === "qiskit"));
  const active = path.join(home, ".agent-presets/openquantum/agent.cordis.yml"); await fs.mkdir(path.dirname(active), { recursive: true });
  const legacy = parseDocument(original, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
  legacy.contents.items = legacy.contents.items.filter(row => row.get("config", true)?.get("serverName") === "qiskit");
  legacy.contents.items[0].set("disabled", true);
  const before = "- id: user-plugin\n  name: ./user.mjs\n" + legacy.toString();
  await fs.writeFile(active, before); await migrateDesktopPreparation(root, home);
  const state = JSON.parse(await fs.readFile(path.join(home, ".openquantum/capabilities/settings.json")));
  assert.ok(state.disabledProviders.includes("qiskit"));
  assert.match(await fs.readFile(active, "utf8"), /user-plugin/); assert.doesNotMatch(await fs.readFile(active, "utf8"), /serverName: qiskit/);
  assert.equal(await fs.readFile(path.join(home, ".openquantum/capabilities/legacy-preset.yml"), "utf8"), before);
});

test("legacy native Provider bans survive migration with the complete old MCP preset", async t => {
  const original = await fs.readFile(path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8");
  const oldNode = path.join(os.tmpdir(), "old-openquantum-runtime", process.platform === "win32" ? "node.exe" : "node");
  const deployed = desktopPreset(original, root, oldNode, { runtimeBin: path.dirname(oldNode) });
  for (const [plugin, tool] of [["./native-quantum-tools.mjs", "solve_and_validate_ground_state"],
    ["./quantum-practices-tools.mjs", "quantum_practices"], ["./metriq-data-tools.mjs", "metriq_benchmarks"]]) {
    const document = parseDocument(deployed, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
    document.contents.items.find(row => row.get("name") === plugin).set("disabled", true);
    const home = await fs.mkdtemp(path.join(os.tmpdir(), "oq-native-ban-migration-"));
    t.after(() => fs.rm(home, { recursive: true, force: true }));
    const active = path.join(home, ".agent-presets/openquantum/agent.cordis.yml");
    await fs.mkdir(path.dirname(active), { recursive: true }); await fs.writeFile(active, document.toString());
    await migrateDesktopPreparation(root, home);
    const directory = path.join(home, ".openquantum/capabilities");
    const settings = JSON.parse(await fs.readFile(path.join(directory, "settings.json")));
    assert.ok(settings.disabledProviders.includes(`native:${plugin}`));
    const app = await createDesktopApplication({ root, directory, credentials: fixtureCredentials() });
    try {
      assert.ok(app.settings.backend.tools.some(item => item.name === tool), tool);
      assert.equal(await app.settings.enabled(tool), false, tool);
    } finally { await app.close(); }
  }
});

test("custom managed MCP configuration blocks migration before changing any user state", async t => {
  const original = await fs.readFile(path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8");
  for (const [field, value] of [["command", "/custom/approved-python"], ["args", ["/custom/reviewed-server.py"]],
    ["env", { RESEARCH_SETTING: "custom" }], ["credentialEnv", { TOKEN: "CUSTOM_TOKEN_REF" }], ["toolCallTimeoutMs", 12345], ["reconnect", undefined]]) {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), "oq-custom-mcp-migration-"));
    t.after(() => fs.rm(home, { recursive: true, force: true }));
    const document = parseDocument(original, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: item => item }] });
    const row = document.contents.items.find(item => item.get("config", true)?.get("serverName") === "qiskit");
    if (value === undefined) row.get("config", true).delete(field);
    else row.get("config", true).set(field, document.createNode(value));
    const before = document.toString(), active = path.join(home, ".agent-presets/openquantum/agent.cordis.yml");
    await fs.mkdir(path.dirname(active), { recursive: true }); await fs.writeFile(active, before);
    const directory = path.join(home, ".openquantum/capabilities");
    await fs.mkdir(directory, { recursive: true });
    const prior = { "settings.json": '{"schemaVersion":1,"disabledProviders":["simqn_local"],"disabledTools":[],"connections":[]}',
      "skill-policy.json": '{"schemaVersion":1,"disabledSkills":["quantum-ground-state"]}' };
    for (const [name, content] of Object.entries(prior)) await fs.writeFile(path.join(directory, name), content);
    await assert.rejects(migrateDesktopPreparation(root, home), /自定义 MCP 或 Tool 参数.*未转换/, field);
    assert.equal(await fs.readFile(active, "utf8"), before);
    for (const [name, content] of Object.entries(prior)) assert.equal(await fs.readFile(path.join(directory, name), "utf8"), content);
    await assert.rejects(fs.stat(path.join(directory, "migration.json")), { code: "ENOENT" });
  }
});

test("legacy Desktop Tool profiles retain deployment defaults, embedded fallbacks and current overrides", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-profile-migration-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = path.join(directory, "project");
  await fs.mkdir(path.join(project, ".agents/skills"), { recursive: true });
  await fs.copyFile(path.join(root, ".agents/capability-packages.yml"), path.join(project, ".agents/capability-packages.yml"));
  const source = "- id: optional-tool-profiles\n  name: ./optional-tool-profiles.mjs\n  config:\n    qiskit_gym: !!js process.env.OPENQUANTUM_GYM_TOOL_PROFILE || 'full'\n    quantum_hardware: !!js process.env.OPENQUANTUM_HARDWARE_TOOL_PROFILE || 'full'\n    flagquantum: !!js process.env.OPENQUANTUM_FLAGQUANTUM_TOOL_PROFILE || 'full'\n";
  const defaults = "OPENQUANTUM_GYM_TOOL_PROFILE=synthesis\nOPENQUANTUM_HARDWARE_TOOL_PROFILE=devices\nOPENQUANTUM_FLAGQUANTUM_TOOL_PROFILE=compile\n";
  await fs.writeFile(path.join(project, ".env"), defaults);
  const rendered = desktopPreset(source, project);
  for (const [index, preset, environment, gymOverride] of [
    [0, source, defaults, false], [1, rendered, "", false],
    [2, rendered, defaults.replace("=synthesis", "=training"), true],
  ]) {
    await fs.writeFile(path.join(project, ".env"), environment);
    const home = path.join(directory, String(index));
    const active = path.join(home, ".agent-presets/openquantum/agent.cordis.yml");
    await fs.mkdir(path.dirname(active), { recursive: true }); await fs.writeFile(active, preset);
    await migrateDesktopPreparation(project, home);
    const state = JSON.parse(await fs.readFile(path.join(home, ".openquantum/capabilities/settings.json")));
    assert.equal(state.disabledTools.includes("start_training_tool"), !gymOverride);
    assert.equal(state.disabledTools.includes("synthesize_permutation_tool"), gymOverride);
    assert.ok(state.disabledTools.includes("submit_job"));
    assert.ok(state.disabledTools.includes("simulate_circuit_tool"));
    assert.equal(await fs.readFile(path.join(home, ".openquantum/capabilities/legacy-preset.yml"), "utf8"), preset);
    if (index === 0) {
      const directory = path.join(home, ".openquantum/capabilities");
      const credentials = fixtureCredentials(); credentials.values.set("PASQAL_AUTH_TOKEN", "fixture-retained");
      const app = await createDesktopApplication({ root, directory, credentials });
      t.after(() => app.close());
      const snapshot = await app.request({ action: "snapshot" });
      const wrapper = snapshot.tools.find(tool => tool.id === "run_qiskit_gym");
      assert.ok(wrapper.operationOverrides.some(tool => tool.id === "start_training_tool" && !tool.enabled));
      const shared = "convert_qpy_to_qasm3_tool";
      const owners = snapshot.tools.filter(tool => tool.operationOverrides.some(value => value.id === shared));
      assert.deepEqual(owners.map(tool => tool.id).sort(), ["run_qiskit_circuit", "run_qiskit_gym"]);
      assert.equal(owners[0].operationOverrides.find(tool => tool.id === shared).affectedProviders.length, 2);
      const request = { action: "tool.operation.set", id: wrapper.id, tool: shared, enabled: true, revision: snapshot.revision };
      const policy = await fs.readFile(app.settings.codexFile, "utf8");
      await app.request(request);
      const current = (await app.settings.read()).config;
      assert.deepEqual(current.disabledTools, state.disabledTools.filter(name => name !== shared));
      assert.deepEqual(current.disabledProviders, state.disabledProviders);
      assert.deepEqual(current.connections, state.connections);
      assert.equal(await fs.readFile(app.settings.codexFile, "utf8"), policy);
      assert.equal(credentials.values.get("PASQAL_AUTH_TOKEN"), "fixture-retained");
      const reopened = await createDesktopApplication({ root, directory, credentials });
      t.after(() => reopened.close());
      const restored = await reopened.request({ action: "snapshot" });
      for (const owner of owners) assert.equal(restored.tools.find(tool => tool.id === owner.id).operationOverrides.find(tool => tool.id === shared).enabled, true);
      await reopened.request({ ...request, enabled: false, revision: restored.revision });
      assert.deepEqual((await app.settings.read()).config.disabledTools.toSorted(), state.disabledTools.toSorted());
      await assert.rejects(fs.stat(path.join(directory, "installations")), { code: "ENOENT" });
    }
  }
});

test("legacy Qiskit prohibition survives missing deployment defaults and honors an explicit override", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-qiskit-migration-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = path.join(directory, "project");
  await fs.mkdir(path.join(project, ".agents/skills"), { recursive: true });
  await fs.copyFile(path.join(root, ".agents/capability-packages.yml"), path.join(project, ".agents/capability-packages.yml"));
  const legacy = parseDocument(await fs.readFile(path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8"), {
    customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }],
  });
  legacy.contents.items = legacy.contents.items.filter(row => ["qiskit", "qiskit_docs"].includes(row.get("config", true)?.get("serverName")));
  const source = legacy.toString();
  await fs.writeFile(path.join(project, ".env"), "OPENQUANTUM_DISABLE_QISKIT_MCP=1\n");
  const rendered = desktopPreset(source, project);
  for (const [index, preset, environment, banned] of [
    [0, source, "OPENQUANTUM_DISABLE_QISKIT_MCP=1\n", true],
    [1, rendered, "", true], [2, rendered, "OPENQUANTUM_DISABLE_QISKIT_MCP=0\n", false],
  ]) {
    await fs.writeFile(path.join(project, ".env"), environment);
    const home = path.join(directory, String(index));
    const active = path.join(home, ".agent-presets/openquantum/agent.cordis.yml");
    await fs.mkdir(path.dirname(active), { recursive: true }); await fs.writeFile(active, preset);
    await migrateDesktopPreparation(project, home);
    const state = JSON.parse(await fs.readFile(path.join(home, ".openquantum/capabilities/settings.json")));
    assert.deepEqual(state.disabledProviders, banned ? ["qiskit", "qiskit_docs"] : []);
  }
});


test("Desktop Pasqal consumer reads native credentials only for the bounded workflow", async t => {
  const { app, credentials } = await fixture(t); credentials.values.set("PASQAL_AUTH_TOKEN", "fixture-only-secret");
  let calls = 0, releases = 0;
  const environments = { environment: {}, acquire: async () => ({ release: async () => { releases++; } }) };
  const options = { root, settings: app.settings, credentials: app.credentials, environments, signal: signal(),
    launch: async () => ({ command: "fixture-python", args: [] }), execute: async input => { calls++; assert.equal(input.env.PASQAL_AUTH_TOKEN, "fixture-only-secret"); return { device: "fixture", secretEcho: input.env.PASQAL_AUTH_TOKEN }; } };
  const result = await runPasqalWorkflow(["device", "--project-id", "fixture", "--device", "fixture", "--out", "/tmp/unused-fixture"], options);
  assert.equal(result.exitCode, 0); assert.ok(!JSON.stringify(result).includes("fixture-only-secret")); assert.equal(calls, 1); assert.equal(releases, 1);
  await app.request({ action: "skill.set", id: "pasqal-experiments", enabled: false, revision: (await app.settings.read()).revision });
  await assert.rejects(runPasqalWorkflow(["device", "--project-id", "fixture", "--device", "fixture", "--out", "/tmp/unused-fixture"], options), /关闭/);
  assert.equal(calls, 1);
});

test("native deterministic Tools run in process and retain the scientific result contract", async t => {
  const { app } = await fixture(t); const { call } = await native(t, app);
  const result = await call({}, "list_qmclaw_experiments", {});
  assert.equal(result.isError, false, JSON.stringify(result));
  assert.equal(result.value.structuredContent.experiments.length, 13);
  assert.equal(projectScientificToolResult("solve_and_validate_ground_state", { structuredContent: {} }), undefined);
});

test("native Pasqal checks Tool and MCP prohibitions again after lease and interpreter preparation", async t => {
  for (const stage of ["acquire", "launch"]) for (const action of ["tool.set", "provider.set"]) {
    const { app, credentials } = await fixture(t);
    credentials.values.set("PASQAL_AUTH_TOKEN", "fixture-only-secret");
    let executed = 0, releases = 0;
    const disable = async () => { const { revision } = await app.settings.read(); await app.request({ action, id: action === "tool.set" ? "run_pasqal_workflow" : "pasqal_cloud", enabled: false, revision }); };
    const backend = withDesktopWorkflow(await createBackend({ root }), { settings: () => app.settings, credentials: app.credentials,
      environments: { environment: {}, acquire: async () => { if (stage === "acquire") await disable(); return { release: async () => { releases++; } }; } },
      launch: async () => { if (stage === "launch") await disable(); return { command: "fixture", args: [] }; },
      execute: async () => { executed++; return {}; },
    });
    const run = () => backend.call("run_pasqal_workflow", { args: ["device", "--project-id", "fixture", "--device", "fixture", "--out", "/tmp/unused-fixture"] }, signal(), () => app.settings.enabled("run_pasqal_workflow"));
    if (stage === "acquire") await assert.rejects(run(), /禁止/);
    else assert.equal((await run()).isError, true);
    assert.equal(executed, 0); assert.equal(releases, 1); await backend.close();
  }
});

test("custom filesystem Skills survive while duplicate bundled names cannot override a prohibition", async t => {
  const { app, directory } = await fixture(t); const { ctx } = await native(t, app);
  const customRoot = path.join(directory, "user-skills");
  for (const name of ["user-research-notes", "qiskit-circuit-workbench"]) {
    await fs.mkdir(path.join(customRoot, name), { recursive: true });
    await fs.writeFile(path.join(customRoot, name, "SKILL.md"), `---\nname: ${name}\ndescription: user-authored instructions\n---\nUse these custom notes.\n`);
  }
  const plugin = await ctx.plugin({ name: "test-extra-skills", inject: ["skills", "openquantumCapabilities"], apply: additionalSkills }, { includeDefaultRoots: false, customSkillDirs: [customRoot], watch: false });
  t.after(() => plugin.dispose());
  assert.match((await ctx.skills.get("user-research-notes")).content, /custom notes/);
  const created = path.join(customRoot, "new-in-this-chat", "SKILL.md");
  await fs.mkdir(path.dirname(created));
  await fs.writeFile(created, "---\nname: new-in-this-chat\ndescription: created by native write\n---\nFirst version.\n");
  await ctx.parallel("fs/observed", { displayPath: created }, {}, { name: "write" });
  assert.ok((await ctx.skills.list()).some(item => item.name === "new-in-this-chat"));
  await fs.writeFile(created, "---\nname: new-in-this-chat\ndescription: updated by native edit\n---\nSecond version.\n");
  await ctx.parallel("fs/observed", { displayPath: created }, {}, { name: "edit" });
  assert.match((await ctx.skills.get("new-in-this-chat")).content, /Second version/);
  await app.request({ action: "skill.set", id: "qiskit-circuit-workbench", enabled: false, revision: (await app.settings.read()).revision });
  assert.equal((await ctx.skills.list()).find(item => item.name === "qiskit-circuit-workbench").invocation.modelInvocable, false);
  assert.equal(await ctx.skills.get("qiskit-circuit-workbench"), undefined);
});

test("real local preparation executes twice in one native chat, then policy and disposal reject further calls", {
  skip: process.env.OPENQUANTUM_DESKTOP_LIVE !== "1", timeout: 240000,
}, async t => {
  // Electron's executable is not Node. The deployment-pinned Node must own
  // both installation and MCP launch, even when process.execPath is unusable.
  const actualNode = process.execPath;
  Object.defineProperty(process, "execPath", { value: "/nonexistent/Desktop.app/Desktop" });
  t.after(() => Object.defineProperty(process, "execPath", { value: actualNode }));
  const { app, directory } = await fixture(t, { nodeExecutable: actualNode }); const { ctx, asks, call } = await native(t, app); const agent = {};
  const selection = { skillId: "qiskit-circuit-workbench", toolName: "run_qiskit_circuit", operationName: "analyze_circuit_tool" };
  const initial = await call(agent, "find_openquantum_skills", selection);
  assert.equal(initial.value.state, "environment_required");
  assert.ok((await ctx.skills.get(selection.skillId)).content.includes("prepare_openquantum_skill"));
  const prepared = await call(agent, "prepare_openquantum_skill", selection);
  assert.equal(prepared.isError, false, JSON.stringify(prepared));
  assert.equal(prepared.value.state, "ready", JSON.stringify(prepared.value));
  assert.deepEqual(asks, ["prepare_openquantum_skill"]);
  assert.deepEqual(await fs.readdir(path.join(directory, "installations")), ["mcp-qiskit.json"]);
  const args = { operation: "analyze_circuit_tool", arguments: { circuit: 'OPENQASM 3.0; include "stdgates.inc"; qubit[2] q; h q[0]; cx q[0],q[1];' } };
  for (let turn = 0; turn < 2; turn++) {
    const executed = await call(agent, selection.toolName, args);
    assert.equal(executed.isError, false, JSON.stringify(executed));
    assert.match(JSON.stringify(executed.value), /num_qubits|qubits/);
    assert.equal((await app.settings.environments.read("mcp-qiskit")).leases.length, 0);
  }
  await app.request({ action: "skill.set", id: selection.skillId, enabled: false, revision: (await app.settings.read()).revision });
  assert.equal((await call(agent, selection.toolName, args)).isError, true);
  await app.request({ action: "skill.set", id: selection.skillId, enabled: true, revision: (await app.settings.read()).revision });
  await app.closeAgent(agent);
  assert.equal((await call(agent, selection.toolName, args)).isError, true);
  const reopened = await createDesktopApplication({ root, directory, credentials: fixtureCredentials(), nodeExecutable: actualNode });
  assert.equal((await reopened.discover(selection)).state, "ready");
  await reopened.close();
});
