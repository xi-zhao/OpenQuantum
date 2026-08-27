import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX_REQUEST_BYTES = 64 * 1024;
const LOOPBACK_HOST = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?$/i;
const SETTINGS_MODULE = "src/settings/server/project-settings.mjs";
const CHANNELS_MODULE = "src/channels/cc-connect.mjs";

export const name = "openquantum-web-capabilities";
export const inject = ["webServer", "credentials"];

function json(response, status, value) {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
  });
  response.end(body);
}

export function capabilityRequestBoundary(request) {
  if (request.method !== "POST") {
    return { status: 405, error: "Capability settings require POST" };
  }
  const mediaType = String(request.headers["content-type"] ?? "")
    .toLowerCase()
    .split(";", 1)[0]
    .trim();
  if (mediaType !== "application/json") {
    return { status: 415, error: "Capability settings require application/json" };
  }
  const host = request.headers.host;
  const originValue = request.headers.origin;
  const fetchSite = request.headers["sec-fetch-site"];
  if (
    typeof host !== "string" ||
    typeof originValue !== "string" ||
    (fetchSite !== undefined && fetchSite !== "same-origin")
  ) {
    return { status: 403, error: "Capability settings require a same-origin browser request" };
  }
  const trustedPublicHost = process.env.OPENQUANTUM_TRUSTED_HOST?.toLowerCase();
  if (!LOOPBACK_HOST.test(host) && host.toLowerCase() !== trustedPublicHost) {
    return { status: 403, error: "Capability settings host is not trusted" };
  }
  try {
    const origin = new URL(originValue);
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.host.toLowerCase() !== host.toLowerCase()
    ) {
      throw new Error("origin mismatch");
    }
  } catch {
    return { status: 403, error: "Capability settings origin is not trusted" };
  }
  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { status: 413, error: "Capability settings request is too large" };
  }
  return null;
}

async function readJson(request) {
  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += bytes.length;
    if (received > MAX_REQUEST_BYTES) {
      const error = new Error("Capability settings request is too large");
      error.code = "REQUEST_TOO_LARGE";
      throw error;
    }
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function settingsModule(projectRoot) {
  return import(
    pathToFileURL(path.join(projectRoot, SETTINGS_MODULE)).href
  );
}

async function channelsModule(projectRoot) {
  return import(
    pathToFileURL(path.join(projectRoot, CHANNELS_MODULE)).href
  );
}

export async function dispatchCapabilityCommand(
  projectRoot,
  command,
  { credentials } = {},
) {
  const settings = await settingsModule(projectRoot);
  return settings.executeProjectSettingsCommand(projectRoot, command, {
    credentials,
  });
}

export async function dispatchMessageChannelCommand(projectRoot, command) {
  const channels = await channelsModule(projectRoot);
  return channels.executeMessageChannelCommand(projectRoot, command);
}

export function createCapabilitySettingsHandler({
  projectRoot = process.cwd(),
  dispatch = dispatchCapabilityCommand,
} = {}) {
  return async (request, response) => {
    const boundary = capabilityRequestBoundary(request);
    if (boundary !== null) {
      json(response, boundary.status, { error: boundary.error });
      return;
    }
    try {
      const command = await readJson(request);
      json(response, 200, await dispatch(projectRoot, command));
    } catch (error) {
      if (error?.code === "REQUEST_TOO_LARGE") {
        json(response, 413, { error: error.message });
        return;
      }
      if (error?.name === "ProjectSettingsConflictError") {
        json(response, 409, { error: error.message });
        return;
      }
      if (error instanceof SyntaxError || error instanceof TypeError) {
        json(response, 400, { error: error.message });
        return;
      }
      console.error("OpenQuantum capability settings failed", error);
      json(response, 500, { error: "能力设置暂时不可用" });
    }
  };
}

export function apply(ctx) {
  const capabilityHandler = createCapabilitySettingsHandler({
    dispatch: (projectRoot, command) =>
      dispatchCapabilityCommand(projectRoot, command, {
        credentials: ctx.credentials,
      }),
  });
  const channelHandler = createCapabilitySettingsHandler({
    dispatch: dispatchMessageChannelCommand,
  });
  const routes = [
    ["/openquantum/api/capabilities", capabilityHandler, "openquantum: capability settings API"],
    ["/openquantum/api/channels", channelHandler, "openquantum: message channel settings API"],
  ];
  for (const [routePath, handler, label] of routes) {
    ctx.effect(() => ctx.webServer.register({
        kind: "exact",
        path: routePath,
        handler,
      }), label);
  }
}
