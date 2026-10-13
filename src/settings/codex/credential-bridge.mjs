import { randomBytes } from "node:crypto";
import { withLock } from "./storage.mjs";
import { serviceById, serviceCredentialRef, serviceValues, validateServiceValues } from "./service-catalog.mjs";

function allowedOrigin(value) {
  // A sandboxed MCP App may have an opaque origin. "null" is not an identity:
  // the unguessable, one-use capability remains the authorization boundary.
  if (value === "null") return true;
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.origin === value && (url.protocol === "https:" ||
      (url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)));
  } catch { return false; }
}

export function createCredentialBridge({ settings, credentials, sessions, getOrigin }) {
  return {
    issue({ id, field, operation, origin }) {
      const service = serviceById(id);
      if (!service?.supported || !settings.backend.providers.some(provider => provider.key === id) ||
          !service.fields.some(item => item.name === field) || !["set", "remove"].includes(operation) || !allowedOrigin(origin)) {
        throw new Error("凭据配置请求无效");
      }
      for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key);
      if (sessions.size >= 32) throw new Error("凭据请求过多，请稍后重试");
      const nonce = randomBytes(32).toString("hex");
      sessions.set(nonce, { kind: "field", id, field, operation, origin, expires: Date.now() + 10 * 60 * 1000 });
      return { url: `${getOrigin()}/credential-field`, nonce };
    },
    async handle(request, reply) {
      const origin = request.headers.origin;
      const cors = { "Access-Control-Allow-Origin": origin, "Vary": "Origin" };
      if (!allowedOrigin(origin)) return reply(403, { message: "无效来源" });
      if (request.method === "OPTIONS") {
        const headers = (request.headers["access-control-request-headers"] ?? "").split(",").map(value => value.trim().toLowerCase());
        if (![...sessions.values()].some(session => session.kind === "field" && session.origin === origin && session.expires >= Date.now()) ||
            request.headers["access-control-request-method"] !== "POST" || !headers.includes("x-openquantum-capability") ||
            headers.some(value => !["content-type", "x-openquantum-capability"].includes(value))) return reply(403, { message: "无效请求" });
        return reply(204, "", "text/plain", { ...cors, "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, X-OpenQuantum-Capability", "Access-Control-Max-Age": "0",
          ...(request.headers["access-control-request-private-network"] === "true" ? { "Access-Control-Allow-Private-Network": "true" } : {}) });
      }
      const nonce = request.headers["x-openquantum-capability"];
      const session = sessions.get(nonce);
      if (request.method !== "POST" || !request.headers["content-type"]?.startsWith("application/json") ||
          !session || session.kind !== "field" || session.expires < Date.now() || session.origin !== origin) {
        return reply(403, { message: "保存请求已失效，请重试" });
      }
      // Consume before any await, including body streaming. Parallel replay and
      // failed writes cannot reuse this permission. No cookies or secret in URLs.
      sessions.delete(nonce);
      const respond = (status, data) => reply(status, data, "application/json", cors);
      try {
        let body = "";
        for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 16384) return respond(413, { message: "输入过大" }); }
        const input = JSON.parse(body);
        if (!input || typeof input !== "object" || Array.isArray(input) ||
            Object.keys(input).some(key => key !== "value") || (session.operation === "remove" && Object.keys(input).length)) {
          return respond(400, { message: "凭据字段无效" });
        }
        const result = await withLock(settings.file, async () => {
          if (session.expires < Date.now()) return { status: 403, message: "保存请求已过期，请重试" };
          const { config } = await settings.read();
          if (session.operation === "remove" && settings.providerEnabled(config, session.id)) return { status: 409, message: "请先关闭对应服务，再移除凭据" };
          const service = serviceById(session.id);
          if (!settings.backend.providers.some(provider => provider.key === service.id)) return { status: 409, message: "服务已变化，请刷新设置页" };
          if (session.operation === "set") {
            try { validateServiceValues(service, { [session.field]: input.value }); }
            catch {
              const address = ["QCPORTAL_ADDRESS", "OQC_API_ENDPOINT"].includes(session.field);
              return { status: 400, message: address
                ? session.field === "OQC_API_ENDPOINT" ? "请填写 oqc.app 官方 HTTPS 地址，不能包含账号、查询参数或自定义端口。"
                  : "请填写 HTTPS 服务器地址，不能包含账号、查询参数或片段。"
                : "请输入有效的新值，不能留空、换行或超过 4096 个字符。" };
            }
          }
          const values = await serviceValues(credentials, service);
          if (session.operation === "set") values[session.field] = input.value;
          else delete values[session.field];
          validateServiceValues(service, values);
          const ref = serviceCredentialRef(service.id);
          if (Object.keys(values).length) await credentials.set(ref, JSON.stringify(values));
          else await credentials.remove(ref);
          return { status: 200, configured: session.operation === "set", message: session.operation === "set" ? "已保存到本机凭据库，账户认证尚未验证。" : "此项凭据已移除。" };
        });
        const { status, ...data } = result;
        respond(status, data);
        if (status === 200) await settings.changed();
      } catch { respond(400, { message: "保存结果尚未确认，请刷新状态，并检查输入格式或系统凭据库权限。" }); }
    },
  };
}
