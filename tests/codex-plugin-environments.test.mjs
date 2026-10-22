import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { Environments } from "../src/settings/codex/environments.mjs";
import { digest, withLock } from "../src/settings/codex/storage.mjs";
import { OPTIONAL_RUNTIMES, runtimeRequirements } from "../src/settings/codex/runtime-catalog.mjs";
import { inspectEnvironment, validateDriverConfiguration } from "../src/settings/codex/environment-check.mjs";
import { readCapabilities, providerGroups } from "../runtime/chatgpt/catalog.mjs";
import { runSetupCommand } from "../src/lib/setup-process.mjs";
import { runEnvironmentJob } from "../src/settings/codex/environment-worker.mjs";
import { Settings } from "../src/settings/codex/application.mjs";
import { environmentLabel } from "../runtime/chatgpt/ui/environment-cards.mjs";
import { environmentState, providerState } from "../runtime/chatgpt/ui/settings-model.mjs";

const project = path.resolve(import.meta.dirname, "..");
async function fixture(t, id = "qrisp-arithmetic") {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oq-environment-")), directory = path.join(root, "state");
  await fs.mkdir(path.join(root, ".agents/skills", id), { recursive: true });
  await fs.mkdir(directory);
  await fs.writeFile(path.join(root, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [{ id, title: id, language: "python", modules: ["inspect"] }] }));
  await fs.writeFile(path.join(root, ".agents/capability-packages.yml"), `packages:\n  - id: ${id}\n`);
  await fs.writeFile(path.join(root, ".agents/skills", id, "uv.lock"), 'version = 1\npackage = []\n');
  await fs.writeFile(path.join(root, ".agents/skills", id, "pyproject.toml"), '[project]\nname = "fixture"\ndependencies = []\n');
  await fs.writeFile(path.join(directory, "control.json"), "{}");
  const options = { root, directory, worker: path.join(project, "tests/fixtures/environment-worker.mjs"), environment: { PATH: process.env.PATH, HOME: os.homedir() } };
  const manager = new Environments(options);
  t.after(async () => {
    const record = await manager.read(id).catch(() => null);
    if (record?.job && ["starting", "running", "cancelling"].includes(record.job.status)) {
      await manager.cancel(id, record.job.id);
      await waitFor(() => manager.status(id), value => !["preparing", "cancelling"].includes(value.state));
    }
    await withLock(manager.file(id), async () => {});
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, directory, id, manager, options, control: value => fs.writeFile(path.join(directory, "control.json"), JSON.stringify(value)) };
}
async function waitFor(read, match, timeout = 12000) {
  const until = Date.now() + timeout;
  let value;
  do { value = await read(); if (match(value)) return value; await delay(50); } while (Date.now() < until);
  assert.fail(`Timed out: ${JSON.stringify(value)}`);
}

test("all thirteen reviewed opt-in providers are available, initially off and consistently named", async () => {
  const capabilities = await readCapabilities(), providers = providerGroups(capabilities);
  for (const { id, server } of OPTIONAL_RUNTIMES) {
    const capability = capabilities.find(item => item.id === id);
    assert.equal(capability.status, "available", id);
    assert.equal(providers.find(item => item.key === server).defaultEnabled, false, id);
    assert.doesNotMatch(capability.summary, /首次调用会|第二家|当前宿主未接入/);
    assert.ok(/[\u4e00-\u9fff]/.test(capability.title), id);
    assert.ok(!runtimeRequirements(id).fields.some(field => /token|password|key/i.test(field.name)));
  }
  assert.equal(runtimeRequirements("cudaq-simulation", "win32", "x64").supported, false);
  assert.equal(runtimeRequirements("cudaq-simulation", "darwin", "arm64").supported, true);
});

test("concurrent clicks install once and a new manager sees the durable receipt without starting work", async t => {
  const f = await fixture(t);
  assert.equal((await f.manager.status(f.id)).state, "not_installed");
  await Promise.all([f.manager.start(f.id, "install"), new Environments(f.options).start(f.id, "install")]);
  const fresh = new Environments(f.options);
  const status = await waitFor(() => fresh.status(f.id), value => value.ready);
  assert.equal(environmentLabel(status), "环境已准备");
  assert.equal((await fs.readFile(path.join(f.directory, "started"), "utf8")).trim().split("\n").length, 1);
  assert.equal((await fresh.read(f.id)).job.synced, true);
});

test("worker survives its starting host process; failure cannot create a ready receipt and can be checked again", async t => {
  const f = await fixture(t);
  await f.control({ fail: true });
  const code = `import {Environments} from ${JSON.stringify(new URL("../src/settings/codex/environments.mjs", import.meta.url).href)}; await new Environments(${JSON.stringify(f.options)}).start(${JSON.stringify(f.id)},"install");`;
  const starter = spawn(process.execPath, ["--input-type=module", "-e", code], { stdio: "ignore" });
  assert.equal((await once(starter, "exit"))[0], 0);
  const failed = await waitFor(() => f.manager.status(f.id), value => value.state === "failed");
  assert.equal(failed.ready, false); assert.equal(failed.job.synced, true);
  assert.equal(environmentLabel(failed), "检查未通过");
  assert.equal(environmentState(failed).action, "check");
  await f.control({}); await f.manager.start(f.id, "check");
  await waitFor(() => f.manager.status(f.id), value => value.ready);
});

test("cancel is owned by the job nonce, waits for a stubborn child and permits retry only after exit", { skip: process.platform === "win32", timeout: 20000 }, async t => {
  const f = await fixture(t); await f.control({ slow: true });
  await f.manager.start(f.id, "install");
  const pid = Number(await waitFor(() => fs.readFile(path.join(f.directory, "child.pid"), "utf8").catch(() => ""), Boolean));
  const running = await f.manager.status(f.id);
  await assert.rejects(f.manager.cancel(f.id, "stale-job"), /已变化/);
  await f.manager.cancel(f.id, running.job.id);
  await f.manager.start(f.id, "install");
  assert.equal((await f.manager.status(f.id)).job.id, running.job.id);
  await waitFor(() => f.manager.status(f.id), value => value.state === "cancelled");
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  await f.control({}); await f.manager.start(f.id, "install");
  await waitFor(() => f.manager.status(f.id), value => value.ready);
});

test("dead worker and dead file lock recover; active calculation blocks setup and configuration", async t => {
  const f = await fixture(t);
  await f.manager.write(f.id, { schemaVersion: 1, id: f.id, configuration: {}, leases: [], job: { id: "dead", status: "running", pid: 2147483647 } });
  await fs.writeFile(`${f.manager.file(f.id)}.openquantum.lock`, JSON.stringify({ pid: 2147483647 }));
  assert.equal((await f.manager.status(f.id)).state, "interrupted");
  await f.manager.start(f.id, "install"); await waitFor(() => f.manager.status(f.id), value => value.ready);
  const lease = await f.manager.acquire(f.id, "calculate");
  try {
    await assert.rejects(f.manager.start(f.id, "install"), /正在执行任务/);
    await assert.rejects(f.manager.configure(f.id, {}, (await f.manager.status(f.id)).configurationRevision), /执行任务/);
  } finally { await lease.release(); }
  await fs.appendFile(path.join(f.root, ".agents/skills", f.id, "uv.lock"), "# changed\n");
  assert.equal((await f.manager.status(f.id)).state, "needs_repair");
  await assert.rejects(f.manager.acquire(f.id, "calculate"), /尚未准备好/);
});

test("disposing an owner waits for its installer tree and cannot cancel a different owner's job", { skip: process.platform === "win32", timeout: 20000 }, async t => {
  const f = await fixture(t); await f.control({ slow: true });
  const bystander = new Environments(f.options);
  await f.manager.start(f.id, "install");
  const pid = Number(await waitFor(() => fs.readFile(path.join(f.directory, "child.pid"), "utf8").catch(() => ""), Boolean));
  await bystander.close();
  assert.equal((await f.manager.status(f.id)).state, "preparing");
  await f.manager.close();
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  assert.equal((await new Environments(f.options).status(f.id)).state, "cancelled");
  await assert.rejects(f.manager.start(f.id, "install"), /关闭/);
});

test("configuration persists, rejects unknown fields and stale writers; NetQASM compilation stays independent", async t => {
  const f = await fixture(t, "netqasm-network");
  const revision = (await f.manager.status(f.id)).configurationRevision;
  await assert.rejects(f.manager.configure(f.id, { token: "never-store" }, revision), /无效/);
  await assert.rejects(f.manager.configure(f.id, { simulationPython: "relative/python" }, revision), /绝对路径/);
  await f.manager.configure(f.id, { simulationPython: process.execPath }, revision);
  assert.equal((await new Environments(f.options).status(f.id)).configuration.simulationPython, process.execPath);
  assert.equal((await f.manager.status(f.id)).state, "not_installed");
  await assert.rejects(f.manager.configure(f.id, {}, revision), /已更新/);
  await f.manager.start(f.id, "install"); await waitFor(() => f.manager.status(f.id), value => value.ready);
  const lease = await f.manager.acquire(f.id, "prepare_netqasm_bell_program"); await lease.release();
  await assert.rejects(f.manager.acquire(f.id, "simulate_squidasm_bell_pairs"), /网络仿真环境/);
});

test("checking Python uses a saved non-shadowing script and detects a removed interpreter or changed marker", { skip: process.platform === "win32" }, async t => {
  const f = await fixture(t);
  const directory = path.join(f.manager.environment.OPENQUANTUM_PYTHON_ENV_ROOT, f.id);
  await fs.mkdir(path.join(directory, "bin"), { recursive: true });
  const interpreter = execFileSync("python3", ["-c", "import sys; print(sys.executable)"], { encoding: "utf8" }).trim();
  await fs.symlink(interpreter, path.join(directory, "bin/python"));
  const marker = path.join(directory, "openquantum-lock.sha256");
  await fs.writeFile(marker, digest(await fs.readFile(path.join(f.root, ".agents/skills", f.id, "uv.lock"))));
  const record = await f.manager.read(f.id);
  record.check = await inspectEnvironment(f.manager, f.id, record);
  await f.manager.write(f.id, record);
  assert.equal((await f.manager.status(f.id)).ready, true);
  assert.deepEqual(await fs.readdir(path.join(f.directory, "checks")), []);
  await fs.writeFile(marker, "changed"); assert.equal((await f.manager.status(f.id)).ready, false);
  assert.equal((await f.manager.status(f.id)).state, "needs_repair");
  await fs.writeFile(marker, digest(await fs.readFile(path.join(f.root, ".agents/skills", f.id, "uv.lock"))));
  await fs.unlink(path.join(directory, "bin/python"));
  assert.equal(environmentState(await f.manager.status(f.id)).action, "install");
});

test("an unsuccessful check of an absent QCEC or TyxonQ environment leads to install without changing saved choices", async t => {
  for (const id of ["quantum-circuit-verification", "tyxonq-workbench"]) {
    const f = await fixture(t, id);
    const record = { ...(await f.manager.read(id)), job: { id: "old-check", operation: "check", status: "failed", message: "运行环境缺失或与固定依赖不一致" } };
    await f.manager.write(id, record);
    const before = await fs.readFile(f.manager.file(id), "utf8");
    const status = await new Environments(f.options).status(id);
    assert.equal(status.state, "not_installed"); assert.equal(status.installation, "missing");
    assert.equal(environmentState(status).action, "install");
    const provider = { id: "local", enabled: true }, tool = { id: "calculate", provider: "local", enabled: true, environmentId: id };
    const state = providerState(provider, { providers: [provider], tools: [tool], environments: [status] });
    assert.equal(state.label, "未安装"); assert.equal(state.blocked, true);
    assert.equal(provider.enabled, true); assert.equal(tool.enabled, true);
    assert.equal(await fs.readFile(f.manager.file(id), "utf8"), before);
    await assert.rejects(fs.access(path.join(f.directory, "started")), { code: "ENOENT" });
  }
});

test("current files determine the next action after a failed, cancelled or interrupted install", async t => {
  const f = await fixture(t);
  const directory = path.join(f.manager.environment.OPENQUANTUM_PYTHON_ENV_ROOT, f.id);
  await fs.mkdir(path.join(directory, "bin"), { recursive: true });
  const executable = path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "fixture, never executed", { mode: 0o755 });
  const marker = path.join(directory, "openquantum-lock.sha256");
  await fs.writeFile(marker, digest(await fs.readFile(path.join(f.root, ".agents/skills", f.id, "uv.lock"))));
  assert.equal((await f.manager.status(f.id)).state, "needs_check");
  const record = await f.manager.read(f.id);
  record.job = { id: "synced-check-failed", operation: "install", status: "failed", synced: true };
  await f.manager.write(f.id, record);
  assert.equal(environmentState(await f.manager.status(f.id)).action, "check");
  await fs.unlink(executable);
  assert.equal((await f.manager.status(f.id)).installation, "incomplete");
  assert.equal(environmentState(await f.manager.status(f.id)).action, "install");
  await fs.unlink(marker);
  for (const status of ["failed", "cancelled", "interrupted"]) {
    record.job.status = status; await f.manager.write(f.id, record);
    assert.equal((await f.manager.status(f.id)).installation, "missing");
    assert.equal(environmentState(await f.manager.status(f.id)).action, "install");
  }
});

test("native metadata without its executable needs repair, while a missing custom QDMI file needs configuration", async t => {
  const f = await fixture(t, "qsyn-compilation");
  const project = path.join(f.root, ".agents/skills", f.id);
  const manifest = JSON.stringify({ executable: "qsyn", target: "qsyn" }), lock = JSON.stringify({ sources: [] });
  await fs.writeFile(path.join(f.root, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [{ id: f.id, title: f.id, language: "native", modules: [], nativeProject: { manifest: "native-project.json", lock: "native-lock.json" } }] }));
  await fs.writeFile(path.join(project, "native-project.json"), manifest); await fs.writeFile(path.join(project, "native-lock.json"), lock);
  const directory = path.join(f.manager.environment.OPENQUANTUM_NATIVE_SDK_ROOT, f.id);
  await fs.mkdir(path.join(directory, "bin"), { recursive: true });
  await fs.writeFile(path.join(directory, "openquantum-native.json"), JSON.stringify({ platform: process.platform, arch: process.arch, manifestSha256: digest(manifest), dependencyLockSha256: digest(lock) }));
  assert.equal((await f.manager.status(f.id)).state, "needs_repair");
  const executable = path.join(directory, "bin", process.platform === "win32" ? "qsyn.exe" : "qsyn");
  await fs.writeFile(executable, "fixture, never executed", { mode: 0o755 });
  assert.equal((await f.manager.status(f.id)).state, "needs_check");
  await fs.writeFile(path.join(directory, "openquantum-native.json"), "null");
  assert.equal((await f.manager.status(f.id)).state, "needs_repair");
  await fs.unlink(executable);
  assert.equal(environmentState(await f.manager.status(f.id)).action, "install");
  const qdmi = await fixture(t, "qdmi-device");
  const record = await qdmi.manager.read(qdmi.id);
  record.configuration.driverConfiguration = path.join(qdmi.root, "removed-driver.json");
  await qdmi.manager.write(qdmi.id, record);
  assert.equal((await qdmi.manager.status(qdmi.id)).state, "needs_configuration");
  assert.equal(environmentState(await qdmi.manager.status(qdmi.id)).action, undefined);
});

test("an unreadable interpreter is not reported as a missing installation", { skip: process.platform === "win32" || process.getuid?.() === 0 }, async t => {
  const f = await fixture(t);
  const directory = path.join(f.manager.environment.OPENQUANTUM_PYTHON_ENV_ROOT, f.id, "bin");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "python"), "fixture", { mode: 0o600 });
  const status = await f.manager.status(f.id);
  assert.equal(status.state, "unreadable");
  assert.equal(environmentState(status).action, undefined);
  const record = await f.manager.read(f.id);
  record.check = { ready: true, fingerprint: await f.manager.fingerprint(f.id), paths: [path.join(directory, "python")], markers: [] };
  await f.manager.write(f.id, record);
  assert.equal((await f.manager.status(f.id)).ready, false);
  assert.equal((await f.manager.status(f.id)).state, "unreadable");
});

test("QDMI validation rejects modified libraries and unknown configuration fields", async t => {
  const f = await fixture(t, "qdmi-device");
  const file = path.join(f.directory, "driver.json"), library = path.join(f.directory, "driver.dylib");
  await fs.writeFile(library, "fixture-native-library");
  const config = { interfaceVersion: "1.3.3", driverKind: "example", driver: { path: library, sha256: digest(await fs.readFile(library)) } };
  await fs.writeFile(file, JSON.stringify(config));
  assert.equal((await validateDriverConfiguration(file)).markers.length, 2);
  await fs.writeFile(library, "changed"); await assert.rejects(validateDriverConfiguration(file), /摘要不一致/);
  await fs.writeFile(file, JSON.stringify({ ...config, command: "forbidden" }));
  await assert.rejects(validateDriverConfiguration(file), /已审阅/);
});

test("provider enablement persists independently of install; calls acquire and release the environment lease", async t => {
  const f = await fixture(t);
  let calls = 0;
  const backend = { root: f.root, sourceCapabilities: [{ id: f.id, sdkIds: [f.id], title: "Qrisp", status: "available", tools: ["calculate"], skill: "text" }],
    providers: [{ key: "qrisp_local", defaultEnabled: false, tools: [{ name: "calculate" }] }], tools: [{ name: "calculate" }], providerFor: () => "qrisp_local",
    call: async (_name, _args, _signal, authorize, env) => { assert.equal(await authorize(), true); assert.ok(env.OPENQUANTUM_PYTHON_ENV_ROOT); await assert.rejects(f.manager.start(f.id, "install"), /正在执行/); calls++; return { content: [] }; } };
  const options = { backend, credentials: {}, environments: f.manager, directory: f.directory, codexHome: path.join(f.root, "codex"), skillRoot: path.join(f.root, "skills") };
  const settings = new Settings(options);
  const enable = async enabled => settings.command({ action: "provider.set", id: "qrisp_local", enabled, revision: (await settings.read()).revision });
  await enable(false);
  await enable(true);
  assert.equal(JSON.parse((await settings.callBuiltin("calculate", {})).content[0].text).state, "environment_required");
  assert.equal(calls, 0);
  await f.manager.start(f.id, "install"); await waitFor(() => f.manager.status(f.id), value => value.ready);
  assert.equal(await settings.enabled("calculate"), true);
  await enable(true); assert.equal(await new Settings(options).enabled("calculate"), true);
  await settings.callBuiltin("calculate", {}); assert.equal(calls, 1);
  assert.equal((await f.manager.read(f.id)).leases.length, 0);
  await enable(false); assert.equal(await new Settings(options).enabled("calculate"), false);
});

test("setup reaps descendants holding output pipes when the direct child has already exited", { skip: process.platform === "win32", timeout: 5000 }, async () => {
  const output = await runSetupCommand(process.execPath, ["-e", `const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'}); console.log(child.pid); child.unref();`], { capture: true, timeoutMs: 2000 });
  // Pipe closure can arrive before the OS finishes reaping the killed descendant.
  await waitFor(() => {
    try { process.kill(Number(output), 0); return false; }
    catch (error) { if (error.code !== "ESRCH") throw error; return true; }
  }, Boolean, 2000);
  assert.throws(() => process.kill(Number(output), 0), { code: "ESRCH" });
});

test("external installer cancellation reaps a build child that ignores TERM before reporting cancelled", { skip: process.platform === "win32", timeout: 20000 }, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-external-cancel-"));
  let leaf;
  t.after(async () => {
    if (leaf) try { process.kill(leaf, "SIGKILL"); } catch { /* Already reaped. */ }
    await fs.rm(directory, { recursive: true, force: true });
  });
  const pidFile = path.join(directory, "build.pid"), file = path.join(directory, "job.json");
  await fs.writeFile(path.join(directory, "uv"), `#!${process.execPath}\nconst {spawn}=require('node:child_process');\nconst code="process.on('SIGTERM',()=>{});require('node:fs').writeFileSync(process.env.BUILD_PID,String(process.pid));setInterval(()=>{},1000)";\nspawn(process.execPath,['-e',code],{stdio:'inherit'});process.on('SIGTERM',()=>{});setInterval(()=>{},1000);\n`, { mode: 0o700 });
  const manager = { root: project, environment: { ...process.env, PATH: `${directory}:${process.env.PATH}`, BUILD_PID: pidFile, OPENQUANTUM_PYTHON_ENV_ROOT: path.join(directory, "environments") },
    entry: async () => ({}), file: () => file,
    read: async () => JSON.parse(await fs.readFile(file, "utf8")), write: async (_id, value) => fs.writeFile(file, JSON.stringify(value)) };
  await manager.write("mcp-qiskit", { job: { id: "cancel-fixture", operation: "install", status: "starting" } });
  const running = runEnvironmentJob({ manager, id: "mcp-qiskit", jobId: "cancel-fixture", inspect: async () => { assert.fail("cancelled install must not check"); } });
  leaf = Number(await waitFor(() => fs.readFile(pidFile, "utf8").catch(() => ""), Boolean));
  await withLock(file, async () => { const record = await manager.read(); record.job.status = "cancelling"; await manager.write("mcp-qiskit", record); });
  assert.equal(await running, false);
  assert.equal((await manager.read()).job.status, "cancelled");
  assert.throws(() => process.kill(leaf, 0), { code: "ESRCH" });
  leaf = undefined;
});
