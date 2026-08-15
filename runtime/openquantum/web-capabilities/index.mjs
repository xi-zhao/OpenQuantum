import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX_REQUEST_BYTES = 64 * 1024;
const LOOPBACK_HOST = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?$/i;
const SETTINGS_MODULE = "src/settings/server/project-settings.mjs";

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

export async function dispatchCapabilityCommand(projectRoot, command) {
  if (command === null || typeof command !== "object" || Array.isArray(command)) {
    throw new TypeError("设置请求必须是对象");
  }
  const settings = await settingsModule(projectRoot);
  switch (command.action) {
    case "snapshot":
      return settings.readProjectSettings(projectRoot);
    case "skill.update":
      return settings.updateSkillSettings(projectRoot, command);
    case "skill.create":
      return settings.createSkillSettings(projectRoot, command);
    case "skill.remove":
      return settings.removeSkillSettings(projectRoot, command);
    case "mcp.update":
      return settings.updateMcpSettings(projectRoot, command);
    case "mcp.create":
      return settings.createMcpSettings(projectRoot, command);
    case "mcp.remove":
      return settings.removeMcpSettings(projectRoot, command);
    default:
      throw new TypeError("未知设置命令");
  }
}

export async function assertMcpEnableAllowed(
  projectRoot,
  command,
  credentials,
  readSettings = dispatchCapabilityCommand,
) {
  if (command?.action !== "mcp.update" || command.enabled !== true) return;
  const snapshot = await readSettings(projectRoot, { action: "snapshot" });
  const server = snapshot.mcpServers.find(
    (candidate) => candidate.serverName === command.serverName,
  );
  if (!server) {
    throw new TypeError("MCP 服务已不存在，请刷新后重试");
  }
  if (server.setup?.status === "required") {
    throw new TypeError("此 MCP 的固定版本源码尚未就绪，不能启用");
  }
  const descriptions = await Promise.all(
    server.requiredCredentialRefs.map(async (ref) => [
      ref,
      await credentials.describe(ref),
    ]),
  );
  const missing = descriptions
    .filter(([, info]) => info?.configured !== true)
    .map(([ref]) => ref);
  if (missing.length > 0) {
    throw new TypeError(`请先配置必需凭据：${missing.join("、")}`);
  }
}

export function createCapabilitySettingsHandler({
  projectRoot = process.cwd(),
  dispatch = dispatchCapabilityCommand,
  validate = async () => undefined,
} = {}) {
  return async (request, response) => {
    const boundary = capabilityRequestBoundary(request);
    if (boundary !== null) {
      json(response, boundary.status, { error: boundary.error });
      return;
    }
    try {
      const command = await readJson(request);
      await validate(projectRoot, command);
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
  const handler = createCapabilitySettingsHandler({
    validate: (projectRoot, command) =>
      assertMcpEnableAllowed(projectRoot, command, ctx.credentials),
  });
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: "/openquantum/api/capabilities",
        handler,
      }),
    "openquantum: capability settings API",
  );
}
