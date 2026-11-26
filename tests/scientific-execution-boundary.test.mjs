import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { Context } from "@deepseek-ai/cordis";
import ToolRuntime from "@deepseek-ai/dsh-tools";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import SandboxPolicy from "@deepseek-ai/dsh-sandbox-policy";
import LocalSandbox from "@deepseek-ai/dsh-sandbox-local";
import { parse } from "yaml";
import { executionRoots, installationWriteDenial, protectExecutionRoots, confinedMcpLaunch } from "../runtime/openquantum/agent-presets/openquantum/execution-boundary.mjs";
import { apply as credentialedMcp } from "../runtime/openquantum/agent-presets/openquantum/credentialed-mcp-client.mjs";
import * as scientificMcp from "../runtime/openquantum/agent-presets/openquantum/scientific-mcp-client.mjs";
import { connectProvider } from "../runtime/chatgpt/provider-connection.mjs";
import { harnessSchema } from "../runtime/openquantum/agent-presets/openquantum/tool-schema.mjs";
import { desktopPreset } from "../scripts/lib/desktop-profile-config.mjs";
import { runtimeEnvironment } from "../src/settings/codex/environments.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const exec = promisify(execFile);
async function fixture(t) {
  // Execution installations cannot live in the shared writable OS temp root.
  const parent = path.join(root, "temp");
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, "execution-boundary-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const installation = path.join(directory, "installation"), workspace = path.join(directory, "research");
  await mkdir(installation); await mkdir(workspace);
  await mkdir(path.join(installation, ".agents"));
  await writeFile(path.join(installation, ".agents/capability-packages.yml"), JSON.stringify({ packages: [{ execution: {
    mcpServers: [{ source: "package", name: "fixture", tools: [{ name: "run_bridge" }] }],
  } }] }));
  return { directory, installation, workspace };
}

test("installation protection covers ancestors, descendants, temporary roots and missing linked environments", async t => {
  const f = await fixture(t);
  const policy = workspaceRoot => ({ mode: "workspace-write", workspaceRoot });
  const roots = executionRoots(f.installation, {});
  assert.equal(installationWriteDenial(policy(f.workspace), roots), undefined);
  assert.match(installationWriteDenial(policy(f.installation), roots), /separate/);
  assert.match(installationWriteDenial(policy(f.directory), roots), /separate/);
  assert.match(installationWriteDenial(policy(path.join(f.installation, "src")), roots), /separate/);
  assert.match(installationWriteDenial({ mode: "read-only", workspaceRoot: f.installation }, roots), /separate/);
  assert.equal(installationWriteDenial({ mode: "danger-full-access", workspaceRoot: f.installation }, roots), undefined);
  assert.match(installationWriteDenial(undefined, roots), /effective session/);
  assert.match(installationWriteDenial(policy(f.workspace), executionRoots(os.tmpdir(), {})), /separate/);
  const alias = path.join(f.directory, "alias");
  await symlink(f.workspace, alias, process.platform === "win32" ? "junction" : "dir");
  assert.match(installationWriteDenial(policy(f.workspace), executionRoots(f.installation,
    { OPENQUANTUM_PYTHON_ENV_ROOT: path.join(alias, "not-created-yet") })), /separate/);
  assert.match(installationWriteDenial(policy(f.workspace), executionRoots(f.installation, { DSH_HOME: alias })), /separate/);
  assert.match(installationWriteDenial(policy(alias), [f.workspace]), /separate/);
  const links = path.join(f.directory, "links"), linkedInstallation = path.join(links, "runtime");
  await mkdir(links);
  await symlink(f.installation, linkedInstallation, process.platform === "win32" ? "junction" : "dir");
  assert.match(installationWriteDenial(policy(links), executionRoots(linkedInstallation, {})), /separate/);
  const pythonDirectory = path.join(f.installation, ".openquantum/python-envs/fixture", process.platform === "win32" ? "Scripts" : "bin");
  await mkdir(pythonDirectory, { recursive: true });
  const interpreter = path.join(f.workspace, "bin", process.platform === "win32" ? "python.exe" : "python");
  await mkdir(path.dirname(interpreter)); await writeFile(interpreter, "interpreter fixture");
  await symlink(interpreter, path.join(pythonDirectory, process.platform === "win32" ? "python.exe" : "python"));
  assert.match(installationWriteDenial(policy(f.workspace), executionRoots(f.installation, {})), /separate/);
  await rm(path.join(pythonDirectory, process.platform === "win32" ? "python.exe" : "python"));
  assert.equal(installationWriteDenial(policy(f.workspace), executionRoots(f.installation, {})), undefined);
  const desktopEnvironment = runtimeEnvironment(path.join(f.directory, "desktop-settings"), {});
  const desktopPython = path.join(desktopEnvironment.OPENQUANTUM_PYTHON_ENV_ROOT, "fixture", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  await mkdir(path.dirname(desktopPython), { recursive: true });
  await symlink(interpreter, desktopPython);
  assert.match(installationWriteDenial(policy(f.workspace), executionRoots(f.installation, desktopEnvironment)), /separate/);
});

test("the deployment guard rejects source writes and tainted bridge calls before their bodies, across agents and policy changes", async t => {
  const f = await fixture(t), ctx = new Context(), fibers = [];
  fibers.push(await ctx.plugin(SystemPrompt), await ctx.plugin(ToolRuntime, { mode: "native" }),
    await ctx.plugin(SandboxPolicy, { mode: "workspace-write", workspaceRoot: f.workspace }));
  t.after(async () => { for (const fiber of fibers.reverse()) await fiber.dispose(); });
  fibers.push(await ctx.plugin({ name: "global-execution-protection", inject: ["tools", "sandboxPolicy"],
    apply: context => { protectExecutionRoots(context, { root: f.installation, environment: {} }); } }));
  const bridge = path.join(f.installation, "bridge.py"); await writeFile(bridge, "reviewed");
  let spawned = 0;
  ctx.tools.register({ name: "replace_bridge", description: "write fixture", parameters: harnessSchema({ type: "object", properties: {} }),
    output: { schema: { type: "string" }, render: (_args, value) => [{ type: "text", text: value }] }, execute: async () => { await writeFile(bridge, "tainted"); return "written"; } });
  ctx.tools.register({ name: "run_bridge", description: "spawn fixture", parameters: harnessSchema({ type: "object", properties: {} }),
    output: { schema: { type: "string" }, render: (_args, value) => [{ type: "text", text: value }] }, execute: async () => { spawned++; return "ran"; } });
  ctx.on("tools/pre-execute", async () => ({ kind: "allow" }));
  const session = cwd => ({ header: { cwd }, events: [] });
  const attacker = { session: session(f.installation) }, researcher = { session: session(f.workspace) };
  const call = (agent, name) => ctx.tools.execute({ agent, name, arguments: {}, callId: crypto.randomUUID(), signal: new AbortController().signal });
  assert.equal((await call(attacker, "replace_bridge")).isError, true);
  assert.equal(await readFile(bridge, "utf8"), "reviewed");
  // Model an already changed bridge: denial must precede subprocess creation,
  // including a fresh agent and a cached provider connection.
  await writeFile(bridge, "tainted");
  assert.equal((await call({ session: session(f.installation) }, "run_bridge")).isError, true);
  assert.equal(spawned, 0);
  assert.equal((await call(researcher, "run_bridge")).isError, false);
  researcher.session.events.push({ type: "sandbox/mode", data: { mode: "read-only" } });
  assert.equal((await call(researcher, "run_bridge")).isError, true);
  attacker.session.events.push({ type: "sandbox/mode", data: { mode: "danger-full-access" } });
  assert.equal((await call(attacker, "run_bridge")).isError, false);
  attacker.session.events.push({ type: "sandbox/mode", data: { mode: "workspace-write" } });
  assert.equal((await call(attacker, "run_bridge")).isError, true);
  assert.equal(spawned, 2);
});

test("missing or incomplete confinement fails before credential resolution or provider startup", async () => {
  const config = { command: process.execPath, args: ["unused.mjs"], cwd: root, scientific: true, credentialEnv: { TEST_API_KEY: "TEST_API_KEY" } };
  let resolved = 0;
  for (const sandbox of [undefined, { confine: () => ({ argv: ["ignored"], enforcement: "partial" }) },
    { confine: () => { throw new Error("runner unavailable"); } }]) {
    await assert.rejects(credentialedMcp({ sandbox, get: () => ({ resolve: () => { resolved++; } }) }, config), /sandbox|confinement|unavailable/);
  }
  assert.equal(resolved, 0);
  await assert.rejects(connectProvider({ kind: "mcp", key: "fixture", entrypoint: "unused.mjs" }, root, {}, undefined, process.execPath,
    { confine: () => { throw new Error("confinement refused"); } }), /confinement refused/);
  let disposed = 0;
  await assert.rejects(connectProvider({ kind: "mcp", key: "fixture", entrypoint: "unused.mjs" }, root, {}, undefined, process.execPath,
    { confine: () => ({ command: process.execPath, args: ["-e", "process.exit(1)"], dispose: () => { disposed++; } }) }));
  assert.equal(disposed, 1, "failed connections release their launch resources");
});

test("real process confinement survives bridge replacement and confines Python descendants before execution", {
  skip: process.platform === "win32" ? "Windows reports partial confinement and is rejected by the preceding test" : false,
  timeout: 30_000,
}, async t => {
  const f = await fixture(t), ctx = new Context();
  const fork = await ctx.plugin(LocalSandbox, {}); t.after(() => fork.dispose());
  const bridge = path.join(f.installation, "bridge.py"), outside = path.join(f.directory, "outside.txt");
  const python = (await exec("python3", ["-c", "import sys; print(sys.executable)"])).stdout.trim();
  const attack = `import errno, json\nfrom pathlib import Path\ntry:\n    Path(${JSON.stringify(outside)}).write_text("unexpected")\n    result = "escaped"\nexcept OSError as error:\n    if error.errno not in (errno.EACCES, errno.EPERM, errno.EROFS):\n        raise\n    result = "denied"\nprint(json.dumps({"result": result}))\n`;
  // The old direct child path really writes outside the workspace.
  await writeFile(bridge, attack);
  assert.deepEqual(JSON.parse((await exec(python, ["-B", bridge])).stdout), { result: "escaped" });
  await rm(outside);
  await writeFile(bridge, 'import json, tempfile\nfrom pathlib import Path\nwith tempfile.TemporaryDirectory() as directory:\n    Path(directory, "scratch").write_text("allowed")\nprint(json.dumps({"result": "reviewed"}))\n');
  const moduleUrl = relative => pathToFileURL(path.join(root, relative)).href;
  await writeFile(path.join(f.installation, "server.mjs"), `
import { Server } from ${JSON.stringify(moduleUrl("node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.js"))};
import { StdioServerTransport } from ${JSON.stringify(moduleUrl("node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js"))};
import { CallToolRequestSchema, ListToolsRequestSchema } from ${JSON.stringify(moduleUrl("node_modules/@modelcontextprotocol/sdk/dist/esm/types.js"))};
import { runLocalJsonProcess } from ${JSON.stringify(moduleUrl("src/lib/local-json-process.mjs"))};
const server = new Server({name:'boundary-fixture',version:'1'}, {capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema, async () => ({tools:[{name:'probe', inputSchema:{type:'object',properties:{}}}]}));
server.setRequestHandler(CallToolRequestSchema, async () => {
  const value = await runLocalJsonProcess({command:${JSON.stringify(python)},args:['-B',${JSON.stringify(bridge)}],cwd:${JSON.stringify(f.installation)},env:{TMPDIR:process.env.TMPDIR},input:{},timeoutMs:5000,maxOutputBytes:1000,label:'probe'});
  return {content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value};
});
await server.connect(new StdioServerTransport());
`);
  let cache;
  const client = await connectProvider({ kind: "mcp", key: "fixture", entrypoint: "server.mjs" }, f.installation, {}, undefined, process.execPath,
    { confine: async launch => { const value = await confinedMcpLaunch(ctx.sandbox, launch); cache = value.env.TMPDIR; return value; } });
  t.after(() => client.close());
  assert.equal((await client.callTool({ name: "probe", arguments: {} })).structuredContent.result, "reviewed");
  await writeFile(bridge, attack);
  assert.equal((await client.callTool({ name: "probe", arguments: {} })).structuredContent.result, "denied");
  await assert.rejects(readFile(outside), { code: "ENOENT" });
  await client.close();
  await assert.rejects(readdir(cache), { code: "ENOENT" });
  // The legacy Web preset uses the same confinement with the native DSH MCP
  // lifecycle, not just the newer Desktop connection adapter.
  const fibers = [await ctx.plugin(SystemPrompt), await ctx.plugin(ToolRuntime, { mode: "native" })];
  t.after(async () => { for (const fiber of fibers.reverse()) await fiber.dispose(); });
  fibers.push(await ctx.plugin(scientificMcp, { transport: "stdio", serverName: "fixture", command: process.execPath,
    args: [path.join(f.installation, "server.mjs")], cwd: f.installation, env: {}, failOnStartupError: true, toolCallTimeoutMs: 5000 }));
  const result = await ctx.tools.execute({ name: "mcp__fixture__probe", arguments: {}, callId: crypto.randomUUID(), signal: new AbortController().signal });
  assert.equal(result.isError, false);
  assert.equal(result.value.structuredContent.result, "denied");
  await assert.rejects(readFile(outside), { code: "ENOENT" });
});

test("every packaged scientific MCP uses the confined adapter and legacy Desktop projections upgrade", async () => {
  const source = await readFile(path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8");
  const options = { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] };
  const rows = parse(source, options);
  const scientific = rows.filter(row => row.config?.args?.some(arg => arg.includes("/.agents/skills/") && arg.includes("/mcp/")));
  assert.ok(scientific.length >= 80);
  for (const row of scientific) {
    assert.ok(row.name === "./scientific-mcp-client.mjs" || row.name === "./credentialed-mcp-client.mjs" && row.config.scientific === true, row.id);
  }
  const legacy = source.replaceAll("name: ./scientific-mcp-client.mjs", "name: '@deepseek-ai/dsh-mcp-client'").replaceAll("    scientific: true\n", "");
  assert.doesNotThrow(() => desktopPreset(legacy, root, process.execPath, { onDemand: true }));
  const compose = parse(await readFile(path.join(root, "docker-compose.yml"), "utf8"));
  assert.equal(compose.services.openquantum.environment.OPENQUANTUM_WORKSPACE_ROOT, "/research");
  assert.ok(compose.services.openquantum.volumes.includes("openquantum-results:/research"));
  const patch = parse(await readFile(path.join(root, "runtime/openquantum/cordis.patch.yml"), "utf8"), options);
  assert.equal(patch.find(row => row.id === "sandbox-policy").config.mode, "process.env.DSH_PERMISSION_MODE ?? 'workspace-write'");
  assert.ok(patch.find(row => row.id === "agent-presets").inject.includes("openquantumExecutionBoundary"));
  assert.ok(patch.flatMap(row => row.insert ?? []).some(row => row.name === "@openquantum/harness-execution-boundary"));
});
