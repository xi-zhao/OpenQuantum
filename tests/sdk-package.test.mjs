import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { buildPlugin } from "../scripts/build-codex-plugin.mjs";
import { readSdkLibraries } from "../src/lib/sdk-access.mjs";
import { readCapabilities, providerGroups } from "../runtime/chatgpt/catalog.mjs";
import { Settings } from "../src/settings/codex/application.mjs";
import { locateSdkRuntime } from "../runtime/chatgpt/sdk-access.mjs";
import { installedMcpServer } from "../scripts/install-codex-plugin.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);

test("SDK access survives archive, split installation and cached Skill relocation without enabling optional MCP", { timeout: 180000 }, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq sdk package "));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const { pluginRoot } = await buildPlugin({ root, output: path.join(directory, "build") });
  const server = path.join(pluginRoot, "server");
  assert.equal(await locateSdkRuntime(pluginRoot), server);
  for (const entry of await readSdkLibraries(root)) {
    const project = entry.id === "quantum-algorithms" ? "examples/quantum-algorithms" : `.agents/skills/${entry.id}`;
    await fs.access(path.join(server, project, entry.nativeProject?.lock ?? (entry.language === "julia" ? "Manifest.toml" : "uv.lock")));
  }
  for (const file of ["scripts/setup-sdk.mjs", "scripts/setup-native-sdk.mjs", "scripts/setup-paper-tools.mjs", "scripts/setup-open-algorithm-examples.mjs", "scripts/setup-qdmi.mjs", "scripts/sdk-access.mjs", "src/lib/sdk-source.mjs", "src/lib/sdk_bootstrap.py", "src/lib/installed-python.mjs", "src/lib/check_python_install.py", ".agents/skills/qpanda-qubo/scripts/setup-native.mjs", "examples/quantum-algorithms/run.py"]) await fs.access(path.join(server, file));
  // Test a real installed filesystem layout; no installer runs on the user's account.
  const runtime = path.join(directory, "installed runtime");
  await fs.rename(server, runtime);
  await fs.symlink(path.join(root, "node_modules"), path.join(runtime, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  await fs.writeFile(path.join(pluginRoot, "mcp.json"), JSON.stringify({ mcpServers: { openquantum: installedMcpServer(runtime, path.dirname(process.execPath)) } }));
  const cached = path.join(directory, "host cache", "openquantum");
  await fs.cp(pluginRoot, cached, { recursive: true });
  assert.equal(await locateSdkRuntime(cached), runtime);
  const script = path.join(cached, "skills/tenpy-ground-state/scripts/sdk-access.mjs");
  const environment = { ...process.env, OPENQUANTUM_PLUGIN_SETTINGS_HOME: path.join(directory, "isolated settings") };
  const { stdout } = await run(process.execPath, [script, "inspect", "tenpy-ground-state"], { cwd: directory, env: environment });
  const result = JSON.parse(stdout);
  assert.equal(result.project, path.join(runtime, ".agents/skills/tenpy-ground-state"));
  assert.equal(result.setup.tool, "prepare_openquantum_skill");
  assert.equal(result.setup.sdkId, "tenpy-ground-state");
  assert.equal(result.run.command, path.join(environment.OPENQUANTUM_PLUGIN_SETTINGS_HOME, "environments/python/tenpy-ground-state", process.platform === "win32" ? "Scripts/python.exe" : "bin/python"));
  assert.equal(result.dashboard.state, "not_installed");
  assert.equal(result.environmentState, "not_prepared");
  const discovery = JSON.parse((await run(process.execPath, [path.join(cached, "skills/quantum-sdk-workbench/scripts/sdk-access.mjs"), "list"], { env: environment })).stdout);
  assert.ok(discovery.some(entry => entry.id === "quantum-algorithms"));
  assert.ok(discovery.some(entry => entry.id === "netqasm-network"));
  const pasqalScript = path.join(cached, "skills/pasqal-experiments/scripts/pasqal-cloud.mjs");
  await fs.access(pasqalScript);
  const pasqalSkill = await fs.readFile(path.join(cached, "skills/pasqal-experiments/SKILL.md"), "utf8");
  assert.match(pasqalSkill, /scripts\/pasqal-cloud.mjs/);
  for (const args of [["prepare"], ["-c", "arbitrary.py"], ["cancel", "--receipt", "receipt.json"]]) {
    await assert.rejects(run(process.execPath, [pasqalScript, ...args], { cwd: directory, env: { ...environment,
      CODEX_HOME: path.join(directory, "isolated codex"), OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE: "org.openquantum.invalid-never-read" } }), error => {
      assert.match(error.stderr, /仅支持|必要参数或明确确认/);
      assert.doesNotMatch(error.stderr, /ERR_MODULE_NOT_FOUND|系统凭据库|arbitrary.py/);
      return true;
    });
  }
  const pluginCapabilities = await readCapabilities(runtime);
  const optionalIds = ["fieldqkit-hardware", "oqc-cloud", "classiq-synthesis", "netqasm-network"];
  for (const id of optionalIds) {
    const capability = pluginCapabilities.find(entry => entry.id === id);
    assert.equal(capability.status, "available", id);
    assert.equal(capability.optIn, true, id);
    await fs.access(path.join(cached, "skills", id, "SKILL.md"));
  }
  const providers = providerGroups(pluginCapabilities);
  const { tools } = JSON.parse(await fs.readFile(path.join(runtime, "dist/chatgpt/capabilities.json"), "utf8"));
  const settings = new Settings({
    backend: { sourceCapabilities: pluginCapabilities, providers, tools,
      providerFor: name => providers.find(provider => provider.tools.some(tool => tool.name === name))?.key },
    credentials: { resolve: async () => null, describe: async () => ({ configured: false }) },
    directory: path.join(directory, "isolated settings"), codexHome: path.join(directory, "isolated codex"), skillRoot: path.join(cached, "skills"),
  });
  const snapshot = await settings.snapshot();
  const listed = await settings.listTools();
  for (const id of optionalIds) {
    const capability = pluginCapabilities.find(entry => entry.id === id);
    const provider = providers.find(provider => provider.key === capability.mcp[0].name);
    assert.equal(provider.defaultEnabled, false, id);
    assert.equal(snapshot.providers.find(item => item.id === provider.key).enabled, true, id);
    for (const name of capability.tools) {
      assert.equal(snapshot.tools.find(tool => tool.id === name).enabled, true, name);
      assert.ok(listed.some(tool => tool.name === name), name);
    }
  }
  const algorithms = pluginCapabilities.find(entry => entry.id === "quantum-algorithms");
  assert.equal(algorithms.status, "available");
  assert.equal(algorithms.hostTools.length, 2);
  assert.deepEqual(algorithms.tools, []); // Host execution is not a new MCP Tool.
  const workbench = await fs.readFile(path.join(cached, "skills/quantum-sdk-workbench/SKILL.md"), "utf8");
  assert.match(workbench, /原生 SDK/);
  await fs.access(path.join(cached, "skills/netqasm-network/SKILL.md"));
});
