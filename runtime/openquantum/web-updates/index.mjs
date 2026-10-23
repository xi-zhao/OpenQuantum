import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { capabilityRequestBoundary } = await import(pathToFileURL(path.join(process.cwd(), "runtime/openquantum/web-capabilities/index.mjs")).href);

export const name = "openquantum-web-updates";
export const inject = ["webServer", "connection"];
export const UPDATE_PATH = "/openquantum/api/updates";
// Public HTTP compatibility contract of pinned Desktop 2.0.7. No native-runtime access.
export const DESKTOP_CHECK_PATH = "/api/desktop/updates/check";
const MAX_COMMAND_BYTES = 1024;

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

export function createUpdateHandler(service, { desktop = false, trustedHost, requestRejection } = {}) {
  return async (request, response) => {
    const rejected = capabilityRequestBoundary(request, {
      surface: "Release updates", maxBytes: MAX_COMMAND_BYTES,
      requestRejection, trustedHost: desktop ? null : trustedHost,
    });
    if (rejected) return json(response, rejected.status, { error: rejected.error });
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
  const requestRejection = (request) => ctx.connection.requestRejection(request);
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
      ctx.webServer.register({ kind: "exact", path: UPDATE_PATH, handler: createUpdateHandler(service, { trustedHost: process.env.OPENQUANTUM_TRUSTED_HOST, requestRejection }) }),
      ctx.webServer.register({ kind: "exact", path: DESKTOP_CHECK_PATH, handler: createUpdateHandler(service, { desktop: true, requestRejection }) }),
    ];
    service.start();
    return async () => { for (const dispose of unregister) dispose(); await service.dispose(); };
  }, "openquantum: release discovery and reminder lifecycle");
}
