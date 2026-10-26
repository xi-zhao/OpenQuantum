import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { algorithmPreparation, algorithmSelection, acquireAlgorithmSetup } from "../src/lib/algorithm-environment.mjs";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { projectSkill } from "../scripts/build-chatgpt.mjs";
import { Environments } from "../src/settings/codex/environments.mjs";
import { Settings } from "../src/settings/codex/application.mjs";
import { discoverSkills, inspectPreparation, prepareSkill } from "../src/settings/codex/preparation.mjs";
import { skillEnvironment, skillPreparation } from "../runtime/chatgpt/ui/settings-model.mjs";
import { readCapabilities } from "../runtime/chatgpt/catalog.mjs";

const root = path.resolve(import.meta.dirname, "..");
const exec = promisify(execFile);
const unix = { skip: process.platform === "win32" ? "POSIX executable fixtures; readiness tests are portable" : false, timeout: 20000 };

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq sdk on demand "));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const folder of ["scripts", "src/lib", ".agents", "bin", "examples/quantum-algorithms"]) await fs.mkdir(path.join(directory, folder), { recursive: true });
  for (const file of ["scripts/setup-sdk.mjs", "scripts/setup-open-algorithm-examples.mjs", "src/lib/sdk-access.mjs", "src/lib/algorithm-environment.mjs", "src/lib/prepared-python.mjs", "src/lib/installed-python.mjs", "src/lib/setup-process.mjs", "src/lib/sdk-source.mjs", "src/lib/sdk-source-record.mjs"]) await fs.copyFile(path.join(root, file), path.join(directory, file));
  await fs.symlink(path.join(root, "node_modules"), path.join(directory, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  await fs.writeFile(path.join(directory, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [{ id: "quantum-algorithms", language: "python", modules: ["qiskit"] }] }));
  await fs.writeFile(path.join(directory, ".agents/capability-packages.yml"), 'schemaVersion: "1.1"\npackages:\n  - id: quantum-algorithms\n');
  await fs.writeFile(path.join(directory, "examples/quantum-algorithms/pyproject.toml"), '[project]\nname="fixture"\ndependencies=[]\n');
  const lock = 'version = 1\n[[package]]\nname = "qiskit"\nversion = "2.5.2"\n';
  const lockPath = path.join(directory, "examples/quantum-algorithms/uv.lock");
  await fs.writeFile(lockPath, lock);
  const hash = createHash("sha256").update(lock).digest("hex");
  const mode = path.join(directory, "mode"), calls = path.join(directory, "calls.jsonl"), pidFile = path.join(directory, "uv.pid"), leafPidFile = path.join(directory, "leaf.pid");
  await fs.writeFile(mode, "ok");
  const python = `#!${process.execPath}\nconst fs=require('node:fs');const bad=fs.readFileSync(${JSON.stringify(mode)},'utf8')==='incomplete';if(process.argv.at(-1).endsWith('openquantum_environment_probe.py')){fs.appendFileSync(${JSON.stringify(path.join(directory, 'probes'))},fs.readFileSync(process.argv.at(-1),'utf8')+'\\n');console.log('OPENQUANTUM_ENVIRONMENT_OK');}else console.log(JSON.stringify({incomplete:bad?[{package:'fixture'}]:[]}));process.exit(bad?1:0);\n`;
  const uv = `#!${process.execPath}\nconst fs=require('node:fs'),path=require('node:path');
fs.appendFileSync(${JSON.stringify(calls)},JSON.stringify(process.argv.slice(2))+'\\n');
const mode=fs.readFileSync(${JSON.stringify(mode)},'utf8');
if(mode==='fail')process.exit(2);
if(['hang','stubborn','orphan'].includes(mode)){
if(mode==='stubborn')process.on('SIGTERM',()=>{});
if(mode!=='hang')require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(`process.on('SIGTERM',()=>{});require('node:fs').writeFileSync(${JSON.stringify(leafPidFile)},String(process.pid));setInterval(()=>{},1000);`)}],{stdio:'ignore'});
fs.writeFileSync(${JSON.stringify(pidFile)},String(process.pid));
console.log('fixture installer waiting');setInterval(()=>{},1000);}else{
const target=path.join(process.env.UV_PROJECT_ENVIRONMENT,'bin/python');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,${JSON.stringify(python)},{mode:0o755});
if(mode==='change-lock')fs.appendFileSync(${JSON.stringify(lockPath)},'\\n# changed during setup');}
`;
  await fs.writeFile(path.join(directory, "bin/uv"), uv, { mode: 0o755 });
  const env = { ...process.env, PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`, OPENQUANTUM_PYTHON_ENV_ROOT: path.join(directory, "envs") };
  const environment = path.join(env.OPENQUANTUM_PYTHON_ENV_ROOT, "quantum-algorithms");
  const args = selection => [path.join(directory, "scripts/setup-sdk.mjs"), "quantum-algorithms", ...selection];
  const setup = (selection = []) => exec(process.execPath, args(selection), { cwd: directory, env });
  const readCalls = async () => (await fs.readFile(calls, "utf8")).trim().split("\n").map(JSON.parse);
  return { directory, environment, env, hash, mode, calls, pidFile, leafPidFile, args, setup, readCalls,
    inspect: (selection = []) => describeSdk(directory, "quantum-algorithms", { environment: env, selection }) };
}

test("dependency selection is minimal by default, expands chemistry and rejects ambiguous options", () => {
  assert.deepEqual(algorithmSelection(), []);
  assert.deepEqual(algorithmSelection(["--group", "chemistry"]), ["tensor", "chemistry"]);
  assert.equal(algorithmSelection(["--all"]).length, 4);
  for (const args of [["--group", "unknown"], ["--all", "--minimal"], ["--minimal", "--group", "tensor"], ["--all", "--group", "tensor"]]) assert.throws(() => algorithmSelection(args));
});

test("first setup installs only base packages, repeat setup skips uv, additional groups retain existing groups", unix, async t => {
  const f = await fixture(t);
  assert.equal((await f.inspect()).environmentState, "not_prepared");
  await f.setup();
  const first = (await f.readCalls())[0];
  assert.ok(first.includes("--locked") && first.includes("--no-default-groups"));
  assert.ok(!first.includes("--group"));
  assert.equal((await f.inspect()).environmentState, "prepared");
  assert.equal((await f.inspect(["--group", "chemistry"])).environmentState, "missing_groups");
  await assert.rejects(fs.access(path.join(f.environment, "openquantum-lock.sha256")), { code: "ENOENT" });
  await f.setup();
  assert.equal((await f.readCalls()).length, 1, "warm reuse must not start an installer");
  await f.setup(["--group", "chemistry"]);
  await f.setup(["--group", "gradients"]);
  const last = (await f.readCalls()).at(-1);
  assert.ok(last.includes("chemistry") && last.includes("tensor") && last.includes("gradients"));
  assert.ok(!last.includes("pennylane"));
  assert.equal((await f.inspect(["--group", "chemistry"])).environmentState, "prepared");
  assert.equal((await f.inspect(["--all"])).environmentState, "missing_groups");
  await f.setup(["--all"]);
  assert.equal((await f.inspect(["--all"])).environmentState, "prepared");
  assert.equal((await fs.readFile(path.join(f.environment, "openquantum-lock.sha256"), "utf8")).trim(), f.hash);
});

test("failed extension invalidates readiness, preserves files and supports retry", unix, async t => {
  const f = await fixture(t);
  await f.setup();
  const kept = path.join(f.environment, "keep.txt");
  await fs.writeFile(kept, "preserved");
  await fs.writeFile(f.mode, "fail");
  await assert.rejects(f.setup(["--group", "tensor"]), /SDK setup failed/);
  assert.equal((await f.inspect()).environmentState, "not_prepared");
  assert.equal(await fs.readFile(kept, "utf8"), "preserved");
  await fs.writeFile(f.mode, "ok");
  await f.setup(["--group", "tensor"]);
  assert.equal((await f.inspect(["--group", "tensor"])).environmentState, "prepared");
});

test("warm integrity check and changed lock cannot leave a successful preparation marker", unix, async t => {
  const f = await fixture(t);
  await f.setup();
  await fs.writeFile(f.mode, "incomplete");
  await assert.rejects(f.setup(), /Python installation is incomplete/);
  assert.equal((await f.inspect()).environmentState, "not_prepared");
  await fs.writeFile(f.mode, "change-lock");
  await assert.rejects(f.setup(), /dependency lock changed/);
  assert.equal((await f.inspect()).environmentState, "not_prepared");
  await fs.writeFile(f.mode, "ok");
  await f.setup();
  assert.equal((await f.inspect()).environmentState, "prepared");
});

for (const mode of ["hang", "stubborn", "orphan"]) test(`public setup cancellation cleans the ${mode} process tree, releases its lock and permits retry`, unix, async t => {
  const f = await fixture(t);
  await fs.writeFile(f.mode, mode);
  const child = spawn(process.execPath, f.args([]), { cwd: f.directory, env: f.env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.resume(); child.stderr.resume();
  const exited = new Promise(resolve => child.once("close", (code, signal) => resolve({ code, signal })));
  t.after(() => child.kill("SIGKILL"));
  let pid, leafPid;
  for (let i = 0; i < 500; i++) {
    pid = await fs.readFile(f.pidFile, "utf8").catch(() => null);
    leafPid = await fs.readFile(f.leafPidFile, "utf8").catch(() => null);
    if (pid && (mode === "hang" || leafPid)) break;
    await delay(10);
  }
  assert.ok(pid, "installer reached the cancellable phase");
  if (mode !== "hang") assert.ok(leafPid, "stubborn descendant is ready");
  t.after(() => { for (const id of [pid, leafPid].filter(Boolean)) { try { process.kill(Number(id), "SIGKILL"); } catch { /* Already cleaned. */ } } });
  assert.equal((await f.inspect()).environmentState, "preparing");
  await assert.rejects(f.setup(), /Another algorithm SDK setup/);
  child.kill("SIGTERM");
  const result = await exited;
  assert.notEqual(result.code, 0);
  assert.throws(() => process.kill(Number(pid), 0), { code: "ESRCH" });
  if (leafPid) {
    // An orphan may need one scheduler tick to be reaped by the OS.
    for (let i = 0; i < 100; i++) {
      try { process.kill(Number(leafPid), 0); } catch { break; }
      await delay(10);
    }
    assert.throws(() => process.kill(Number(leafPid), 0), { code: "ESRCH" });
  }
  assert.equal((await f.inspect()).environmentState, "not_prepared");
  await assert.rejects(fs.access(`${f.environment}.openquantum-setup-lock`), { code: "ENOENT" });
  await fs.writeFile(f.mode, "ok");
  await f.setup();
  assert.equal((await f.inspect()).environmentState, "prepared");
});

test("legacy full markers remain usable and a dead setup lock can be recovered", unix, async t => {
  const f = await fixture(t);
  await f.setup(["--all"]);
  await fs.rm(path.join(f.environment, "openquantum-groups.json"));
  assert.equal((await f.inspect(["--all"])).environmentState, "prepared");
  const dead = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
  await new Promise(resolve => dead.once("close", resolve));
  const lock = `${f.environment}.openquantum-setup-lock`;
  await fs.mkdir(lock);
  await fs.writeFile(path.join(lock, `${dead.pid}-${randomUUID()}`), "");
  assert.equal((await f.inspect()).environmentState, "not_prepared", "a new agent must retry instead of waiting for a dead owner");
  const unlock = await acquireAlgorithmSetup(f.environment);
  await unlock();
  await fs.mkdir(lock); // An interrupted older installer left no owner file.
  assert.equal((await f.inspect()).environmentState, "not_prepared");
  const recoverEmpty = await acquireAlgorithmSetup(f.environment);
  await recoverEmpty();
  const pending = `${lock}.unpublished.pending`;
  await fs.mkdir(pending); // A new installer died before atomic publication.
  const recoverPending = await acquireAlgorithmSetup(f.environment);
  await assert.rejects(acquireAlgorithmSetup(f.environment), /Another algorithm SDK setup/);
  await recoverPending();
  await fs.writeFile(path.join(f.environment, "openquantum-lock.sha256"), "old-lock");
  assert.equal((await f.inspect()).environmentState, "stale");
  await fs.writeFile(path.join(f.environment, "openquantum-groups.json"), "partial JSON");
  assert.equal((await algorithmPreparation(f.environment, f.hash)).state, "stale");
});

test("generated Skills give the agent the task's minimal group and the prepare-reinspect-resume workflow", async () => {
  const capabilities = await readCapabilities(root);
  const vqe = capabilities.find(entry => entry.id === "quantum-molecular-dmrg");
  const text = projectSkill(vqe, { version: "fixture" });
  assert.match(text, /inspect quantum-algorithms --group chemistry/);
  assert.match(text, /prepare_openquantum_skill/);
  assert.match(text, /准备后重新 inspect/);
  assert.match(text, /不安装依赖/);
  assert.match(projectSkill(capabilities.find(entry => entry.id === "quantum-qft"), { version: "fixture" }), /inspect quantum-algorithms`/);
  assert.match(projectSkill(capabilities.find(entry => entry.id === "quantum-guide-simulators-pennylane"), { version: "fixture" }), /--group pennylane/);
});


test("preparation and the real worker install only selected groups and never reuse readiness for missing groups", unix, async t => {
  const f = await fixture(t);
  const directory = path.join(f.directory, "settings");
  const worker = path.join(f.directory, "worker.mjs");
  await fs.writeFile(worker, `import { Environments } from ${JSON.stringify(new URL("../src/settings/codex/environments.mjs", import.meta.url).href)};
import { runEnvironmentJob } from ${JSON.stringify(new URL("../src/settings/codex/environment-worker.mjs", import.meta.url).href)};
const [id, jobId, directory] = process.argv.slice(2);
const manager = new Environments({ root: process.cwd(), directory });
process.exitCode = await runEnvironmentJob({ manager, id, jobId }) ? 0 : 1;`);
  const manager = new Environments({ root: f.directory, directory, environment: f.env, worker });
  t.after(() => manager.close());
  const capability = { id: "algorithm-task", title: "Algorithm", description: "Algorithm task", skill: "instructions", status: "available", tools: [], sdkIds: ["quantum-algorithms"] };
  const settings = new Settings({ directory, codexHome: path.join(f.directory, "codex"), skillRoot: path.join(f.directory, "skills"), environments: manager,
    credentials: { describe: async () => ({ configured: false }) },
    backend: { sourceCapabilities: [capability], tools: [], providers: [], providerFor: () => undefined } });
  const selection = { skillId: capability.id, sdkId: "quantum-algorithms" };
  await discoverSkills(settings, { query: "Algorithm" });
  await assert.rejects(fs.stat(f.calls), { code: "ENOENT" });
  await assert.rejects(inspectPreparation(settings, { ...selection, dependencyGroups: ["all"] }), /Invalid/);
  const wait = async groups => {
    for (let i = 0; i < 200; i++) {
      const result = await inspectPreparation(settings, { ...selection, dependencyGroups: groups });
      if (result.state !== "preparing") return result;
      await delay(25);
    }
    assert.fail("Worker did not finish");
  };
  assert.equal((await prepareSkill(settings, selection)).state, "preparing");
  const baseJob = (await manager.read("quantum-algorithms")).job;
  assert.deepEqual(baseJob.groups, []);
  // A second task waits for the active owner; it cannot claim its missing group.
  assert.equal((await prepareSkill(settings, { ...selection, dependencyGroups: ["chemistry"] })).state, "preparing");
  assert.equal((await manager.read("quantum-algorithms")).job.id, baseJob.id);
  const baseReady = await wait([]);
  assert.equal(baseReady.state, "ready", JSON.stringify({ plan: baseReady, record: await manager.read("quantum-algorithms"), status: await manager.status("quantum-algorithms") }));
  assert.equal((await wait(["chemistry"])).state, "environment_required");
  assert.equal((await f.readCalls()).length, 1);
  let probe = await fs.readFile(path.join(f.directory, "probes"), "utf8");
  assert.match(probe, /numpy/); assert.doesNotMatch(probe, /pyscf|quimb|pennylane|qiskit_algorithms/);
  capability.sdkGroups = ["chemistry"];
  const snapshot = await settings.snapshot(), skill = snapshot.skills[0];
  assert.match(skillPreparation(skill, snapshot), /需补充依赖/);
  assert.deepEqual(skillEnvironment(skill, snapshot, "quantum-algorithms").dependencyGroups.toSorted(), ["chemistry", "tensor"]);
  const plan = await prepareSkill(settings, { ...selection, dependencyGroups: ["gradients"] });
  assert.deepEqual(plan.selection.dependencyGroups, ["gradients", "tensor", "chemistry"]);
  assert.equal((await wait(["gradients"])).state, "ready");
  const call = (await f.readCalls()).at(-1);
  for (const group of ["gradients", "tensor", "chemistry"]) assert.ok(call.includes(group));
  assert.ok(!call.includes("pennylane"));
  probe = await fs.readFile(path.join(f.directory, "probes"), "utf8");
  assert.match(probe, /pyscf/); assert.match(probe, /quimb/); assert.doesNotMatch(probe, /pennylane/);
  const restored = await settings.snapshot();
  assert.equal(skillPreparation(restored.skills[0], restored), "环境已准备");
  const before = (await f.readCalls()).length;
  assert.equal((await prepareSkill(settings, selection)).state, "ready");
  assert.equal((await f.readCalls()).length, before);
});
