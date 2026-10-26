import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { OPENER, settingsResourceUri } from "../runtime/chatgpt/settings-resource.mjs";
import { sealCredentialField } from "../src/settings/credential-seal.mjs";

function credentialOriginOf(resource) {
  const origin = resource?.text?.match(/name="openquantum-credential-origin" content="([^"]+)"/)?.[1];
  if (!origin || !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
      JSON.stringify(resource._meta?.ui?.csp?.connectDomains) !== JSON.stringify([origin])) throw new Error("Credential origin is missing or does not match the resource CSP");
  return origin;
}

export async function probeTransport(transport, discoveredResource) {
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
    if (discoveredResource && discoveredResource.uri !== opener._meta.ui.resourceUri) throw new Error("Settings resource identity changed between MCP processes");
    const resource = await client.readResource({ uri: discoveredResource?.uri ?? opener._meta.ui.resourceUri });
    const html = resource.contents[0]?.text;
    if (!html || settingsResourceUri(html) !== opener._meta.ui.resourceUri ||
        !["runtime", "mcp", "skills", "credentials"].every(tab => html.includes(`data-tab="${tab}"`))) throw new Error("Global entrypoint does not resolve to the current settings document");
    const credentialOrigin = credentialOriginOf(resource.contents[0]);
    if (discoveredResource?.origin === credentialOrigin) throw new Error("Cross-process probe did not use independent credential listeners");
    const permission = await client.callTool({ name: "openquantum_settings", arguments: {
      action: "credential.field.issue", id: "fieldqkit", field: "QUAFU_API_TOKEN", operation: "set", origin: "null",
    } });
    if (permission.isError || new URL(permission._meta.openquantumSettings.url).origin !== credentialOrigin) throw new Error("Credential authorization does not match the app resource process");
    const prepared = await client.callTool({ name: "openquantum_settings", arguments: {
      action: "credential.field.prepare", id: "fieldqkit", field: "QUAFU_API_TOKEN", operation: "set",
    } });
    if (prepared.isError) throw new Error("Encrypted credential channel is unavailable");
    const authorization = prepared._meta.openquantumSettings;
    // An intentionally invalid empty value verifies decryption and field
    // validation without creating a credential in the release probe.
    const encryptedRequest = { name: "openquantum_settings", arguments: { action: "credential.field.commit", nonce: authorization.nonce,
      ciphertext: await sealCredentialField(authorization, { value: "" }) } };
    if ((await client.callTool(encryptedRequest))._meta?.openquantumSettings?.status !== 400 ||
        (await client.callTool(encryptedRequest))._meta?.openquantumSettings?.status !== 403) throw new Error("Encrypted credential validation or replay protection failed");
    if (!Array.isArray(settings.services) || !Array.isArray(settings.tools)) throw new Error("Missing service configuration inventory");
    const managed = settings.services.filter(service => service.supported);
    if (managed.some(service => service.tools.some(tool => !tool.enabled))) throw new Error("Allowed Tools must not require manual opt-in");
    const modelTools = tools.filter(tool => !tool._meta?.ui?.visibility || tool._meta.ui.visibility.includes("model"));
    const entrypoints = ["execute_openquantum_tool", "find_openquantum_skills", "prepare_openquantum_skill"];
    if (JSON.stringify(modelTools.map(tool => tool.name).sort()) !== JSON.stringify(entrypoints)) throw new Error("Missing bounded Agent discovery/preparation/execution interface");
    const search = await client.callTool({ name: "find_openquantum_skills", arguments: { query: "quantum_practices" } });
    const capability = search.structuredContent.matches.find(item => item.tools.includes("quantum_practices"));
    if (!capability) throw new Error("Tool-only reference capability is missing from discovery");
    const selected = await client.callTool({ name: "find_openquantum_skills", arguments: { skillId: capability.skillId, toolName: "quantum_practices" } });
    if (!selected.structuredContent?.tool?.inputSchema || selected.structuredContent.execution.name !== "execute_openquantum_tool") throw new Error("Selected scientific contract is unavailable");
    const invocation = { ...selected.structuredContent.execution.arguments, arguments: { action: "list", limit: 1 } };
    const reference = await client.callTool({ name: "execute_openquantum_tool", arguments: invocation });
    if (reference.isError) throw new Error("Reference tool failed");
    const disabled = await client.callTool({ name: "openquantum_settings", arguments: { action: "tool.set", id: "quantum_practices", enabled: false, revision: settings.revision } });
    if (disabled.isError || (await client.callTool({ name: "find_openquantum_skills", arguments: { skillId: capability.skillId, toolName: "quantum_practices" } })).structuredContent?.state !== "blocked") throw new Error("Tool disable did not change selection policy");
    if (!(await client.callTool({ name: "execute_openquantum_tool", arguments: invocation })).isError) throw new Error("Disabled Tool accepted a dispatch call");
    if (!(await client.callTool({ name: "quantum_practices", arguments: { action: "list" } })).isError) throw new Error("Disabled Tool accepted a cached call");
    return { version: client.getServerVersion().version, tools: settings.tools.length, enabledTools: settings.tools.filter(tool => tool.enabled).length, skills: settings.skills.length,
      services: settings.services.length, configurableServices: managed.length, automaticSelection: true, modelTools: entrypoints, selectedContractAvailable: true, credentialValuesNeverListed: true,
      globalEntrypoint: opener.name, settingsResourceUri: opener._meta.ui.resourceUri,
      settingsResource: true, crossProcessResource: Boolean(discoveredResource), credentialOriginBound: true,
      credentialAuthorizationBound: true, encryptedCredentialTransport: true, referenceExecution: true, disabledToolRejected: true, hostPlacementVerified: false };
  } finally { await client.close(); }
}

// Always use an isolated configuration: a release probe must not toggle a user's Tools.
export async function probePlugin(directory) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, "mcp.json"), "utf8"));
  const server = manifest.mcpServers?.openquantum;
  if (server?.type !== "stdio") throw new Error("Expected a local stdio plugin");
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "oq-plugin-probe-"));
  const expand = value => value.replaceAll("${PLUGIN_ROOT}", path.resolve(directory));
  const discovery = new Client({ name: "openquantum-discovery-probe", version: "1.0.0" });
  try {
    const credentialService = `org.openquantum.test.${randomUUID()}`;
    const transport = () => new StdioClientTransport({ ...server, command: process.execPath,
      args: server.args.map(expand), cwd: expand(server.cwd), stderr: "pipe",
      env: { ...Object.fromEntries(Object.entries(server.env ?? {}).map(([key, value]) => [key, expand(value)])),
        PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ""}`, HOME: os.homedir(),
        CODEX_HOME: path.join(temporary, "codex"), OPENQUANTUM_PLUGIN_SETTINGS_HOME: path.join(temporary, "settings"),
        OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE: credentialService },
    });
    // Codex discovers a global entry separately from the app's MCP session.
    // Keep both listeners alive so the test cannot accidentally reuse a port.
    const discoveryTransport = transport();
    discoveryTransport.stderr?.resume();
    await discovery.connect(discoveryTransport, { timeout: 60000 });
    const entry = (await discovery.listTools()).tools.find(tool => tool.name === OPENER);
    if (!entry) throw new Error("Missing discovery entrypoint");
    const uri = entry._meta.ui.resourceUri;
    const origin = credentialOriginOf((await discovery.readResource({ uri })).contents[0]);
    const result = await probeTransport(transport(), { uri, origin });
    const release = JSON.parse(await fs.readFile(path.join(directory, "release.json"), "utf8"));
    if (result.version !== release.version || result.skills !== release.skills || result.tools !== release.tools) throw new Error("Release inventory does not match the packaged server");
    return { ...result, isolatedCredentials: true };
  } finally { await discovery.close(); await fs.rm(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: node scripts/probe-chatgpt.mjs <plugin-directory>");
  console.log(JSON.stringify(await probePlugin(path.resolve(process.argv[2])), null, 2));
}
