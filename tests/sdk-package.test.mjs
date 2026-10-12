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
import { readCapabilities } from "../runtime/chatgpt/catalog.mjs";
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
    await fs.access(path.join(server, project, entry.language === "julia" ? "Manifest.toml" : "uv.lock"));
  }
  for (const file of ["scripts/setup-sdk.mjs", "scripts/setup-paper-tools.mjs", "scripts/setup-open-algorithm-examples.mjs", "scripts/setup-qdmi.mjs", "scripts/sdk-access.mjs", "src/lib/sdk_bootstrap.py", "src/lib/installed-python.mjs", "src/lib/check_python_install.py", ".agents/skills/qpanda-qubo/scripts/setup-native.mjs", "examples/quantum-algorithms/run.py"]) await fs.access(path.join(server, file));
  // Test a real installed filesystem layout; no installer runs on the user's account.
  const runtime = path.join(directory, "installed runtime");
  await fs.rename(server, runtime);
  await fs.symlink(path.join(root, "node_modules"), path.join(runtime, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  await fs.writeFile(path.join(pluginRoot, "mcp.json"), JSON.stringify({ mcpServers: { openquantum: installedMcpServer(runtime, path.dirname(process.execPath)) } }));
  const cached = path.join(directory, "host cache", "openquantum");
  await fs.cp(pluginRoot, cached, { recursive: true });
  assert.equal(await locateSdkRuntime(cached), runtime);
  const script = path.join(cached, "skills/tenpy-ground-state/scripts/sdk-access.mjs");
  const { stdout } = await run(process.execPath, [script, "inspect", "tenpy-ground-state"], { cwd: directory });
  const result = JSON.parse(stdout);
  assert.equal(result.project, path.join(runtime, ".agents/skills/tenpy-ground-state"));
  assert.equal(result.setup.args[0], path.join(runtime, "scripts/setup-sdk.mjs"));
  assert.equal(result.environmentState, "not_prepared");
  const discovery = JSON.parse((await run(process.execPath, [path.join(cached, "skills/quantum-sdk-workbench/scripts/sdk-access.mjs"), "list"])).stdout);
  assert.ok(discovery.some(entry => entry.id === "quantum-algorithms"));
  assert.ok(discovery.some(entry => entry.id === "netqasm-network"));
  const pluginCapabilities = await readCapabilities(runtime);
  for (const capability of pluginCapabilities.filter(entry => ["fieldqkit-hardware", "oqc-cloud", "classiq-synthesis"].includes(entry.id))) assert.equal(capability.status, "unsupported", capability.id);
  const algorithms = pluginCapabilities.find(entry => entry.id === "quantum-algorithms");
  assert.equal(algorithms.status, "available");
  assert.equal(algorithms.hostTools.length, 2);
  assert.deepEqual(algorithms.tools, []); // Host execution is not a new MCP Tool.
  const workbench = await fs.readFile(path.join(cached, "skills/quantum-sdk-workbench/SKILL.md"), "utf8");
  assert.match(workbench, /原生 SDK/);
  await assert.rejects(fs.access(path.join(cached, "skills/oqc-cloud/SKILL.md")), { code: "ENOENT" });
});
