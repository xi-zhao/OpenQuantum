import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { OPENER, settingsResourceUri } from "../runtime/chatgpt/server.mjs";

export async function probeTransport(transport) {
  const client = new Client({ name: "openquantum-release-probe", version: "1.0.0" });
  transport.stderr?.resume();
  try {
    await client.connect(transport, { timeout: 60000 });
    const { tools } = await client.listTools();
    const globalEntries = tools.filter(tool => tool._meta?.["openai/ui"]?.entrypoints?.some(item => item.type === "global"));
    const [opener] = globalEntries;
    if (globalEntries.length !== 1 || opener.name !== OPENER || opener.title !== "OpenQuantum 设置" ||
        !opener._meta.ui.visibility.includes("app")) throw new Error("Missing unique global settings entrypoint");
    const result = await client.callTool({ name: opener.name, arguments: {} });
    const settings = result._meta?.openquantumSettings;
    if (result.isError || !Array.isArray(settings?.skills) || !Array.isArray(settings?.connections) || result.content.length) throw new Error("Invalid settings opener result");
    const resource = await client.readResource({ uri: opener._meta.ui.resourceUri });
    const html = resource.contents[0]?.text;
    if (!html || settingsResourceUri(html) !== opener._meta.ui.resourceUri ||
        !["skills", "connections", "tools"].every(tab => html.includes(`data-tab="${tab}"`))) throw new Error("Global entrypoint does not resolve to the current settings document");
    const reference = await client.callTool({ name: "quantum_practices", arguments: { action: "list", limit: 1 } });
    if (reference.isError) throw new Error("Reference tool failed");
    const disabled = await client.callTool({ name: "openquantum_settings", arguments: { action: "tool.set", id: "quantum_practices", enabled: false, revision: settings.revision } });
    if (disabled.isError || (await client.listTools()).tools.some(tool => tool.name === "quantum_practices")) throw new Error("Tool disable did not change inventory");
    if (!(await client.callTool({ name: "quantum_practices", arguments: { action: "list" } })).isError) throw new Error("Disabled Tool accepted a cached call");
    return { version: client.getServerVersion().version, tools: tools.length - 2, skills: settings.skills.length,
      globalEntrypoint: opener.name, settingsResourceUri: opener._meta.ui.resourceUri,
      settingsResource: true, referenceExecution: true, disabledToolRejected: true, hostPlacementVerified: false };
  } finally { await client.close(); }
}

// Always use an isolated configuration: a release probe must not toggle a user's Tools.
export async function probePlugin(directory) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, "mcp.json"), "utf8"));
  const server = manifest.mcpServers?.openquantum;
  if (server?.type !== "stdio") throw new Error("Expected a local stdio plugin");
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "oq-plugin-probe-"));
  const expand = value => value.replaceAll("${PLUGIN_ROOT}", path.resolve(directory));
  try {
    const result = await probeTransport(new StdioClientTransport({ ...server, command: process.execPath,
      args: server.args.map(expand), cwd: expand(server.cwd), stderr: "pipe",
      env: { ...Object.fromEntries(Object.entries(server.env ?? {}).map(([key, value]) => [key, expand(value)])),
        PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ""}`, HOME: os.homedir(),
        CODEX_HOME: path.join(temporary, "codex"), OPENQUANTUM_PLUGIN_SETTINGS_HOME: path.join(temporary, "settings") },
    }));
    const release = JSON.parse(await fs.readFile(path.join(directory, "release.json"), "utf8"));
    if (result.version !== release.version || result.skills !== release.skills || result.tools !== release.tools) throw new Error("Release inventory does not match the packaged server");
    return result;
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: node scripts/probe-chatgpt.mjs <plugin-directory>");
  console.log(JSON.stringify(await probePlugin(path.resolve(process.argv[2])), null, 2));
}
