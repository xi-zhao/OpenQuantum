import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { DISCOVER_TOOL, PREPARE_TOOL, preparationProperties, discoverSkills, prepareSkill } from "../../src/settings/codex/preparation.mjs";
import { EXECUTE_TOOL, executionTool, describePreparation, executeTool } from "./agent-tools.mjs";

const LEGACY_UI_URI = "ui://openquantum/workbench.html";
const SETTINGS_UI_URI = /^ui:\/\/openquantum\/settings\/[a-f0-9]{64}\.html$/;
const LEGACY_OPENER = "open_openquantum";
import { OPENER, SETTINGS_TOOL, settingsResourceUri, prepareSettingsDocument } from "./settings-resource.mjs";
export { OPENER, SETTINGS_TOOL, settingsResourceUri, prepareSettingsDocument } from "./settings-resource.mjs";
export const ICON = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="24" cy="24" rx="21" ry="8" transform="rotate(45 24 24)"/><ellipse cx="24" cy="24" rx="21" ry="8" transform="rotate(-45 24 24)"/><circle cx="24" cy="24" r="3" fill="currentColor"/></svg>').toString("base64")}`;
const schema = { type: "object", properties: { action: { type: "string", enum: ["snapshot", "skill.prepare", "skill.set", "tool.set", "tool.operation.set", "provider.set", "connection.add", "connection.update", "connection.set", "connection.tool.set", "connection.remove", "connection.test", "credentials.open", "service.credentials.open", "credential.field.issue", "credential.field.prepare", "credential.field.commit", "environment.install", "environment.check", "environment.cancel", "environment.configure"] },
  ...preparationProperties, retry: { type: "boolean" },
  resetCredential: { type: "boolean" },
  configuration: { type: "object", properties: { simulationPython: { type: "string", maxLength: 4096 }, driverConfiguration: { type: "string", maxLength: 4096 } }, additionalProperties: false },
  configurationRevision: { type: "string", maxLength: 64 }, jobId: { type: "string", maxLength: 64 },
  nonce: { type: "string", pattern: "^[a-f0-9]{64}$" }, ciphertext: { type: "string", maxLength: 32768 },
  field: { type: "string", maxLength: 128 }, operation: { enum: ["set", "remove"] }, origin: { type: "string", maxLength: 2048 },
  connectionInstance: { type: "string", maxLength: 128 },
  revision: { type: "string", maxLength: 64 }, id: { type: "string", maxLength: 128 }, enabled: { type: "boolean" }, tool: { type: "string", maxLength: 128 },
  connection: { type: "object", additionalProperties: false, properties: { id: { type: "string", maxLength: 32 }, transport: { enum: ["stdio", "http"] }, url: { type: "string", maxLength: 2048 }, command: { type: "string", maxLength: 1024 }, args: { type: "array", maxItems: 32, items: { type: "string", maxLength: 2048 } }, tokenEnv: { type: "string", maxLength: 64 }, authentication: { enum: ["none", "token"] } }, required: ["id", "transport", "authentication"] },
}, required: ["action"], additionalProperties: false };

export async function settingsRequest({ settings, connections, credentialWindow }, input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !Object.hasOwn(schema.properties, key))) throw new Error("设置字段无效");
  if (input.action === "credentials.open") return { url: await credentialWindow.open(input.id) };
  if (input.action === "service.credentials.open") return { url: await credentialWindow.openService(input.id) };
  if (input.action === "credential.field.issue") return credentialWindow.issueField(input);
  if (input.action === "credential.field.prepare") return credentialWindow.prepareField(input);
  if (input.action === "credential.field.commit") return credentialWindow.commitField(input);
  if (input.action === "snapshot") return settings.snapshot();
  if (input.action === "skill.prepare") {
    const selection = Object.fromEntries(Object.entries(input).filter(([key]) => !["action", "revision"].includes(key)));
    await prepareSkill(settings, selection);
    return settings.snapshot();
  }
  if (input.action?.startsWith("environment.")) return settings.environmentCommand(input);
  if (input.action === "connection.test") return connections.probe(input.id, input.connectionInstance);
  return settings.command(input);
}

export function createMcpServer({ backend, settings, connections, credentialWindow, html, release }) {
  const context = { settings, connections, credentialWindow };
  html = prepareSettingsDocument(html, credentialWindow?.origin);
  const uiUri = settingsResourceUri(html);
  const server = new Server({ name: "openquantum", version: release.version, icons: [{ src: ICON, mimeType: "image/svg+xml" }] }, {
    capabilities: { tools: { listChanged: true }, resources: {} },
    instructions: `OpenQuantum: choose Skills for the user's task, not by asking them to toggle a catalog. Use ${DISCOVER_TOOL} to search concise descriptions and inspect the selected Tool's exact inputSchema without side effects. Before executing, use ${PREPARE_TOOL} for exactly the selected Tool or SDK; it may install pinned dependencies but never runs the scientific task. While preparing, keep inspecting the same selection until ready, then continue the original task with ${EXECUTE_TOOL}; do not stop at an installation status or ask the user to install through settings. This stable interface covers the full scientific catalog without loading every Tool into model context. Explicit user prohibitions always win: never restore settings or use raw code to bypass them. If credentials are missing, show the attached configuration form; never ask for secrets in chat. No reload is needed after dependency installation. Tool completion is not final scientific Acceptance.`,
  });
  const changed = () => server.sendToolListChanged();
  settings.listeners.add(changed);
  server.onclose = () => settings.listeners.delete(changed);
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
    { name: OPENER, title: "OpenQuantum 设置", description: "Open settings for OpenQuantum Skills, MCP connections and Tools.", inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }, icons: [{ src: ICON, mimeType: "image/svg+xml" }],
      _meta: { ui: { resourceUri: uiUri, visibility: ["app"] }, "openai/ui": { entrypoints: [{ type: "global" }] } } },
    { name: SETTINGS_TOOL, title: "OpenQuantum 能力设置", description: "Configure OpenQuantum capabilities from the settings UI. Never pass plaintext credentials in this tool.", inputSchema: schema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      _meta: { ui: { resourceUri: uiUri, visibility: ["app"] } } },
    { name: DISCOVER_TOOL, title: "选择 OpenQuantum Skill", description: "Find relevant quantum Skills by task, or inspect one Skill and its selected Tool/SDK preparation. Returns the selected scientific Tool's exact inputSchema and execution route. Read-only; no installation or service startup. Forbidden Skills are excluded from search.",
      inputSchema: { type: "object", properties: { query: { type: "string", maxLength: 240 }, ...preparationProperties }, additionalProperties: false },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
    { name: PREPARE_TOOL, title: "准备所需能力", description: "Prepare exactly one selected Skill's Tool or SDK for an actual task. Downloads and installs pinned dependencies only when missing; reuses existing environments. No scientific execution or policy changes. Missing credentials open the configuration form. After a failed/cancelled job, retry:true explicitly retries; inspect progress with find_openquantum_skills.",
      inputSchema: { type: "object", properties: { ...preparationProperties, retry: { type: "boolean", default: false } }, required: ["skillId"], additionalProperties: false },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: { ui: { resourceUri: uiUri, visibility: ["model", "app"] } } },
    executionTool,
    // User-added connections retain their explicit opt-in contracts. Bundled
    // scientific Tools are selected through discovery and the stable executor.
    ...(await settings.listTools()).filter(tool => !backend.providerFor(tool.name)),
  ] }));
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [{ uri: uiUri, name: "OpenQuantum Settings", mimeType: RESOURCE_MIME_TYPE }] }));
  server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
    // Cached entrypoints from older installations still resolve to this bundle.
    // Only the exact settings route family is an alias; never resolve file paths
    // or take a credential origin from the requested URI.
    if (!SETTINGS_UI_URI.test(params.uri) && params.uri !== LEGACY_UI_URI) throw new Error("Unknown resource");
    return { contents: [{ uri: params.uri, mimeType: RESOURCE_MIME_TYPE, text: html, _meta: {
      ui: { csp: { connectDomains: credentialWindow?.origin ? [credentialWindow.origin] : [], resourceDomains: [] }, prefersBorder: false },
      "openai/ui": { preferredDisplayMode: "fullscreen", availableDisplayModes: ["fullscreen"] },
    } }] };
  });
  server.setRequestHandler(CallToolRequestSchema, async ({ params }, { signal }) => {
    try {
      if (params.name === DISCOVER_TOOL || params.name === PREPARE_TOOL) {
        signal?.throwIfAborted();
        const plan = await (params.name === DISCOVER_TOOL ? discoverSkills(settings, params.arguments ?? {}) : prepareSkill(settings, params.arguments ?? {}, signal));
        const value = await describePreparation(settings, plan);
        return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value,
          ...(params.name === PREPARE_TOOL ? { _meta: { openquantumSettings: await settings.snapshot(), openquantumFocus: { skillId: value.skillId, serviceId: value.serviceId, fields: value.fields?.map(field => field.name) } } } : {}) };
      }
      if (params.name === EXECUTE_TOOL) return await executeTool(settings, params.arguments ?? {}, signal);
      if (params.name === OPENER || params.name === LEGACY_OPENER || params.name === SETTINGS_TOOL) {
        const value = await settingsRequest(context, params.name === SETTINGS_TOOL ? params.arguments : { action: "snapshot" });
        return { content: [], _meta: { openquantumSettings: value } };
      }
      if (!await settings.enabled(params.name)) throw new Error("Tool 未启用或不可用，请在 OpenQuantum 设置中检查");
      return backend.providerFor(params.name) ? await settings.callBuiltin(params.name, params.arguments ?? {}, signal) : await connections.call(params.name, params.arguments ?? {}, signal);
    } catch (error) { return { isError: true, content: [{ type: "text", text: error.message }] }; }
  });
  return server;
}
