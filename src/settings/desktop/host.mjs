import fs from "node:fs/promises";
import path from "node:path";
import { Service } from "@deepseek-ai/cordis";
import { createDesktopApplication } from "./application.mjs";
import { createCapabilitySettingsHandler } from "../../../runtime/openquantum/web-capabilities/index.mjs";

export async function apply(ctx, { root, nodeExecutable, directory = path.join(process.env.DSH_HOME, ".openquantum/capabilities") }) {
  const application = await createDesktopApplication({ root, directory, nodeExecutable, credentials: ctx.credentials });
  class CapabilityInterface extends Service {
    constructor() { super(ctx, "openquantumCapabilities"); this.application = application; }
  }
  new CapabilityInterface();
  ctx.effect(() => () => application.close(), "openquantum: drain preparations and calls");
  ctx.on("credentials/reference-updated", () => application.settings.changed());
  const source = await fs.readFile(path.join(root, "dist/chatgpt/app.html"), "utf8");
  const html = source.replace("<head>", '<head><meta name="openquantum-host" content="Desktop">');
  ctx.effect(() => ctx.webServer.tapIndex(value => value.replace("</head>", '<meta name="openquantum-on-demand" content="true"></head>')));
  ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/openquantum/settings", handler(request, response) {
    if (request.method !== "GET") { response.writeHead(405); response.end(); return; }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "SAMEORIGIN" });
    response.end(html);
  } }));
  ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/openquantum/api/preparation", handler: createCapabilitySettingsHandler({
    projectRoot: root, surface: "OpenQuantum settings", dispatch: (_root, command) => application.request(command),
  }) }));
}
