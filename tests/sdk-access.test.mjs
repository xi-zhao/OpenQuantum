import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readSdkLibraries, sdkInventory, describeSdk, sdkCli, nativeSdkRoot, sdkSourceRoot } from "../src/lib/sdk-access.mjs";
import { projectSkill } from "../scripts/build-chatgpt.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq sdk access "));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = path.join(directory, ".agents/skills/example");
  await fs.mkdir(project, { recursive: true });
  await fs.writeFile(path.join(directory, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [{ id: "example", language: "python", modules: ["example"] }] }));
  await fs.writeFile(path.join(directory, ".agents/capability-packages.yml"), 'schemaVersion: "1.1"\npackages:\n  - id: example\n    level: L0\n');
  await fs.writeFile(path.join(project, "pyproject.toml"), '[project]\nname = "example"\nrequires-python = ">=3.12"\ndependencies = ["example==1.0"]\n');
  const lock = 'version = 1\n[[package]]\nname = "example"\nversion = "1.0"\nsource = { registry = "https://pypi.org/simple" }\n';
  await fs.writeFile(path.join(project, "uv.lock"), lock);
  return { directory, hash: createHash("sha256").update(lock).digest("hex") };
}

test("inventory accounts for every Python project and capability without treating native code as an SDK", async () => {
  const inventory = await sdkInventory(root);
  const directories = await fs.readdir(path.join(root, ".agents/skills"), { withFileTypes: true });
  for (const directory of directories.filter(entry => entry.isDirectory())) {
    try { await fs.access(path.join(root, ".agents/skills", directory.name, "pyproject.toml")); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    assert.ok(inventory.libraries.some(entry => entry.id === directory.name), directory.name);
  }
  for (const entry of inventory.libraries) {
    assert.match(entry.manifest.sha256, /^[a-f0-9]{64}$/);
    assert.match(entry.lock.sha256, /^[a-f0-9]{64}$/);
    assert.equal(entry.scientificValidation, "not_evaluated");
    assert.equal(entry.executionVerified, "not_checked");
  }
  assert.equal(inventory.otherCapabilities.find(entry => entry.id === "qmclaw-workbench").kind, "native-implementation");
  assert.equal(inventory.otherCapabilities.find(entry => entry.id === "qiskit-ibm-runtime").kind, "external-mcp");
  const algorithm = inventory.libraries.find(entry => entry.id === "quantum-algorithms");
  assert.ok(algorithm.lockedPackages.some(entry => entry.name === "quimb"));
  assert.ok(algorithm.lockedPackages.some(entry => entry.name === "pyscf"));
});

test("SDK discovery is read-only and distinguishes missing, stale and prepared environments", async t => {
  const { directory, hash } = await fixture(t);
  const environment = { OPENQUANTUM_PYTHON_ENV_ROOT: path.join(directory, "user chosen envs"), SECRET_FIXTURE: "must-not-appear" };
  const missing = await describeSdk(directory, "example", { environment });
  assert.equal(missing.environmentState, "not_prepared");
  assert.doesNotMatch(JSON.stringify(missing), /must-not-appear/);
  assert.equal(missing.run.args.at(-1), "<absolute-script.py>");
  assert.equal(missing.run.resourceLimits, "host-and-user-budget");
  assert.equal(missing.run.effect, "depends-on-script");
  const relative = await describeSdk(directory, "example", { environment: { OPENQUANTUM_PYTHON_ENV_ROOT: "relative-envs" } });
  assert.ok(relative.run.command.startsWith(path.join(directory, "relative-envs", "example")));
  assert.equal(relative.setup.cwd, directory);
  await assert.rejects(fs.access(environment.OPENQUANTUM_PYTHON_ENV_ROOT), { code: "ENOENT" });
  await fs.mkdir(path.dirname(missing.run.command), { recursive: true });
  await fs.writeFile(missing.run.command, "fixture interpreter", { mode: 0o755 });
  const marker = path.join(environment.OPENQUANTUM_PYTHON_ENV_ROOT, "example/openquantum-lock.sha256");
  await fs.writeFile(marker, "outdated\n");
  assert.equal((await describeSdk(directory, "example", { environment })).environmentState, "stale");
  await fs.writeFile(marker, `${hash}\n`);
  assert.equal((await describeSdk(directory, "example", { environment })).environmentState, "prepared");
  await fs.rm(missing.run.command);
  assert.equal((await describeSdk(directory, "example", { environment })).environmentState, "not_prepared");
  await assert.rejects(describeSdk(directory, "../../outside", { environment }), /Unknown SDK/);
  await assert.rejects(sdkCli(directory, ["execute", "arbitrary.py"]), /Use list/);
});

test("algorithm SDK honors the persistent environment root while preserving source-checkout defaults", async t => {
  const { directory } = await fixture(t);
  const chosen = path.join(directory, "managed-envs");
  const configured = await describeSdk(root, "quantum-algorithms", { environment: { OPENQUANTUM_PYTHON_ENV_ROOT: chosen } });
  assert.equal(configured.run.command, path.join(chosen, "quantum-algorithms", process.platform === "win32" ? "Scripts/python.exe" : "bin/python"));
  const legacy = await describeSdk(root, "quantum-algorithms", { environment: {} });
  assert.equal(legacy.run.command, path.join(root, "examples/quantum-algorithms/.venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python"));
  await assert.rejects(fs.access(chosen), { code: "ENOENT" });
});

test("catalog rejects duplicate and escaping IDs instead of turning them into executable paths", async t => {
  const { directory } = await fixture(t);
  const catalog = path.join(directory, ".agents/sdk-libraries.json");
  await fs.writeFile(catalog, JSON.stringify({ schemaVersion: 1, libraries: [{ id: "../bad", language: "python", modules: [] }] }));
  await assert.rejects(readSdkLibraries(directory), /Invalid or duplicate/);
});

test("full source SDK discovery rejects missing and modified source snapshots", async t => {
  const { directory, hash } = await fixture(t);
  const catalog = path.join(directory, ".agents/sdk-libraries.json");
  const data = JSON.parse(await fs.readFile(catalog, "utf8"));
  data.libraries[0].sourceProject = { repository: "https://example.invalid/fixture", revision: "fixed-revision" };
  await fs.writeFile(catalog, JSON.stringify(data));
  const missing = await describeSdk(directory, "example", { environment: {} });
  await fs.mkdir(path.dirname(missing.run.command), { recursive: true });
  await fs.writeFile(missing.run.command, "fixture", { mode: 0o755 });
  await fs.writeFile(path.join(path.dirname(path.dirname(missing.run.command)), "openquantum-lock.sha256"), hash);
  assert.equal((await describeSdk(directory, "example", { environment: {} })).environmentState, "source_not_prepared");
  const source = path.join(directory, ".openquantum/sdk-sources/example");
  await fs.mkdir(source, { recursive: true });
  const program = path.join(source, "public_api.py");
  await fs.writeFile(program, "original");
  const record = { ...data.libraries[0].sourceProject, files: { "public_api.py": createHash("sha256").update("original").digest("hex") } };
  await fs.writeFile(path.join(source, "openquantum-source.json"), JSON.stringify(record));
  assert.equal((await describeSdk(directory, "example", { environment: {} })).environmentState, "prepared");
  await fs.writeFile(program, "user modification must not be silently attested");
  assert.equal((await describeSdk(directory, "example", { environment: {} })).environmentState, "source_not_prepared");
  record.files = { "../outside.py": "never read" };
  await fs.writeFile(path.join(source, "openquantum-source.json"), JSON.stringify(record));
  assert.equal((await describeSdk(directory, "example", { environment: {} })).environmentState, "source_not_prepared");
});

test("native discovery never builds and rejects altered executables and escaping manifest paths", async t => {
  const { directory } = await fixture(t);
  const project = path.join(directory, ".agents/skills/example");
  const catalog = path.join(directory, ".agents/sdk-libraries.json");
  const library = { id: "example", language: "native", modules: [], nativeProject: { manifest: "native-project.json", lock: "native.lock.json" } };
  await fs.writeFile(catalog, JSON.stringify({ schemaVersion: 1, libraries: [library] }));
  await fs.writeFile(path.join(project, "native-project.json"), JSON.stringify({ schemaVersion: 1, executable: "example", target: "example" }));
  await fs.writeFile(path.join(project, "native.lock.json"), JSON.stringify({ schemaVersion: 1, sources: [{ name: "example", repository: "https://github.com/example/source.git", revision: "a".repeat(40) }] }));
  const environment = { OPENQUANTUM_NATIVE_SDK_ROOT: "native build with spaces", OPENQUANTUM_SDK_SOURCE_ROOT: "source cache", SECRET_FIXTURE: "never-export" };
  const missing = await describeSdk(directory, "example", { environment });
  assert.equal(missing.environmentState, "requires_native_build_check");
  assert.equal(missing.nativeBuild.directory, nativeSdkRoot(directory, "example", environment));
  assert.equal(sdkSourceRoot(directory, "example", environment), path.join(directory, "source cache/example"));
  assert.doesNotMatch(JSON.stringify(missing), /never-export/);
  await assert.rejects(fs.access(missing.nativeBuild.directory), { code: "ENOENT" });
  const binary = Buffer.from("fixture executable, must never run");
  await fs.mkdir(path.dirname(missing.run.command), { recursive: true });
  await fs.writeFile(missing.run.command, binary, { mode: 0o755 });
  const marker = path.join(missing.nativeBuild.directory, "openquantum-native.json");
  await fs.writeFile(marker, JSON.stringify({ manifestSha256: missing.manifest.sha256, dependencyLockSha256: missing.lock.sha256, executableSha256: createHash("sha256").update(binary).digest("hex"), platform: process.platform, arch: process.arch }));
  assert.equal((await describeSdk(directory, "example", { environment })).environmentState, "prepared");
  assert.equal((await describeSdk(directory, "example", { environment })).nativeBuild.executableSha256, createHash("sha256").update(binary).digest("hex"));
  await fs.appendFile(missing.run.command, "altered");
  assert.equal((await describeSdk(directory, "example", { environment })).environmentState, "requires_native_build_check");
  library.nativeProject.lock = "../outside.json";
  await fs.writeFile(catalog, JSON.stringify({ schemaVersion: 1, libraries: [library] }));
  await assert.rejects(readSdkLibraries(directory), /Invalid native project/);
});

test("Julia locator preserves explicit runtime and depot without importing or preparing the SDK", async t => {
  const { directory } = await fixture(t);
  const project = path.join(directory, ".agents/skills/example");
  await fs.writeFile(path.join(directory, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [{ id: "example", language: "julia", modules: ["Example"], juliaVersion: "1.12.7" }] }));
  await fs.writeFile(path.join(project, "Project.toml"), '[deps]\nExample = "11111111-1111-1111-1111-111111111111"\n');
  await fs.writeFile(path.join(project, "Manifest.toml"), 'julia_version = "1.12.7"\n[[deps.Example]]\nversion = "1.0.0"\n');
  const sdk = await describeSdk(directory, "example", { environment: { OPENQUANTUM_JULIA: "/runtime with spaces/julia", OPENQUANTUM_JULIA_DEPOT_PATH: "/separate depot:", SECRET_FIXTURE: "never-export" } });
  assert.equal(sdk.environmentState, "requires_julia_check");
  assert.equal(sdk.run.command, "/runtime with spaces/julia");
  assert.deepEqual(sdk.run.environment, { JULIA_DEPOT_PATH: "/separate depot:" });
  assert.doesNotMatch(JSON.stringify(sdk), /never-export/);
});

test("host Skill offers arbitrary SDK code without relaxing permissions or claiming scientific acceptance", () => {
  const content = projectSkill({ id: "tenpy-ground-state", title: "TeNPy", description: "Example", tools: ["solve_tenpy_chain"], sdkIds: ["tenpy-ground-state"] }, { version: "fixture" });
  assert.match(content, /自定义程序/);
  assert.match(content, /SDK.*公开 API/);
  assert.match(content, /不得因此缩小用户/);
  assert.match(content, /用户明确禁止的 Skill、Tool 或 MCP 不得恢复/);
  assert.match(content, /宿主若没有本机代码工具/);
  assert.match(content, /not_checked/);
  assert.doesNotMatch(content, /先缩小研究问题|不要.*借助 Shell 替代/);
});

test("provenance preserves caller artifacts and records failure separately from science", async t => {
  const { directory } = await fixture(t);
  const helper = path.join(root, ".agents/skills/quantum-sdk-workbench/references/evidence.py");
  const code = `import importlib.util, json, pathlib, sys\nspec = importlib.util.spec_from_file_location('evidence', sys.argv[1])\nm = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\nd = pathlib.Path(sys.argv[2])\nf = d / 'custom-data.txt'\nf.write_text('not a preset input')\nkw = dict(files=[f], distributions=[], argv=['python', 'user-program.py'], cwd=d, lock_sha256='fixture', execution_status='failed')\nr = m.write_evidence(d / 'evidence.json', **kw)\ntry:\n m.write_evidence(d / 'evidence.json', **kw)\n raise AssertionError('overwrote evidence')\nexcept FileExistsError:\n pass\nprint(json.dumps(r))\n`;
  const result = JSON.parse(execFileSync("python3", ["-B", "-c", code, helper, directory], { encoding: "utf8" }));
  assert.equal(result.executionStatus, "failed");
  assert.equal(result.scientificValidation, "not_evaluated");
  assert.equal(result.files[0].sha256, createHash("sha256").update("not a preset input").digest("hex"));
  assert.equal(await fs.readFile(path.join(directory, "custom-data.txt"), "utf8"), "not a preset input");
});
