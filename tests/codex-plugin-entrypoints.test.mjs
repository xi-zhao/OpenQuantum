import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { createMcpServer, OPENER, SETTINGS_TOOL, settingsResourceUri, prepareSettingsDocument } from "../runtime/chatgpt/server.mjs";
import { fixture } from "./fixtures/codex-settings.mjs";
import { createCredentialWindow } from "../src/settings/codex/credential-window.mjs";
import { componentNavigation } from "../scripts/lib/component-directory.mjs";

async function connect(t, html, credentialWindow) {
  const snapshot = { skills: [], connections: [], tools: [], revision: "fixture" };
  const settings = { listeners: new Set(), snapshot: async () => snapshot, listTools: async () => [], enabled: async () => false };
  const server = createMcpServer({ settings, html, credentialWindow, release: { version: "0.7.5" } });
  const client = new Client({ name: "settings-entrypoint-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  t.after(async () => { await client.close(); await server.close(); });
  return client;
}

test("the only advertised entrypoint opens the existing settings document", async t => {
  const html = (await fs.readFile(new URL("../runtime/chatgpt/ui/app.html", import.meta.url), "utf8")).replace("<!-- COMPONENT_TABS -->", componentNavigation());
  const client = await connect(t, html);
  const { tools } = await client.listTools();
  const global = tools.filter(tool => tool._meta?.["openai/ui"]?.entrypoints?.some(item => item.type === "global"));
  assert.equal(global.length, 1);
  const [entry] = global;
  assert.equal(entry.name, "open_openquantum_settings");
  assert.equal(entry.title, "OpenQuantum 设置");
  assert.deepEqual(entry.inputSchema, { type: "object", properties: {}, additionalProperties: false });
  assert.deepEqual(entry._meta.ui.visibility, ["app"]);
  assert.deepEqual(tools.flatMap(tool => tool._meta?.["openai/ui"]?.entrypoints ?? []), [{ type: "global" }]);
  const uri = entry._meta.ui.resourceUri;
  assert.match(uri, /^ui:\/\/openquantum\/settings\/[a-f0-9]{64}\.html$/);
  assert.equal(tools.find(tool => tool.name === SETTINGS_TOOL)._meta.ui.resourceUri, uri);
  assert.deepEqual((await client.listResources()).resources.map(item => item.uri), [uri]);
  const opened = await client.callTool({ name: OPENER, arguments: {} });
  assert.deepEqual(opened.content, []);
  assert.deepEqual(opened._meta.openquantumSettings.skills, []);
  const [resource] = (await client.readResource({ uri })).contents;
  assert.equal(resource.text, html);
  assert.equal(resource.mimeType, RESOURCE_MIME_TYPE);
  assert.equal(resource._meta["openai/ui"].preferredDisplayMode, "fullscreen");
  for (const tab of ["runtime", "skills", "tools", "mcp", "credentials"]) assert.ok(resource.text.includes(`data-tab="${tab}"`));
  assert.equal((resource.text.match(/data-tab=/g) ?? []).length, 5);
});

test("discovery and app sessions share a bundle URI but bind resources to the reading session", async t => {
  const html = await fs.readFile(new URL("../runtime/chatgpt/ui/app.html", import.meta.url), "utf8");
  const origins = ["http://127.0.0.1:12345", "http://127.0.0.1:12346"];
  const discovery = await connect(t, html, { origin: origins[0] });
  const [{ uri }] = (await discovery.listResources()).resources;
  const app = await connect(t, html, { origin: origins[1] });
  assert.equal((await app.listResources()).resources[0].uri, uri);
  for (const [client, origin] of [[discovery, origins[0]], [app, origins[1]]]) {
    const [resource] = (await client.readResource({ uri })).contents;
    assert.ok(resource.text.includes(`name="openquantum-credential-origin" content="${origin}"`));
    assert.deepEqual(resource._meta.ui.csp.connectDomains, [origin]);
    assert.equal(settingsResourceUri(resource.text), uri);
  }
  assert.equal(uri, settingsResourceUri(html));
  assert.equal(settingsResourceUri(prepareSettingsDocument(html, origins[0])), settingsResourceUri(prepareSettingsDocument(html, origins[1])));
});

test("changed settings HTML gets a new resource identity and legacy requests return current settings", async t => {
  const old = await connect(t, "<html>settings v1</html>");
  const currentHtml = "<html>settings v2</html>";
  const current = await connect(t, currentHtml);
  const restarted = await connect(t, currentHtml);
  const uri = async client => (await client.listResources()).resources[0].uri;
  assert.notEqual(await uri(old), await uri(current));
  assert.equal(await uri(current), await uri(restarted));
  // The former workbench is no longer advertised in any menu.
  assert.ok(!(await current.listTools()).tools.some(tool => tool.name === "open_openquantum"));
  const legacy = await current.callTool({ name: "open_openquantum", arguments: {} });
  assert.deepEqual(legacy, await current.callTool({ name: OPENER, arguments: {} }));
  const legacyResource = await current.readResource({ uri: "ui://openquantum/workbench.html" });
  assert.equal(legacyResource.contents[0].text, currentHtml);
  const previousUri = await uri(old);
  const cached = (await current.readResource({ uri: previousUri })).contents[0];
  assert.equal(cached.uri, previousUri);
  assert.equal(cached.text, currentHtml);
  // Include the exact URI reported by the installed host before this fix.
  const brokenUri = "ui://openquantum/settings/e115081103faee51de9881ff92b97ccc1ba8ae34b0010031450e88b25e64905f.html";
  assert.equal((await current.readResource({ uri: brokenUri })).contents[0].text, currentHtml);
  for (const unknown of ["ui://openquantum/unknown.html", "ui://foreign/settings/" + "a".repeat(64) + ".html",
    "ui://openquantum/settings/../credentials", "ui://openquantum/settings/short.html", previousUri + "?other=1", previousUri + "/extra"]) {
    await assert.rejects(current.readResource({ uri: unknown }), /Unknown resource/);
  }
});

test("a cached process-bound URI gets the current app's CSP and credential capability", async t => {
  const html = "<html><!-- CREDENTIAL_ORIGIN -->settings</html>";
  const sessions = [];
  for (let i = 0; i < 2; i++) {
    const f = await fixture(t);
    f.backend.providers = [{ key: "fieldqkit", defaultEnabled: false }];
    const window = await createCredentialWindow(f);
    t.after(() => window.close());
    sessions.push({ ...f, window, client: await connect(t, html, window) });
  }
  const [discovery, app] = sessions;
  const oldHtml = prepareSettingsDocument(html, discovery.window.origin);
  const cachedUri = `ui://openquantum/settings/${createHash("sha256").update(oldHtml).digest("hex")}.html`;
  const [resource] = (await app.client.readResource({ uri: cachedUri })).contents;
  assert.equal(resource.text, prepareSettingsDocument(html, app.window.origin));
  assert.deepEqual(resource._meta.ui.csp.connectDomains, [app.window.origin]);
  const result = await app.client.callTool({ name: SETTINGS_TOOL, arguments: {
    action: "credential.field.issue", id: "fieldqkit", field: "QUAFU_API_TOKEN", operation: "set", origin: "null",
  } });
  const permission = result._meta.openquantumSettings;
  assert.equal(new URL(permission.url).origin, app.window.origin);
  const response = await fetch(permission.url, { method: "POST", headers: {
    "content-type": "application/json", origin: "null", "x-openquantum-capability": permission.nonce,
  }, body: JSON.stringify({ value: "synthetic-cross-process-only" }) });
  assert.equal(response.status, 200);
  assert.equal(app.secrets.size, 1);
  assert.equal(discovery.secrets.size, 0);
});
