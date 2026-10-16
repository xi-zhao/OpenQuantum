import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fixture } from "./fixtures/codex-settings.mjs";
import { Settings } from "../src/settings/codex/application.mjs";
import { createCredentialChannel } from "../src/settings/codex/credential-channel.mjs";
import { createCredentialWindow } from "../src/settings/codex/credential-window.mjs";
import { sealCredentialField } from "../src/settings/credential-seal.mjs";
import { serviceById, serviceCredentialRef, missingFields } from "../src/settings/codex/service-catalog.mjs";
import { runtimeEnvironment } from "../src/settings/codex/environments.mjs";
import { runPasqalWorkflow, validatePasqalCommand } from "../src/settings/codex/pasqal-workflow.mjs";
import { skillPreparation } from "../runtime/chatgpt/ui/settings-model.mjs";

const id = "pasqal_cloud", ref = serviceCredentialRef(id), token = "synthetic-pasqal-token";
const device = ["device", "--project-id", "fixture", "--device", "test", "--out", "device.json"];
async function setup(t) {
  const f = await fixture(t);
  f.backend.sourceCapabilities.push({ id: "pasqal-experiments", title: "Pasqal", status: "available", skill: "text", tools: [], sdkIds: ["pulser-dynamics"] });
  return f;
}
test("Pasqal encrypted fields save, reopen, replace and remove without inventing an MCP", async t => {
  const f = await setup(t), channel = createCredentialChannel(f);
  t.after(() => channel.close());
  const write = async (field, value, operation = "set") => {
    const permission = await channel.prepare({ id, field, operation });
    const result = await channel.commit({ nonce: permission.nonce, ciphertext: await sealCredentialField(permission, operation === "set" ? { value } : {}) });
    assert.equal(result.status, 200);
  };
  const state = async () => (await new Settings(f.options).snapshot()).services.find(service => service.id === id);
  assert.equal((await state()).configuration, "incomplete");
  await write("PASQAL_USERNAME", "synthetic-user");
  assert.deepEqual((await state()).missing, ["PASQAL_PASSWORD"]);
  await write("PASQAL_PASSWORD", "synthetic-password");
  assert.equal((await state()).configuration, "configured");
  await write("PASQAL_AUTH_TOKEN", token);
  await write("PASQAL_AUTH_TOKEN", "replacement-token");
  const snapshot = await new Settings(f.options).snapshot();
  assert.doesNotMatch(JSON.stringify(snapshot), /synthetic-user|synthetic-password|replacement-token/);
  assert.ok(!snapshot.providers.some(provider => provider.id === id));
  assert.deepEqual(snapshot.skills.find(skill => skill.id === "pasqal-experiments").relations.credentialServiceIds, [id]);
  assert.equal(skillPreparation(snapshot.skills.find(skill => skill.id === "pasqal-experiments"), { ...snapshot, environments: [{ id: "pulser-dynamics", ready: true }] }), "本地已准备 · 云端凭据已保存");
  for (const [configuration, label] of [["unavailable", "本地已准备 · 云端凭据未读取"], ["unsupported", "本地已准备 · 云端凭据需单独配置"], ["incomplete", "本地已准备 · 云端待配置凭据"]]) {
    assert.equal(skillPreparation(snapshot.skills.find(skill => skill.id === "pasqal-experiments"), { ...snapshot,
      environments: [{ id: "pulser-dynamics", ready: true }], services: [{ id, configuration }] }), label);
  }
  await write("PASQAL_AUTH_TOKEN", null, "remove");
  assert.equal((await state()).configuration, "configured");
  await write("PASQAL_PASSWORD", null, "remove");
  assert.equal((await state()).configuration, "incomplete");
  await write("PASQAL_USERNAME", null, "remove");
  assert.equal(await f.credentials.resolve(ref), null);
  const window = await createCredentialWindow(f); t.after(() => window.close());
  assert.ok((await window.openService(id)).includes("/credentials#"));
});

test("Pasqal accepts either complete auth path and only advertises a present consumer", async t => {
  const service = serviceById(id);
  assert.deepEqual(missingFields(service, {}), ["PASQAL_AUTH_TOKEN"]);
  assert.deepEqual(missingFields(service, { PASQAL_PASSWORD: "test" }), ["PASQAL_USERNAME"]);
  assert.deepEqual(missingFields(service, { PASQAL_AUTH_TOKEN: token, PASQAL_USERNAME: "partial" }), []);
  const f = await fixture(t), channel = createCredentialChannel(f); t.after(() => channel.close());
  assert.equal((await f.settings.snapshot()).services.find(service => service.id === id).supported, false);
  await assert.rejects(channel.prepare({ id, field: "PASQAL_AUTH_TOKEN", operation: "set" }), /无效/);
});

async function runnerFixture(t) {
  const f = await setup(t);
  let acquired = 0, released = 0;
  const options = { root: f.root, pluginRoot: f.root, settings: f.settings, credentials: f.credentials,
    environments: { environment: runtimeEnvironment(path.join(f.root, "settings"), { ...process.env,
      PASQAL_AUTH_TOKEN: "ambient-secret", OTHER_SECRET: "unrelated-secret", PYTHONPATH: f.root, PYTHONINSPECT: "1", DYLD_INSERT_LIBRARIES: "injected" }),
    acquire: async () => { acquired++; return { release: async () => { released++; } }; } },
    launch: async ({ args }) => ({ command: "unused", args }),
    execute: async () => ({ done: true }) };
  await f.credentials.set(ref, JSON.stringify({ PASQAL_AUTH_TOKEN: token }));
  return { ...f, options, acquired: () => acquired, released: () => released };
}

test("fixed Pasqal child uses saved auth, isolates imports and redacts output with no cloud call", async t => {
  const f = await runnerFixture(t);
  const python = execFileSync("python3", ["-c", "import sys; print(sys.executable)"], { encoding: "utf8" }).trim();
  const directory = path.join(f.root, ".agents/skills/pasqal-experiments/scripts");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "workflow.py"), 'TRUSTED = True\n');
  await fs.writeFile(path.join(f.root, "workflow.py"), 'raise RuntimeError("cwd injection")\n');
  await fs.writeFile(path.join(directory, "experiment.py"), `import json,os,sys,workflow
assert workflow.TRUSTED
assert os.environ.get("OPENQUANTUM_PASQAL_STATE_ROOT") == sys.argv[-1] + ".state"
assert not any(k in os.environ for k in ['OTHER_SECRET','PYTHONPATH','PYTHONINSPECT','DYLD_INSERT_LIBRARIES'])
assert not any('synthetic' in arg for arg in sys.argv)
assert os.environ.get('PASQAL_AUTH_TOKEN') == '${token}'
assert 'PASQAL_PASSWORD' not in os.environ
print(json.dumps({'authenticated': True, 'token': os.environ['PASQAL_AUTH_TOKEN']}))
`);
  delete f.options.execute; // A real isolated Python process, with a trusted offline fixture.
  f.options.cwd = f.root;
  const invocation = [...device.slice(0, -1), path.join(f.root, "device.json")];
  f.options.stateRoot = invocation.at(-1) + ".state";
  f.options.launch = async ({ args }) => ({ command: python, args: ["-B", ...args] });
  const output = await runPasqalWorkflow(invocation, f.options);
  assert.equal(output.exitCode, 0, output.stderr);
  assert.deepEqual(JSON.parse(output.stdout), { authenticated: true, token: "[redacted]" });
  assert.equal(f.acquired(), 1); assert.equal(f.released(), 1);
});

test("offline, arbitrary-code, missing-confirmation and disabled Skill paths never resolve secrets", async t => {
  const f = await runnerFixture(t);
  f.options.credentials = { resolve: () => { throw new Error("must not read secrets"); } };
  for (const args of [["prepare"], ["analyze"], ["local-run"], ["-c", "print(1)"], [...device, "--script", "foreign.py"], ["cancel", "--receipt", "receipt.json"]]) await assert.rejects(runPasqalWorkflow(args, f.options), /仅支持|参数|确认/);
  assert.equal(f.acquired(), 0);
  await fs.mkdir(path.dirname(f.settings.codexFile), { recursive: true });
  await fs.writeFile(f.settings.codexFile, '[[skills.config]]\nname="openquantum:pasqal-experiments"\nenabled=false\n');
  await assert.rejects(runPasqalWorkflow(device, f.options), /Skill 已关闭/);
  assert.equal(f.acquired(), 0);
});

test("username/password reach only the child, failures and cancellation release without retries", async t => {
  const f = await runnerFixture(t);
  await f.credentials.set(ref, JSON.stringify({ PASQAL_USERNAME: "fixture-user", PASQAL_PASSWORD: "fixture-password" }));
  let attempts = 0;
  f.options.execute = async options => {
    attempts++;
    assert.equal(options.env.PASQAL_USERNAME, "fixture-user");
    assert.equal(options.env.PASQAL_PASSWORD, "fixture-password");
    assert.equal(options.env.PASQAL_AUTH_TOKEN, undefined);
    throw new Error("secret exception fixture-password");
  };
  let output = await runPasqalWorkflow(device, f.options);
  assert.equal(output.exitCode, 1); assert.doesNotMatch(output.stderr, /fixture-password/);
  f.options.signal = AbortSignal.abort();
  await assert.rejects(runPasqalWorkflow(device, f.options), { name: "AbortError" });
  assert.equal(attempts, 1); assert.equal(f.released(), 1);
  delete f.options.signal;
  await f.credentials.remove(ref);
  await assert.rejects(runPasqalWorkflow(device, f.options), /保存 Token/);
  assert.equal(attempts, 1); assert.equal(f.released(), 2);
  for (const args of [["submit", "--plan", "p", "--receipt", "r", "--approve-plan", "digest"], ["recover", "--receipt", "r"], ["close", "--receipt", "r", "--confirm"], ["cancel", "--receipt", "r", "--confirm"], ["harvest", "--receipt", "r", "--out", "o"]]) assert.doesNotThrow(() => validatePasqalCommand(args));
});

test("Pasqal uses the same SDK restrictions before credentials and immediately before execution", async t => {
  const f = await runnerFixture(t);
  f.backend.sourceCapabilities.push({ id: "pulser-dynamics", title: "Pulser", status: "available", skill: "text", tools: ["simulate_pulser"], sdkIds: ["pulser-dynamics"] });
  f.backend.providers.push({ key: "pulser_local" });
  f.backend.tools.push({ name: "simulate_pulser" });
  const route = f.backend.providerFor;
  f.backend.providerFor = name => name === "simulate_pulser" ? "pulser_local" : route(name);
  const change = async (action, id, enabled) => f.settings.command({ action, id, enabled, revision: (await f.settings.read()).revision });
  let reads = 0, executed = 0;
  f.options.credentials = { resolve: async () => { reads++; return JSON.stringify({ PASQAL_AUTH_TOKEN: token }); } };
  f.options.execute = async () => { executed++; return {}; };
  for (const [action, id] of [["provider.set", "pulser_local"], ["tool.set", "simulate_pulser"], ["skill.set", "pulser-dynamics"]]) {
    await change(action, id, false);
    await assert.rejects(runPasqalWorkflow(device, f.options), /禁止关联/);
    assert.equal(reads, 0); assert.equal(f.acquired(), 0); assert.equal(executed, 0);
    await change(action, id, true);
  }
  f.options.launch = async ({ args }) => { await change("provider.set", "pulser_local", false); return { command: "unused", args }; };
  const output = await runPasqalWorkflow(device, f.options);
  assert.equal(output.exitCode, 1); assert.match(output.stderr, /禁止关联/);
  assert.equal(executed, 0); assert.equal(f.released(), 1);
});

test("cancelling the real child waits for process cleanup before releasing its environment", { timeout: 10000, skip: process.platform === "win32" }, async t => {
  const f = await runnerFixture(t), controller = new AbortController();
  const python = execFileSync("python3", ["-c", "import sys; print(sys.executable)"], { encoding: "utf8" }).trim();
  const directory = path.join(f.root, ".agents/skills/pasqal-experiments/scripts");
  const pidsFile = path.join(f.root, "pids.json");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "experiment.py"), `import json,os,subprocess,sys,time
p = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])
with open(sys.argv[-1], 'w') as f: json.dump([os.getpid(), p.pid], f)
time.sleep(60)
`);
  delete f.options.execute;
  f.options.launch = async ({ args }) => ({ command: python, args: ["-B", ...args] });
  f.options.signal = controller.signal;
  let pids, released = false;
  f.options.environments.acquire = async () => ({ release: async () => {
    assert.throws(() => process.kill(pids[0], 0), { code: "ESRCH" });
    released = true;
  } });
  const pending = runPasqalWorkflow([...device.slice(0, -1), pidsFile], f.options);
  t.after(() => controller.abort());
  for (let i = 0; i < 100 && !pids; i++) {
    try { pids = JSON.parse(await fs.readFile(pidsFile, "utf8")); } catch { await delay(20); }
  }
  assert.ok(pids);
  controller.abort();
  const result = await pending;
  assert.match(result.stderr, /已中断/); assert.equal(released, true);
  for (let i = 0; i < 100; i++) {
    try { process.kill(pids[1], 0); } catch { return; }
    await delay(20);
  }
  assert.fail("owned descendant survived cancellation");
});
