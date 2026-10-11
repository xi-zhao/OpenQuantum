import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { createHash } from "node:crypto";

const LEGACY_UI_URI = "ui://openquantum/workbench.html";
const LEGACY_OPENER = "open_openquantum";
export const OPENER = "open_openquantum_settings";
export const SETTINGS_TOOL = "openquantum_settings";
// Global apps retain their own page instances. Give settings a separate route,
// and change the resource identity whenever the bundled document changes.
export function settingsResourceUri(html) {
  return `ui://openquantum/settings/${createHash("sha256").update(html).digest("hex")}.html`;
}
export const ICON = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="24" cy="24" rx="21" ry="8" transform="rotate(45 24 24)"/><ellipse cx="24" cy="24" rx="21" ry="8" transform="rotate(-45 24 24)"/><circle cx="24" cy="24" r="3" fill="currentColor"/></svg>').toString("base64")}`;
const schema = { type: "object", properties: { action: { type: "string", enum: ["snapshot", "skill.set", "tool.set", "provider.set", "connection.add", "connection.set", "connection.tool.set", "connection.remove", "connection.test", "credentials.open", "github.status", "github.start", "github.poll", "github.cancel", "github.star", "github.disconnect"] },
  flowId: { type: "string", maxLength: 36 },
  revision: { type: "string", maxLength: 64 }, id: { type: "string", maxLength: 128 }, enabled: { type: "boolean" }, tool: { type: "string", maxLength: 128 },
  connection: { type: "object", additionalProperties: false, properties: { id: { type: "string", maxLength: 32 }, transport: { enum: ["stdio", "http"] }, url: { type: "string", maxLength: 2048 }, command: { type: "string", maxLength: 1024 }, args: { type: "array", maxItems: 32, items: { type: "string", maxLength: 2048 } }, tokenEnv: { type: "string", maxLength: 64 }, authentication: { enum: ["none", "token"] } }, required: ["id", "transport", "authentication"] },
}, required: ["action"], additionalProperties: false };

export async function settingsRequest({ settings, connections, credentialWindow, githubStar }, input, signal) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !Object.hasOwn(schema.properties, key))) throw new Error("设置字段无效");
  if (input.action?.startsWith("github.")) {
    if (!githubStar) throw new Error("当前插件未提供 GitHub 授权，请检查插件版本");
    return githubStar.command(input, signal);
  }
  if (input.action === "credentials.open") return { url: await credentialWindow.open(input.id) };
  if (input.action === "snapshot") return settings.snapshot();
  if (input.action === "connection.test") return connections.probe(input.id);
  return settings.command(input);
}

export function createMcpServer({ backend, settings, connections, credentialWindow, githubStar, html, release }) {
  const context = { settings, connections, credentialWindow, githubStar };
  const uiUri = settingsResourceUri(html);
  const server = new Server({ name: "openquantum", version: release.version, icons: [{ src: ICON, mimeType: "image/svg+xml" }] }, {
    capabilities: { tools: { listChanged: true }, resources: {} },
    instructions: "OpenQuantum provides quantum Skills and scientific Tools to the current host conversation. OpenQuantum settings configure only this plugin. No separate agent runtime or classroom is started. Tool completion and Validator observations are not final scientific Acceptance.",
  });
  const changed = () => server.sendToolListChanged();
  settings.listeners.add(changed);
  server.onclose = () => { settings.listeners.delete(changed); githubStar?.close(); };
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
    { name: OPENER, title: "OpenQuantum 设置", description: "Open settings for OpenQuantum Skills, MCP connections and Tools.", inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }, icons: [{ src: ICON, mimeType: "image/svg+xml" }],
      _meta: { ui: { resourceUri: uiUri, visibility: ["app"] }, "openai/ui": { entrypoints: [{ type: "global" }, { type: "settings", searchTerms: ["quantum", "skills", "mcp"] }] } } },
    { name: SETTINGS_TOOL, title: "OpenQuantum 能力设置", description: "Configure OpenQuantum capabilities and optionally authorize GitHub to star xi-zhao/OpenQuantum from this UI. Never pass credentials in this tool.", inputSchema: schema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      _meta: { ui: { resourceUri: uiUri, visibility: ["app"] } } },
    ...await settings.listTools(),
  ] }));
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [{ uri: uiUri, name: "OpenQuantum Settings", mimeType: RESOURCE_MIME_TYPE }] }));
  server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
    // Serve the current document if an older client forwards a legacy read.
    // Advertise only the new entry so the global menu has one OpenQuantum item.
    if (params.uri !== uiUri && params.uri !== LEGACY_UI_URI) throw new Error("Unknown resource");
    return { contents: [{ uri: params.uri, mimeType: RESOURCE_MIME_TYPE, text: html, _meta: {
      ui: { csp: { connectDomains: [], resourceDomains: [] }, prefersBorder: false },
      "openai/ui": { preferredDisplayMode: "fullscreen", availableDisplayModes: ["fullscreen"] },
    } }] };
  });
  server.setRequestHandler(CallToolRequestSchema, async ({ params }, { signal }) => {
    try {
      if (params.name === OPENER || params.name === LEGACY_OPENER || params.name === SETTINGS_TOOL) {
        const value = await settingsRequest(context, params.name === SETTINGS_TOOL ? params.arguments : { action: "snapshot" }, signal);
        return { content: [], _meta: { openquantumSettings: value } };
      }
      if (!await settings.enabled(params.name)) throw new Error("Tool 未启用或不可用，请在 OpenQuantum 设置中检查");
      return backend.providerFor(params.name) ? await backend.call(params.name, params.arguments ?? {}, signal, () => settings.enabled(params.name)) : await connections.call(params.name, params.arguments ?? {}, signal);
    } catch (error) { return { isError: true, content: [{ type: "text", text: error.message }] }; }
  });
  return server;
}
