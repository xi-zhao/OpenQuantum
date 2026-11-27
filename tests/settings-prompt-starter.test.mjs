import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PROJECT_ROOT, providerGroups, readCapabilities } from "../runtime/chatgpt/catalog.mjs";
import { connectProvider } from "../runtime/chatgpt/provider-connection.mjs";
import { accountsForOwner, credentialEntries, skillOnlyAccountOwners } from "../runtime/chatgpt/ui/credential-groups.mjs";
import { starterPromptFor } from "../runtime/chatgpt/ui/prompt-starter.mjs";
import { skillPreparationState } from "../runtime/chatgpt/ui/settings-model.mjs";
import { compileToolInput } from "../src/lib/tool-backend.mjs";
import { skillRelations } from "../src/settings/codex/relations.mjs";
import { SERVICES } from "../src/settings/codex/service-catalog.mjs";

const capabilities = await readCapabilities();
const providers = providerGroups(capabilities);

async function listTools(t, server) {
  const client = await connectProvider(providers.find(provider => provider.key === server), PROJECT_ROOT);
  t.after(() => client.close());
  return (await client.listTools()).tools;
}

test("QEC starter parameters satisfy the live MCP input schema and reproduce the frozen request", async t => {
  const prompt = starterPromptFor({ id: "qec-memory-experiment" });
  const input = {
    basis: prompt.match(/([XZ])-memory/)?.[1].toLowerCase(),
    distance: Number(prompt.match(/\bd=(\d+)/)?.[1]),
    rounds: Number(prompt.match(/(\d+) 轮/)?.[1]),
    physicalErrorRate: Number(prompt.match(/\bp=([\d.e+-]+)/)?.[1]),
    shots: Number(prompt.match(/\bshots=(\d+)/)?.[1]),
    seed: Number(prompt.match(/\bseed=(\d+)/)?.[1]),
  };
  const tool = (await listTools(t, "qec_local")).find(item => item.name === "run_qec_memory_experiment");
  const validate = compileToolInput(tool.inputSchema);
  assert.ok(validate(input), JSON.stringify(validate.errors));
  const fixture = new URL("../.agents/skills/qec-memory-experiment/evals/fixtures/zero-noise.json", import.meta.url);
  assert.deepEqual(input, JSON.parse(await readFile(fixture, "utf8")).request);
});

test("FieldQKit starter requests only the local read-only setup inspection", async t => {
  const prompt = starterPromptFor({ id: "fieldqkit-hardware" }, "hardware");
  const operations = (await listTools(t, "fieldqkit")).filter(tool => prompt.includes(tool.name));
  assert.deepEqual(operations.map(tool => tool.name), ["inspect_fieldqkit_setup"]);
  assert.equal(operations[0].annotations.readOnlyHint, true);
  assert.equal(operations[0].annotations.openWorldHint, false);
  assert.match(prompt, /本地配置/);
  assert.doesNotMatch(prompt, /后端|量子位条件/);
});

test("each counted cloud account has a catalog owner, including Pasqal and the shared IBM token", () => {
  const groups = credentialEntries(SERVICES);
  const servers = providers.filter(provider => provider.kind !== "native").map(provider => ({ id: provider.key }));
  const backend = { providers, providerFor: id => providers.find(provider => provider.tools.some(tool => tool.name === id))?.key };
  const skills = capabilities.filter(capability => capability.skill).map(capability => ({
    id: capability.id, relations: skillRelations(capability, backend, SERVICES),
  }));
  const owners = skillOnlyAccountOwners(groups, servers, skills);
  for (const group of groups) {
    assert.ok([...servers, ...owners].some(item => accountsForOwner(item, groups).includes(group)), group.title);
  }
  assert.deepEqual(owners.filter(skill => accountsForOwner(skill, groups).some(group => group.title === "Pasqal Cloud")).map(skill => skill.id), ["pasqal-experiments"]);
  const ibm = groups.find(group => group.id === "ibm_quantum");
  assert.deepEqual(ibm.fields.map(field => field.name), ["QISKIT_IBM_TOKEN"]);
  assert.deepEqual(servers.filter(server => ibm.serverNames.includes(server.id)).map(server => server.id).sort(),
    ["qiskit_ibm_runtime", "qiskit_ibm_transpiler", "quantum_hardware"]);
  assert.ok(!owners.some(skill => accountsForOwner(skill, groups).includes(ibm)));
});

test("Skill readiness distinguishes zero, one and both prepared Tools from their actual states", () => {
  const skill = { id: "example", relations: { toolIds: ["one", "two"], environmentIds: ["first", "second"] } };
  const snapshot = {
    providers: [{ id: "local", enabled: true }],
    tools: [{ id: "one", environmentId: "first" }, { id: "two", environmentId: "second" }].map(tool => ({ ...tool, provider: "local", enabled: true })),
    environments: [{ id: "first", ready: false }, { id: "second", ready: false }],
  };
  assert.deepEqual(skillPreparationState(skill, snapshot), { key: "pending", label: "关联 Tool 待准备" });
  snapshot.environments[0].ready = true;
  assert.deepEqual(skillPreparationState(skill, snapshot), { key: "partial", label: "1 / 2 个 Tool 已准备" });
  for (const [state, action] of [["preparing", "正在安装"], ["cancelling", "正在取消"]]) {
    snapshot.environments[1].state = state;
    assert.deepEqual(skillPreparationState(skill, snapshot), { key: "preparing", label: `${action}，1 / 2 个 Tool 已准备` });
  }
  snapshot.environments[1].state = "ready";
  snapshot.environments[1].ready = true;
  assert.deepEqual(skillPreparationState(skill, snapshot), { key: "prepared", label: "关联 Tool 已准备" });
});

test("audit, navigation, and host-scoped Skills receive scope-accurate starter prompts", () => {
  const emlint = starterPromptFor({ id: "emlint-dem-audit", title: "emlint DEM 审计" }, "qec");
  assert.match(emlint, /DEM/);
  assert.doesNotMatch(emlint, /采样预算/);

  const mlGuide = starterPromptFor(
    { id: "quantum-guide-algorithms-quantum-machine-learning", title: "量子机器学习方法选择" },
    "learning",
  );
  assert.match(mlGuide, /筛选最合适的子 Skill/);
  assert.doesNotMatch(mlGuide, /核对数值梯度/);

  const codexDiag = starterPromptFor({ id: "platform-diagnostics", title: "OpenQuantum 平台诊断" }, "reference", { desktop: false });
  assert.match(codexDiag, /Codex/);
  assert.doesNotMatch(codexDiag, /Harness/);

  const desktopDiag = starterPromptFor({ id: "platform-diagnostics", title: "OpenQuantum 平台诊断" }, "reference", { desktop: true });
  assert.match(desktopDiag, /Harness/);

  const qcec = starterPromptFor({ id: "quantum-circuit-verification", title: "量子电路等价性验证" }, "circuits");
  assert.match(qcec, /OPENQASM 2\.0/);
  assert.match(qcec, /h q\[0\]/);
  assert.match(qcec, /u2\(0,pi\)/);

  assert.equal(starterPromptFor({ id: "unknown-custom-skill", title: "Custom" }, "other"), "");
});
