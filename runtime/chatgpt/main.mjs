import fs from "node:fs/promises";
import path from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PROJECT_ROOT } from "./catalog.mjs";
import { createBackend } from "./backend.mjs";
import { createMcpServer } from "./server.mjs";
import { Settings } from "../../src/settings/codex/application.mjs";
import { Credentials } from "../../src/settings/codex/credentials.mjs";
import { Connections } from "../../src/settings/codex/connections.mjs";
import { createCredentialWindow } from "../../src/settings/codex/credential-window.mjs";
import { startPreview } from "./preview.mjs";

const directory = path.join(PROJECT_ROOT, "dist/chatgpt");
const backend = await createBackend();
const release = JSON.parse(await fs.readFile(path.join(directory, "release.json"), "utf8"));
const html = await fs.readFile(path.join(directory, "app.html"), "utf8");
const componentDirectory = JSON.parse(await fs.readFile(path.join(directory, "components.json"), "utf8"));
const credentials = new Credentials(process.env.OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE
  ? { service: process.env.OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE } : {});
const settings = new Settings({ backend, credentials, componentDirectory, skillRoot: process.env.OPENQUANTUM_PLUGIN_ROOT ? path.join(process.env.OPENQUANTUM_PLUGIN_ROOT, "skills") : path.join(directory, "skills"),
  ...(process.env.OPENQUANTUM_PLUGIN_SETTINGS_HOME ? { directory: process.env.OPENQUANTUM_PLUGIN_SETTINGS_HOME } : {}) });
const connections = new Connections({ settings, credentials });
const credentialWindow = await createCredentialWindow({ settings, credentials });
const context = { backend, settings, connections, credentialWindow, html, release };
let close;
if (process.argv.includes("--stdio")) {
  const server = createMcpServer(context);
  await server.connect(new StdioServerTransport());
  close = () => server.close();
} else if (process.argv.includes("--preview")) {
  const preview = await startPreview(context);
  close = () => preview.close();
  console.error(`OpenQuantum settings preview: ${preview.url}`);
} else throw new Error("Use --stdio or --preview");
let closing;
const stop = () => closing ??= (async () => { await backend.close(); await connections.close(); await close(); await credentialWindow.close(); })();
process.stdin.on("end", () => void stop());
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => void stop());
