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
import { GitHubStar } from "../../src/settings/codex/github-star.mjs";

const directory = path.join(PROJECT_ROOT, "dist/chatgpt");
const backend = await createBackend();
const release = JSON.parse(await fs.readFile(path.join(directory, "release.json"), "utf8"));
const html = await fs.readFile(path.join(directory, "app.html"), "utf8");
const credentials = new Credentials();
const githubApp = JSON.parse(await fs.readFile(new URL("./github-app.json", import.meta.url), "utf8"));
const githubStar = new GitHubStar({ credentials, clientId: process.env.OPENQUANTUM_GITHUB_CLIENT_ID ?? githubApp.clientId });
const settings = new Settings({ backend, credentials, skillRoot: process.env.OPENQUANTUM_PLUGIN_ROOT ? path.join(process.env.OPENQUANTUM_PLUGIN_ROOT, "skills") : path.join(directory, "skills"),
  ...(process.env.OPENQUANTUM_PLUGIN_SETTINGS_HOME ? { directory: process.env.OPENQUANTUM_PLUGIN_SETTINGS_HOME } : {}) });
const connections = new Connections({ settings, credentials });
const credentialWindow = await createCredentialWindow({ settings, credentials });
const context = { backend, settings, connections, credentialWindow, githubStar, html, release };
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
const stop = () => closing ??= (async () => { githubStar.close(); backend.close(); await connections.close(); await close(); await credentialWindow.close(); })();
process.stdin.on("end", () => void stop());
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => void stop());
