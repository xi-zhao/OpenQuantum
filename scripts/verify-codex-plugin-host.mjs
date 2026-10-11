// Isolated installation and native Skill regression. Never uses the user's Codex home.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { installPlugin } from "./install-codex-plugin.mjs";
import { Settings } from "../src/settings/codex/application.mjs";

const archive = path.resolve(process.argv[2] || "dist/codex-plugin/openquantum-0.7.4-codex-plugin.zip");
const cli = process.env.OPENQUANTUM_CODEX_CLI || "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex";
const home = await fs.mkdtemp(path.join(os.tmpdir(), "oq-host-validation-"));
const codexHome = path.join(home, ".codex");
const env = { PATH: process.env.PATH, HOME: home, CODEX_HOME: codexHome, TMPDIR: os.tmpdir() };
const receipt = { cli: execFileSync(cli, ["--version"], { encoding: "utf8" }).trim(), scope: "isolated fixture installation; no model requests" };
async function skills() {
  const child = spawn(cli, ["app-server", "--listen", "stdio://"], { cwd: home, env, stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout }); child.stderr.resume();
  let serial = 0; const pending = new Map();
  lines.on("line", line => {
    let message; try { message = JSON.parse(line); } catch { return; }
    const item = pending.get(message.id); if (!item) return;
    pending.delete(message.id); clearTimeout(item.timer);
    message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
  });
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject, timer: setTimeout(() => reject(new Error(`Host timeout: ${method}`)), 20000) });
    child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
  });
  try {
    await call("initialize", { clientInfo: { name: "openquantum-host-validation", version: "1" }, capabilities: { experimentalApi: true } });
    child.stdin.write('{"method":"initialized"}\n');
    const result = await call("skills/list", { cwds: [home], forceReload: true });
    return result.data.flatMap(entry => entry.skills).filter(skill => skill.name.startsWith("openquantum:"));
  } finally {
    for (const item of pending.values()) clearTimeout(item.timer);
    lines.close(); child.stdin.end();
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once("exit", resolve));
      child.kill(); const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
      await exited; clearTimeout(timer);
    }
  }
}
try {
  const installed = await installPlugin(archive, { home, codexHome, codex: cli, offline: process.env.OPENQUANTUM_OFFLINE === "1" });
  const first = await skills();
  assert.equal(first.length, installed.probe.skills);
  const id = "quantum-ground-state";
  const target = list => list.find(skill => skill.name === `openquantum:${id}`);
  assert.equal(target(first)?.enabled, true);
  const backend = { providers: [], tools: [], providerFor: () => undefined, sourceCapabilities: [{ id, title: id, skill: "fixture", status: "available", tools: [] }] };
  const settings = new Settings({ backend, credentials: {}, codexHome, skillRoot: path.dirname(path.dirname(target(first).path)), directory: path.join(home, "settings") });
  await settings.command({ action: "skill.set", id, enabled: false, revision: (await settings.snapshot()).revision });
  assert.equal(target(await skills()).enabled, false);
  assert.equal((await skills()).find(skill => skill.name !== `openquantum:${id}`).enabled, true);
  // Change only fixture source metadata to force a different native cache path.
  for (const relative of ["plugin.json", ".codex-plugin/plugin.json"]) {
    const file = path.join(installed.pluginDirectory, relative);
    const manifest = JSON.parse(await fs.readFile(file, "utf8")); manifest.version = "0.7.5-fixture";
    await fs.writeFile(file, JSON.stringify(manifest));
  }
  execFileSync(cli, ["plugin", "add", "openquantum@personal", "--json"], { cwd: home, env, stdio: ["ignore", "pipe", "pipe"] });
  const upgraded = target(await skills());
  assert.ok(upgraded.path.includes("0.7.5-fixture")); assert.equal(upgraded.enabled, false);
  const restoredSettings = new Settings({ backend, credentials: {}, codexHome, skillRoot: path.dirname(path.dirname(upgraded.path)), directory: path.join(home, "settings") });
  assert.equal((await restoredSettings.snapshot()).skills[0].enabled, false);
  await restoredSettings.command({ action: "skill.set", id, enabled: true, revision: (await restoredSettings.snapshot()).revision });
  assert.equal(target(await skills()).enabled, true);
  Object.assign(receipt, { version: installed.version, skills: first.length, pluginMcpRegistered: true, nativeDisableVerified: true, nativeUpgradePreserved: true, nativeReenableVerified: true, probe: installed.probe });
} finally { await fs.rm(home, { recursive: true, force: true }); }
console.log(JSON.stringify(receipt, null, 2));
