import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { sha256 } from "./lib/desktop-distribution.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const windows = process.platform === "win32";
const target = `${process.platform}-${process.arch}`;
const distribution = path.join(root, ".openquantum/distributions", target);
const defaultApp = path.join(distribution, "artifacts", windows ? "win-unpacked" : `mac${process.arch === "arm64" ? "-arm64" : ""}`, windows ? "OpenQuantum Desktop.exe" : "OpenQuantum Desktop.app");
const application = path.resolve(process.argv[2] || process.env.OPENQUANTUM_INSTALLED_APP || defaultApp);
const resources = windows ? path.join(path.dirname(application), "resources") : path.join(application, "Contents/Resources");
const executable = windows ? application : path.join(application, "Contents/MacOS/OpenQuantum Desktop");
const bin = path.join(resources, "runtimes/bin");
const node = path.join(bin, windows ? "node.exe" : "node");
const payload = path.join(resources, "openquantum");
const output = path.join(distribution, "validation");
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(path.join(await realpath(tmpdir()), "oq-installed-"));
const dataRoot = path.join(temporary, "user data");
const projectRoot = path.join(dataRoot, "project");
const home = path.join(temporary, "home");
await mkdir(home, { recursive: true });
const systemPath = windows ? path.join(process.env.SystemRoot, "System32") : "/usr/bin:/bin:/usr/sbin:/sbin";
const environment = {
  HOME: home, USERPROFILE: home, PATH: systemPath,
  TEMP: temporary, TMP: temporary, TMPDIR: temporary, LANG: "en_US.UTF-8",
  OPENQUANTUM_DESKTOP_DATA_DIR: dataRoot, DSH_TELEMETRY_DISABLED: "1",
};
if (windows) for (const name of ["SystemRoot", "WINDIR", "SystemDrive", "COMSPEC"]) {
  if (process.env[name]) environment[name] = process.env[name];
}
const execute = promisify(execFile);
const checks = [];
const report = { target, application, dataRoot, signing: "not_assessed", checks,
  scope: "Post-setup packaged application, bundled runtimes, local Tool and data retention; no external model or QPU request. First-run wizard is a separate manual UI check." };
try {
  const runtimeLock = JSON.parse(await readFile(path.join(resources, "runtimes/runtime-lock.json"), "utf8"));
  const nodeVersion = await execute(node, ["--version"], { env: environment });
  assert.equal(nodeVersion.stdout.trim(), `v${runtimeLock.nodeVersion}`);
  for (const name of ["uv", "uvx"]) {
    const result = await execute(path.join(bin, `${name}${windows ? ".exe" : ""}`), ["--version"], { env: environment });
    assert.match(result.stdout, new RegExp(`^${name} ${runtimeLock.uvVersion.replaceAll(".", "\\.")}\\b`));
  }
  checks.push("Bundled Node, uv and uvx run with only system commands in the initial PATH");
  // This calls the same shipped Node bootstrap used by the app, outside the repo.
  await execute(node, [path.join(payload, "scripts/prepare-installed-desktop.mjs"), payload, projectRoot], { env: environment, timeout: 120_000 });
  checks.push("First deployment prepared using only shipped files");
  const profile = path.join(projectRoot, ".openquantum/dsh/profiles/desktop");
  // Create the public Desktop Profile before the fixture marker. The native
  // launcher's first-profile creation deliberately clears any older marker.
  await execute(executable, ["--input-type=module", "-e",
    'import {pathToFileURL} from "node:url"; const {prepareDesktopProfile} = await import(pathToFileURL(process.argv[1])); prepareDesktopProfile("1", process.argv[2], process.platform, "desktop");',
    path.join(resources, "app.asar/lib/profile.js"), path.join(projectRoot, ".openquantum/dsh"),
  ], { env: { ...environment, ELECTRON_RUN_AS_NODE: "1" }, cwd: projectRoot, timeout: 60_000 });
  // Test fixture for the pinned native wizard's explicit Skip outcome. Production
  // does not write this marker and presents the normal first-run wizard.
  const hash = sha256(path.resolve(profile));
  const setupRoot = path.join(dataRoot, "native/profile-setup");
  const setupDirectory = path.join(setupRoot, hash);
  await mkdir(setupDirectory, { recursive: true, mode: 0o700 });
  await chmod(setupRoot, 0o700);
  await writeFile(path.join(setupDirectory, "state.json"), JSON.stringify({ version: 1, profileHash: hash, outcome: "skipped" }), { mode: 0o600 });
  const configPath = path.join(projectRoot, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml");
  const customConfig = `${await readFile(configPath, "utf8")}\n# Installed package persistence fixture\n`;
  await writeFile(configPath, customConfig);
  const customSkill = path.join(projectRoot, ".agents/skills/installer-fixture/SKILL.md");
  await mkdir(path.dirname(customSkill), { recursive: true });
  await writeFile(customSkill, "---\nname: installer-fixture\ndescription: Installation test fixture.\n---\nNo external actions.\n");
  const lifecyclePath = path.join(dataRoot, "native/lifecycle-events/startup.jsonl");
  async function events() {
    return (await readFile(lifecyclePath, "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    })).split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  }
  for (const attempt of [1, 2]) {
    const previousRuns = new Set((await events()).map((event) => event.runId));
    const log = createWriteStream(path.join(output, `installed-start-${attempt}.log`));
    const child = spawn(executable, [], { env: environment, cwd: temporary, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    const ended = new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => resolve({ code, signal })); });
    try {
      const deadline = Date.now() + 120_000;
      let healthy;
      while (Date.now() < deadline) {
        if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Installed app exited before becoming healthy; see installed-start-${attempt}.log`);
        const fresh = (await events()).filter((event) => !previousRuns.has(event.runId));
        const failed = fresh.find((event) => event.eventName === "startup.run.failed");
        if (failed) throw new Error(`Installed startup failed: ${JSON.stringify(failed.details)}`);
        healthy = fresh.find((event) => event.eventName === "startup.run.completed" && event.details?.rendererStatus === "healthy");
        if (healthy) break;
        await delay(500);
      }
      assert.ok(healthy, "Installed Host and renderer must become healthy within two minutes");
      checks.push(`Launch ${attempt}: actual Host and renderer healthy (${healthy.runId})`);
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        if (windows) await execute(executable, ["--dsh-installer-quit"], { env: environment, timeout: 20_000 }).catch(() => {});
        else child.kill("SIGTERM");
        if (!await Promise.race([ended.then(() => true), delay(10_000, false)])) child.kill("SIGKILL");
      }
      await ended;
      log.end();
    }
    assert.equal(await readFile(configPath, "utf8"), customConfig);
    assert.match(await readFile(customSkill, "utf8"), /Installation test fixture/);
  }
  checks.push("User MCP configuration and custom Skill retained across two launches");
  const demo = await execute(node, [path.join(projectRoot, "scripts/run-quantum-ground-state-demo.mjs")], { env: environment, cwd: projectRoot, timeout: 60_000 });
  const result = JSON.parse(demo.stdout);
  assert.equal(result.runtime.status, "completed");
  assert.ok(result.result.absoluteErrorHartree < 1e-9);
  assert.equal(result.scientificReview.acceptance, "not_derived");
  await writeFile(path.join(output, "local-tool.json"), JSON.stringify(result, null, 2));
  checks.push("Bundled Node runs the fixed local ground-state Tool and computational checks");
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error.message;
  throw error;
} finally {
  await writeFile(path.join(output, "installed-smoke.json"), JSON.stringify(report, null, 2));
  console.log(`Installed package evidence: ${output}`);
  console.log(`Test data retained for inspection: ${dataRoot}`);
}
