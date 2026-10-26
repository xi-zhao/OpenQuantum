// Isolated installation and native Skill regression. Never uses the user's Codex home.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { installPlugin } from "./install-codex-plugin.mjs";
import { Settings } from "../src/settings/codex/application.mjs";

const { version } = JSON.parse(await fs.readFile(new URL("../distributions/codex-plugin/package.json", import.meta.url), "utf8"));
const archive = path.resolve(process.argv[2] || `dist/codex-plugin/openquantum-${version}-codex-plugin.zip`);
const cli = process.env.OPENQUANTUM_CODEX_CLI || "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex";
const home = await fs.mkdtemp(path.join(os.tmpdir(), "oq-host-validation-"));
const codexHome = path.join(home, ".codex");
const env = { PATH: process.env.PATH, HOME: home, CODEX_HOME: codexHome, TMPDIR: os.tmpdir() };
const receipt = { cli: execFileSync(cli, ["--version"], { encoding: "utf8" }).trim(), scope: "isolated fixture installation; no model requests" };
let installed;
async function skills({ verifyAgentInterface = false } = {}) {
  const child = spawn(cli, ["app-server", "--listen", "stdio://"], { cwd: home, env, stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout }); child.stderr.resume();
  let serial = 0; const pending = new Map();
  lines.on("line", line => {
    let message; try { message = JSON.parse(line); } catch { return; }
    const item = pending.get(message.id); if (!item) return;
    pending.delete(message.id); clearTimeout(item.timer);
    message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
  });
  const call = (method, params, timeoutMs = 20000) => new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject, timer: setTimeout(() => reject(new Error(`Host timeout: ${method}`)), timeoutMs) });
    child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
  });
  try {
    await call("initialize", { clientInfo: { name: "openquantum-host-validation", version: "1" }, capabilities: { experimentalApi: true } });
    child.stdin.write('{"method":"initialized"}\n');
    const result = await call("skills/list", { cwds: [home], forceReload: true });
    if (verifyAgentInterface) {
      // An ephemeral native thread loads the actual plugin MCP connection.
      // No turn/start or model request is made by this protocol acceptance.
      const { thread } = await call("thread/start", { cwd: home, ephemeral: true }, 60000);
      const status = await call("mcpServerStatus/list", { threadId: thread.id, detail: "toolsAndAuthOnly", limit: 100 }, 60000);
      const server = status.data.find(item => Object.values(item.tools).some(tool => tool.name === "find_openquantum_skills"));
      assert.ok(server, "native host must discover the preparation interface");
      const modelTools = Object.values(server.tools).filter(tool => !tool._meta?.ui?.visibility || tool._meta.ui.visibility.includes("model")).map(tool => tool.name).sort();
      assert.deepEqual(modelTools, ["execute_openquantum_tool", "find_openquantum_skills", "prepare_openquantum_skill"]);
      const invoke = async (tool, args) => {
        const response = await call("mcpServer/tool/call", { threadId: thread.id, server: server.name, tool, arguments: args }, 60000);
        assert.ok(!response.isError, "native MCP call must succeed");
        if (response.structuredContent != null) return response.structuredContent;
        const text = response.content.find(item => item.type === "text")?.text;
        try { return JSON.parse(text); } catch { return response; }
      };
      const braket = await invoke("find_openquantum_skills", { skillId: "braket-simulation", toolName: "simulate_braket_circuit" });
      assert.equal(braket.state, "environment_required");
      const catalog = JSON.parse(await fs.readFile(path.join(installed.runtimeDirectory, "dist/chatgpt/capabilities.json"), "utf8"));
      const expected = catalog.tools.find(tool => tool.name === "simulate_braket_circuit");
      for (const key of ["inputSchema", "outputSchema", "annotations"]) assert.deepEqual(braket.tool[key], expected[key]);
      const search = await invoke("find_openquantum_skills", { query: "quantum_practices" });
      const capability = search.matches.find(item => item.tools.includes("quantum_practices"));
      assert.ok(capability);
      const reference = await invoke("prepare_openquantum_skill", { skillId: capability.skillId, toolName: "quantum_practices" });
      assert.equal(reference.state, "ready");
      await invoke("execute_openquantum_tool", { ...reference.execution.arguments, arguments: { action: "list", limit: 1 } });
      receipt.nativeAgentInterface = { modelTools, exactScientificContract: true, missingEnvironmentDiscovered: true,
        sameThreadPreparationAndExecution: true, referenceExecution: true, credentialNamespaceIsolated: true, modelAutonomy: "not_checked", modelRequests: false };
    }
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
  installed = await installPlugin(archive, { home, codexHome, codex: cli, offline: process.env.OPENQUANTUM_OFFLINE === "1" });
  // HOME does not isolate the system keyring. Pin an explicit random namespace
  // in both fixture manifests before starting a native MCP connection; do not
  // depend on app-server forwarding arbitrary environment variables.
  const credentialService = `org.openquantum.test.${randomUUID()}`;
  for (const directory of [installed.pluginDirectory, path.join(codexHome, "plugins/cache/personal/openquantum", installed.version)]) {
    const file = path.join(directory, "mcp.json");
    const manifest = JSON.parse(await fs.readFile(file, "utf8"));
    Object.assign(manifest.mcpServers.openquantum.env, { OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE: credentialService,
      OPENQUANTUM_PLUGIN_SETTINGS_HOME: path.join(home, "settings") });
    await fs.writeFile(file, JSON.stringify(manifest));
  }
  const first = await skills({ verifyAgentInterface: process.env.OPENQUANTUM_VERIFY_AGENT_INTERFACE === "1" });
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
  Object.assign(receipt, { version: installed.version, archiveSha256: installed.archiveSha256, skills: first.length, pluginMcpRegistered: true, nativeDisableVerified: true, nativeUpgradePreserved: true, nativeReenableVerified: true, probe: installed.probe });
} finally { await fs.rm(home, { recursive: true, force: true }); }
console.log(JSON.stringify(receipt, null, 2));
