import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const windows = process.platform === "win32";
const target = `${process.platform}-${process.arch}`;
if (!process.argv[2] || !process.argv[3] || !path.isAbsolute(process.argv[2]) || !path.isAbsolute(process.argv[3])) throw new Error("Expected absolute application and evidence paths");
const application = process.argv[2];
const resources = windows ? path.join(path.dirname(application), "resources") : path.join(application, "Contents/Resources");
const executable = windows ? application : path.join(application, "Contents/MacOS/OpenQuantum");
const bin = path.join(resources, "runtimes/bin");
const node = path.join(bin, windows ? "node.exe" : "node");
const payload = path.join(resources, "openquantum");
const output = process.argv[3];
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(path.join(await realpath(tmpdir()), "oq-installed-"));
const dataRoot = path.join(temporary, "user data");
const projectRoot = path.join(dataRoot, "project");
const home = path.join(temporary, "home");
await mkdir(home, { recursive: true });
const systemPath = windows ? path.join(process.env.SystemRoot, "System32") : "/usr/bin:/bin:/usr/sbin:/sbin";
const environment = {
  PATH: systemPath,
  TEMP: temporary, TMP: temporary, TMPDIR: temporary, LANG: "en_US.UTF-8",
  OPENQUANTUM_DESKTOP_DATA_DIR: dataRoot, DSH_TELEMETRY_DISABLED: "1",
};
if (windows) for (const name of ["SystemRoot", "WINDIR", "SystemDrive", "COMSPEC"]) {
  if (process.env[name]) environment[name] = process.env[name];
}
if (windows) {
  // Isolate Windows' standard user directories as well as HOME. Omitting these
  // is not representative of a clean Windows account and obscures crash logs.
  environment.APPDATA = path.join(home, "AppData/Roaming");
  environment.LOCALAPPDATA = path.join(home, "AppData/Local");
  await mkdir(environment.APPDATA, { recursive: true });
  await mkdir(environment.LOCALAPPDATA, { recursive: true });
}
const execute = promisify(execFile);
const checks = [];
const report = { target, application, dataRoot, signing: "not_assessed", checks,
  scope: "Packaged application, actual first launch and restart, bundled runtimes, local Tool and data retention; no external model or QPU request." };
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
  const configPath = path.join(projectRoot, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml");
  const customConfig = `${await readFile(configPath, "utf8")}\n# Installed package persistence fixture\n`;
  await writeFile(configPath, customConfig);
  const customSkill = path.join(projectRoot, ".agents/skills/installer-fixture/SKILL.md");
  await mkdir(path.dirname(customSkill), { recursive: true });
  await writeFile(customSkill, "---\nname: installer-fixture\ndescription: Installation test fixture.\n---\nNo external actions.\n");
  async function rendererHealthy(port) {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2_000) })).json();
    const target = targets.find(entry => entry.type === "page" && /^https?:/.test(entry.url));
    if (!target) return false;
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    try {
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Renderer probe timed out")), 3_000);
        socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Renderer connection failed")); }, { once: true });
        socket.addEventListener("open", () => socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: {
          expression: 'Boolean(document.body.innerText.includes("OpenQuantum") && document.querySelector(".oq-settings-trigger")?.getClientRects().length && !document.querySelector("[data-slot-error]"))', returnByValue: true,
        } })), { once: true });
        socket.addEventListener("message", event => {
          const message = JSON.parse(event.data);
          if (message.id !== 1) return;
          clearTimeout(timer);
          resolve(message.result?.result?.value === true);
        });
      });
    } finally { socket.close(); }
  }
  async function availablePort() {
    const server = createServer();
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    return port;
  }
  for (const attempt of [1, 2]) {
    const port = await availablePort();
    const log = createWriteStream(path.join(output, `installed-start-${attempt}.log`));
    // Windows child-process Chromium logs do not reliably reach stderr.
    const child = spawn(executable, [`--remote-debugging-port=${port}`, "--enable-logging=file", `--log-file=${path.join(output, `chromium-start-${attempt}.log`)}`], {
      env: environment, cwd: temporary, stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    const ended = new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => resolve({ code, signal })); });
    try {
      const deadline = Date.now() + 120_000;
      let healthy;
      while (Date.now() < deadline) {
        if (child.exitCode !== null || child.signalCode !== null) {
          throw new Error(`Installed app exited before becoming healthy (exit ${child.exitCode}, signal ${child.signalCode}); see installed-start-${attempt}.log and chromium-start-${attempt}.log`);
        }
        const selection = await readFile(path.join(dataRoot, "native/profile-selection/state.json"), "utf8").then(JSON.parse).catch(() => null);
        healthy = selection?.lastKnownGood === "desktop" && !selection.pending && await rendererHealthy(port).catch(() => false);
        if (healthy) break;
        await delay(500);
      }
      assert.ok(healthy, "Installed Host and renderer must become healthy within two minutes");
      checks.push(`Launch ${attempt}: native profile healthy and visible OpenQuantum interface rendered`);
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
  // Only this test's fresh data is collected; never copy an existing user's home.
  for (const directory of ["logs", "lifecycle-events"]) {
    await cp(path.join(dataRoot, "native", directory), path.join(output, "native", directory), { recursive: true }).catch((error) => {
      if (error.code !== "ENOENT") console.error(`Could not collect test ${directory}: ${error.message}`);
    });
  }
  await writeFile(path.join(output, "installed-smoke.json"), JSON.stringify(report, null, 2));
  console.log(`Installed package evidence: ${output}`);
  console.log(`Test data retained for inspection: ${dataRoot}`);
}
