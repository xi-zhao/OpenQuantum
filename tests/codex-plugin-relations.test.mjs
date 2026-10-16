import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./fixtures/codex-settings.mjs";
import { Settings } from "../src/settings/codex/application.mjs";
import { skillRelations, toolCredential } from "../src/settings/codex/relations.mjs";
import { SERVICES, serviceCredentialRef } from "../src/settings/codex/service-catalog.mjs";
import { toolState, providerState, connectionState, skillPreparation, skillPresentation, settingsTools } from "../runtime/chatgpt/ui/settings-model.mjs";

test("declared Tool and MCP links do not infer dependencies from shared environments", () => {
  const capability = { id: "a", tools: ["local", "cloud"], mcp: [{ name: "first" }, { name: "second" }], sdkIds: ["one", "two"] };
  const links = skillRelations(capability, { providerFor: id => id === "local" ? "first" : "second" }, []);
  assert.deepEqual(links.providerIds, ["first", "second"]);
  assert.deepEqual(links.environmentIds, ["one", "two"]);
  assert.equal(links.environmentSelection, "choice");
  const hostOnly = skillRelations({ id: "host-only", tools: [], sdkIds: ["one"] }, { providerFor: () => "unrelated" }, []);
  assert.deepEqual(hostOnly.providerIds, []);
  assert.equal(hostOnly.usesHostTools, true);
  assert.deepEqual(skillRelations({ id: "knowledge" }, {}, []).environmentIds, []);
  assert.deepEqual(skillRelations({ id: "pasqal-experiments", sdkIds: ["pulser-dynamics"] }, {}, SERVICES).credentialServiceIds, ["pasqal_cloud"]);
});

test("AQT local Tool can be prepared without credentials while cloud Tool shows its missing Token", () => {
  const service = { ...SERVICES.find(item => item.id === "aqt_local"), configuration: "incomplete", missing: ["AQT_API_TOKEN"] };
  const local = { id: "simulate_aqt_circuit", provider: service.id, enabled: true, environmentId: "aqt-workbench" };
  const cloud = { ...local, id: "list_aqt_devices" };
  local.credential = toolCredential(local, [service]); cloud.credential = toolCredential(cloud, [service]);
  const snapshot = { environments: [{ id: "aqt-workbench", ready: true }], providers: [{ id: service.id, enabled: true }], tools: [local, cloud] };
  assert.equal(toolState(local, snapshot).key, "prepared");
  assert.equal(toolState(cloud, snapshot).key, "credentials");
  assert.equal(providerState(snapshot.providers[0], snapshot).blocked, false);
  assert.equal(skillPreparation({ relations: { toolIds: [local.id, cloud.id], environmentIds: ["aqt-workbench"] } }, snapshot), "1 / 2 个 Tool 已准备");
  snapshot.environments[0].ready = false;
  assert.equal(toolState(local, snapshot).key, "environment");
  assert.equal(providerState(snapshot.providers[0], snapshot).blocked, true);
  snapshot.environments[0].ready = true; snapshot.providers[0].enabled = false;
  assert.equal(toolState(local, snapshot).key, "mcp");
  assert.equal(providerState(snapshot.providers[0], snapshot).key, "disabled");
});

test("cloud-only MCP cannot claim readiness while all its Tools lack required credentials", () => {
  const provider = { id: "cloud", enabled: true };
  const tool = { id: "remote", provider: provider.id, enabled: true, credential: { requirement: "required", state: "missing" } };
  const snapshot = { providers: [provider], tools: [tool] };
  assert.equal(providerState(provider, snapshot).key, "credentials");
  assert.equal(providerState(provider, snapshot).blocked, true);
  tool.credential.state = "configured";
  assert.equal(providerState(provider, snapshot).key, "prepared");
  assert.equal(provider.enabled, true); assert.equal(tool.enabled, true);
});

test("custom MCP readiness uses connection evidence and preserves discovered Tools across settings restarts", () => {
  const connection = { id: "custom", enabled: true, authentication: "token", credential: { configured: true }, status: { state: "not_checked" }, tools: [] };
  assert.equal(connectionState(connection).key, "connection");
  connection.status.state = "error";
  assert.equal(connectionState(connection).label, "连接检查未通过");
  connection.tools = [{ name: "calculate", enabled: true }];
  assert.notEqual(connectionState(connection).key, "prepared");
  connection.status.state = "connected";
  assert.equal(connectionState(connection).key, "prepared");
  connection.status.state = "not_checked";
  assert.equal(connectionState(connection).key, "prepared");
  connection.credential.configured = false;
  assert.equal(connectionState(connection).key, "credentials");
  connection.credential.configured = true; connection.tools[0].enabled = false;
  assert.equal(connectionState(connection).label, "MCP 已启用", "MCP and individual Tool choices are independent");
  connection.enabled = false;
  assert.equal(connectionState(connection).label, "MCP 已关闭");
});

test("saved credentials and environment checks cannot override a deliberately closed Tool", () => {
  const tool = { id: "remote", provider: "cloud", enabled: false, credential: { requirement: "required", state: "configured" } };
  assert.equal(toolState(tool, { providers: [{ id: "cloud", enabled: true }], tools: [tool] }).key, "disabled");
});

test("Skill changes survive reopen without changing shared Tool, MCP, environment or credential choices", async t => {
  const f = await fixture(t);
  f.backend.sourceCapabilities[0].sdkIds = ["shared"];
  f.backend.sourceCapabilities.push({ ...f.backend.sourceCapabilities[0], id: "second" });
  let checks = 0, ready = false;
  f.options.environments = { snapshot: async () => [{ id: "shared", ready, state: ready ? "ready" : "not_installed" }], status: async () => { checks++; return { ready }; } };
  const settings = new Settings(f.options);
  let snapshot = await settings.snapshot();
  assert.equal(providerState(snapshot.providers[0], snapshot).blocked, true);
  await settings.command({ action: "skill.set", id: "example", enabled: false, revision: snapshot.revision });
  snapshot = await settings.snapshot();
  await settings.command({ action: "tool.set", id: "calculate", enabled: false, revision: snapshot.revision });
  snapshot = await settings.snapshot();
  await settings.command({ action: "skill.set", id: "example", enabled: true, revision: snapshot.revision });
  await f.credentials.set(serviceCredentialRef("example"), "fixture-only");
  ready = true;
  const reopened = await new Settings(f.options).snapshot();
  assert.deepEqual(reopened.skills.map(skill => skill.enabled), [true, true]);
  assert.equal(reopened.tools[0].enabled, false);
  assert.equal(reopened.providers[0].enabled, true);
  assert.equal(reopened.environments[0].ready, true);
  assert.equal(providerState(reopened.providers[0], reopened).blocked, false);
  assert.deepEqual(reopened.skills[0].relations.environmentIds, ["shared"]);
  assert.equal(await f.credentials.resolve(serviceCredentialRef("example")), "fixture-only");
  assert.equal(checks, 0); assert.equal(f.calls(), 0);
});

test("navigation Skills and knowledge-only Skills describe preparation without implying all environments are required", () => {
  const title = skillPresentation({ id: "quantum-algorithms", title: "root", description: "root" });
  assert.equal(title.title, "量子算法导航");
  assert.equal(skillPreparation({ relations: { toolIds: [], environmentIds: [], usesHostTools: false } }, { tools: [] }), "无需安装");
  assert.equal(skillPreparation({ relations: { toolIds: [], environmentIds: ["a", "b"] } }, { tools: [] }), "按任务选择运行环境");
});

test("a same-name unsupported declaration cannot hide the actual Tool environment", async t => {
  const f = await fixture(t);
  f.backend.sourceCapabilities.unshift({ id: "not-bundled", status: "unsupported", tools: ["calculate"], sdkIds: [] });
  f.backend.sourceCapabilities[1].sdkIds = ["actual-environment"];
  f.backend.providers[0].tools = [{ name: "calculate", capabilityId: "example" }];
  assert.equal(f.settings.environmentFor("calculate"), "actual-environment");
  assert.deepEqual((await f.settings.snapshot()).skills[0].relations.environmentIds, ["actual-environment"]);
});

test("unreadable FieldQKit credentials block configuration inspection but not local simulator discovery", () => {
  const service = { ...SERVICES.find(item => item.id === "fieldqkit"), configuration: "unavailable", missing: [] };
  const inspect = { id: "inspect_fieldqkit_setup", provider: "fieldqkit", enabled: true };
  const discover = { ...inspect, id: "discover_fieldqkit_backends" };
  inspect.credential = toolCredential(inspect, [service]); discover.credential = toolCredential(discover, [service]);
  const snapshot = { tools: [inspect, discover], providers: [{ id: "fieldqkit", enabled: true }] };
  assert.equal(toolState(inspect, snapshot).key, "credentials");
  assert.equal(toolState(discover, snapshot).label, "本地已准备");
});

test("custom Tools participate in the unified catalog and preserve per-Tool readiness", () => {
  const connection = { id: "custom", authentication: "none", enabled: true, tools: [
    { name: "read", title: "Read", enabled: true, annotations: { readOnlyHint: true } },
    { name: "write", enabled: false },
  ] };
  const snapshot = { tools: [], providers: [], connections: [connection] };
  const tools = settingsTools(snapshot);
  assert.equal(tools.length, 2);
  assert.deepEqual(tools.map(tool => toolState(tool, snapshot).key), ["prepared", "disabled"]);
  assert.equal(tools[0].connectionId, "custom");
  assert.equal(tools[0].readOnly, true);
  connection.enabled = false;
  assert.ok(tools.every(tool => toolState(tool, snapshot).key === "mcp"));
  connection.enabled = true;
  connection.status = { state: "error" };
  assert.ok(tools.every(tool => toolState(tool, snapshot).key === "connection"));
});
