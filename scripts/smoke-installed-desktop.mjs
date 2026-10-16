import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = `${process.platform}-${process.arch}`;
const distribution = path.join(root, ".openquantum/distributions", target);
const content = path.resolve(process.argv[2] || path.join(distribution, "content"));
const node = path.join(content, "runtimes/bin", process.platform === "win32" ? "node.exe" : "node");
const temporary = await mkdtemp(path.join(await realpath(tmpdir()), "oq-dsh-content-"));
const dataRoot = path.join(temporary, "user data");
const output = path.join(distribution, "validation");
await mkdir(output, { recursive: true });
const env = { ...process.env, DSH_DESKTOP_EXECUTABLE: path.join(temporary, "missing-client"), PATH: process.platform === "win32" ? path.join(process.env.SystemRoot, "System32") : "/usr/bin:/bin:/usr/sbin:/sbin" };
const execute = promisify(execFile);
const install = () => execute(node, [path.join(content, "install.mjs"), dataRoot], { env, maxBuffer: 4 * 1024 * 1024 });
await install();
const projectRoot = path.join(dataRoot, "project");
const branding = JSON.parse(await readFile(path.join(dataRoot, "desktop-branding.json"), "utf8"));
assert.equal(branding.upstreamResourcesModified, false);
assert.equal(branding.launcher, path.join(dataRoot, process.platform === "darwin" ? "OpenQuantum.app" : "OpenQuantum.lnk"));
if (process.platform === "darwin") {
  const plist = await readFile(path.join(branding.launcher, "Contents/Info.plist"), "utf8");
  assert.match(plist, /CFBundleIconFile<\/key><string>OpenQuantum.icns/);
} else {
  const shortcut = await readFile(branding.launcher);
  assert.ok(shortcut.length > 0);
}
const home = path.join(projectRoot, ".openquantum/dsh");
const route = path.join(home, "profiles/model-routes.cordis.yml");
const original = await readFile(route, "utf8");
await writeFile(route, original + "\n# retained user route preference\n");
const customSkill = path.join(projectRoot, ".agents/skills/smoke-retention/SKILL.md");
await mkdir(path.dirname(customSkill), { recursive: true });
await writeFile(customSkill, "---\nname: smoke-retention\ndescription: isolated engineering check\n---\nRetain this user Skill.\n");
const userPatch = path.join(home, "profiles/desktop/cordis.patch.yml");
const profilePatch = await readFile(userPatch, "utf8") + "\n# retained native Profile override\n";
await writeFile(userPatch, profilePatch);
// Exercise real repeated installation with explicit restrictions and a native
// credential fixture. These values live only in the isolated installation.
const retainedState = new Map([
  [".openquantum/capabilities/settings.json", JSON.stringify({ schemaVersion: 1, disabledProviders: ["simqn_local"], disabledTools: ["run_qiskit_circuit"], connections: [] })],
  [".openquantum/capabilities/skill-policy.json", JSON.stringify({ schemaVersion: 1, disabledSkills: ["qiskit-circuit-workbench"] })],
  [".credentials.yaml", "version: 1\nrefs:\n  OPENQUANTUM_INSTALL_TEST: synthetic-unused-value\n"],
]);
for (const [relative, contents] of retainedState) {
  const filename = path.join(home, relative);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, contents, { mode: 0o600 });
}
await install();
for (const [relative, contents] of retainedState) assert.equal(await readFile(path.join(home, relative), "utf8"), contents, relative);
assert.match(await readFile(route, "utf8"), /retained user route preference/);
assert.match(await readFile(customSkill, "utf8"), /Retain this user Skill/);
assert.equal(await readFile(userPatch, "utf8"), profilePatch);
const profile = JSON.parse(await readFile(path.join(home, "profiles/desktop/package.json")));
assert.equal(Object.keys(profile.dependencies).filter(name => name.startsWith("@openquantum/")).length, 7);
assert.equal(profile.dsh.profile.bundles.filter(name => name === "@openquantum/harness-desktop-profile").length, 1);
const preset = await readFile(path.join(home, ".agent-presets/openquantum/agent.cordis.yml"), "utf8");
assert.doesNotMatch(preset, /process\.cwd\(\)|process\.execPath/);
const runtime = JSON.parse(await readFile(path.join(projectRoot, ".openquantum/runtime.json")));
assert.ok(runtime.nodeExecutable.startsWith(path.join(dataRoot, "versions")));
const uv = path.join(path.dirname(runtime.nodeExecutable), process.platform === "win32" ? "uv.exe" : "uv");
await execute(uv, ["--version"], { env });
// Import the installed OQ modules from an unrelated cwd, as Finder does.
await execute(runtime.nodeExecutable, ["--input-type=module", "-e", `const { projectRoot } = await import(${JSON.stringify(pathToFileURL(path.join(home, "project-root.mjs")).href)}); if (projectRoot !== ${JSON.stringify(projectRoot)}) throw Error('wrong project'); await import(${JSON.stringify(pathToFileURL(path.join(home, ".agent-presets/openquantum/native-quantum-tools.mjs")).href)});`], { cwd: temporary, env });
const report = { target, dataRoot, checks: ["installation", "brand-launcher", "repeat-install", "user-configuration-retained", "explicit-skill-tool-mcp-restrictions-retained", "native-credentials-retained", "profile-bundle-and-dependencies", "persistent-node-and-uv", "independent-working-directory"],
  upstreamClient: "not-bundled", nativeUI: "not-tested-by-this-command", scientificValidation: "not_evaluated" };
await writeFile(path.join(output, "content-install.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
