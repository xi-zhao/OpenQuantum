import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const name = "openquantum-web-updates";
export const inject = ["webServer"];
export const UPDATE_PATH = "/openquantum/api/updates";
// Public HTTP compatibility contract of pinned Desktop 2.0.7. No native-runtime access.
export const DESKTOP_CHECK_PATH = "/api/desktop/updates/check";
const MAX_COMMAND_BYTES = 1024;

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

export function createUpdateHandler(service, { desktop = false, trustedHost } = {}) {
  return async (request, response) => {
    if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" });
    const { host, origin, "sec-fetch-site": site } = request.headers;
    try {
      if (typeof host !== "string" || typeof origin !== "string" || site && site !== "same-origin") throw new Error();
      const parsed = new URL(origin);
      const loopback = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?$/i.test(host);
      if ((!loopback && (desktop || host.toLowerCase() !== trustedHost?.toLowerCase()))
        || !["http:", "https:"].includes(parsed.protocol) || parsed.host.toLowerCase() !== host.toLowerCase()) throw new Error();
    } catch { return json(response, 403, { error: "forbidden" }); }
    if (request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return json(response, 415, { error: "json_required" });
    if (Number(request.headers["content-length"]) > MAX_COMMAND_BYTES) return json(response, 413, { error: "request_too_large" });
    const chunks = [];
    let size = 0;
    try {
      for await (const chunk of request) {
        size += Buffer.byteLength(chunk);
        if (size > MAX_COMMAND_BYTES) return json(response, 413, { error: "request_too_large" });
        chunks.push(Buffer.from(chunk));
      }
      const command = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (desktop) {
        if (!command || Array.isArray(command) || typeof command !== "object" || Object.keys(command).length) throw new TypeError();
        await service.checkFromDesktop();
        return json(response, 200, { accepted: true });
      }
      return json(response, 200, await service.dispatch(command));
    } catch (error) {
      return json(response, error instanceof TypeError || error instanceof SyntaxError ? 400 : 503, { error: "update_request_failed" });
    }
  };
}

export function apply(ctx) {
  ctx.effect(async () => {
    const root = process.cwd();
    const { version } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    const { createUpdateService } = await import(pathToFileURL(path.join(root, "src/updates/service.mjs")));
    const service = await createUpdateService({
      currentVersion: version,
      statePath: path.join(process.env.DSH_HOME || path.join(root, ".openquantum/dsh"), "updates/openquantum.json"),
      ...(process.env.OPENQUANTUM_UPDATE_FEED_URL ? { feedUrl: process.env.OPENQUANTUM_UPDATE_FEED_URL } : {}),
      automatic: process.env.OPENQUANTUM_UPDATE_CHECK !== "0",
    });
    const unregister = [
      ctx.webServer.register({ kind: "exact", path: UPDATE_PATH, handler: createUpdateHandler(service, { trustedHost: process.env.OPENQUANTUM_TRUSTED_HOST }) }),
      ctx.webServer.register({ kind: "exact", path: DESKTOP_CHECK_PATH, handler: createUpdateHandler(service, { desktop: true }) }),
    ];
    service.start();
    return async () => { for (const dispose of unregister) dispose(); await service.dispose(); };
  }, "openquantum: release discovery and reminder lifecycle");
}
