import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { createMcpServer, OPENER, SETTINGS_TOOL } from "../runtime/chatgpt/server.mjs";

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

test("the only global entry opens the same settings document as plugin settings", async t => {
  const html = await fs.readFile(new URL("../runtime/chatgpt/ui/app.html", import.meta.url), "utf8");
  const client = await connect(t, html);
  const { tools } = await client.listTools();
  const global = tools.filter(tool => tool._meta?.["openai/ui"]?.entrypoints?.some(item => item.type === "global"));
  assert.equal(global.length, 1);
  const [entry] = global;
  assert.equal(entry.name, "open_openquantum_settings");
  assert.equal(entry.title, "OpenQuantum 设置");
  assert.deepEqual(entry.inputSchema, { type: "object", properties: {}, additionalProperties: false });
  assert.deepEqual(entry._meta.ui.visibility, ["app"]);
  assert.ok(entry._meta["openai/ui"].entrypoints.some(item => item.type === "settings"));
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
  for (const tab of ["skills", "connections", "tools", "credentials"]) assert.ok(resource.text.includes(`data-tab="${tab}"`));
});

test("loopback origin is bound to the document, CSP and resource identity across restarts", async t => {
  const html = await fs.readFile(new URL("../runtime/chatgpt/ui/app.html", import.meta.url), "utf8");
  const origins = ["http://127.0.0.1:12345", "http://127.0.0.1:12346"];
  const uris = [];
  for (const origin of origins) {
    const client = await connect(t, html, { origin });
    const [{ uri }] = (await client.listResources()).resources;
    uris.push(uri);
    const [resource] = (await client.readResource({ uri })).contents;
    assert.ok(resource.text.includes(`name="openquantum-credential-origin" content="${origin}"`));
    assert.deepEqual(resource._meta.ui.csp.connectDomains, [origin]);
  }
  assert.notEqual(...uris);
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
  await assert.rejects(current.readResource({ uri: "ui://openquantum/unknown.html" }), /Unknown resource/);
});
