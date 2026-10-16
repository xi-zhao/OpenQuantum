import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { credentialRef } from "./application.mjs";
import { withLock } from "./storage.mjs";
import { serviceSupported, serviceById, serviceValues, saveServiceValues, validateServiceValues } from "./service-catalog.mjs";
import { credentialHtml, credentialCss, credentialJs } from "./credential-ui.mjs";
import { createCredentialBridge } from "./credential-bridge.mjs";
import { createCredentialChannel } from "./credential-channel.mjs";

export async function createCredentialWindow({ settings, credentials }) {
  const sessions = new Map();
  let origin;
  const bridge = createCredentialBridge({ settings, credentials, sessions, getOrigin: () => origin });
  const channel = createCredentialChannel({ settings, credentials });
  const server = createServer(async (request, response) => {
    const reply = (status, value, type = "application/json", headers = {}) => {
      if (response.headersSent) return;
      response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", ...headers });
      response.end(type === "application/json" ? JSON.stringify(value) : value);
    };
    if (request.headers.host !== new URL(origin).host) return reply(403, { message: "无效请求" });
    if (request.url === "/credential-field") return bridge.handle(request, reply);
    if (request.method === "GET") {
      if (request.url === "/credentials") return reply(200, credentialHtml, "text/html; charset=utf-8");
      if (request.url === "/credential.js") return reply(200, credentialJs, "text/javascript; charset=utf-8");
      if (request.url === "/credential.css") return reply(200, credentialCss, "text/css; charset=utf-8");
      return reply(404, { message: "页面不存在" });
    }
    if (request.method !== "POST" || request.headers.origin !== origin || !request.headers["content-type"]?.startsWith("application/json") || !["/credential", "/credential-info"].includes(request.url)) return reply(403, { message: "无效请求" });
    try {
      let body = "";
      for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 16384) return reply(413, { message: "输入过大" }); }
      const input = JSON.parse(body);
      const session = sessions.get(input.nonce);
      if (!session || session.kind === "field" || session.expires < Date.now()) return reply(403, { message: "窗口已过期，请从 OpenQuantum 设置页重新打开" });
      await withLock(settings.file, async () => {
      if (sessions.get(input.nonce) !== session) return reply(403, { message: "窗口已过期，请重新打开" });
      const { config } = await settings.read();
      if (session.service) {
        const service = serviceById(session.id);
        if (!serviceSupported(service, settings.backend)) return reply(409, { message: "服务不可用，请刷新设置页" });
        const values = await serviceValues(credentials, service);
        if (request.url === "/credential-info") return reply(200, { service: true, connection: service.title + " · " + service.description, canRemove: true,
          fields: service.fields.map(field => ({ ...field, configured: Boolean(values[field.name]) })) });
        if (!["set", "remove"].includes(input.action)) return reply(400, { message: "无效操作" });
        if (input.action === "set") {
          validateServiceValues(service, input.values);
          if (input.remove !== undefined && (!Array.isArray(input.remove) || input.remove.some(name => !service.fields.some(field => field.name === name)))) return reply(400, { message: "移除字段无效" });
          Object.assign(values, input.values);
          for (const name of input.remove ?? []) delete values[name];
          validateServiceValues(service, values);
        }
        sessions.delete(input.nonce);
        await saveServiceValues(credentials, service, input.action === "remove" ? {} : values);
        return reply(200, { message: input.action === "set" ? "配置已保存，账户认证尚未验证。返回设置页可查看各字段状态。" : "凭据已移除，可以关闭此窗口。" });
      }
      const connection = config.connections.find(value => value.id === session.id);
      if (!connection || connection.instance !== session.instance || connection.authentication !== "token") return reply(409, { message: "连接配置已变化，请刷新设置页" });
      if (request.url === "/credential-info") return reply(200, { connection: `连接：${connection.id} · ${connection.transport === "http" ? connection.url : [connection.command, ...connection.args].join(" ")}`, canRemove: !connection.enabled, fields: [{ name: "token", title: "Token", secret: true, required: true, ...(await credentials.describe(credentialRef(connection.id))) }] });
      if (input.action === "remove" && connection.enabled) return reply(409, { message: "请先关闭连接再移除 Token" });
      if (!["set", "remove"].includes(input.action)) return reply(400, { message: "无效操作" });
      // Single-use capability; neither raw credentials nor exceptions cross MCP.
      sessions.delete(input.nonce);
      if (input.action === "set") await credentials.set(credentialRef(session.id), input.value);
      else await credentials.remove(credentialRef(session.id));
      settings.statuses.delete(session.id);
      reply(200, { message: input.action === "set" ? "已保存到系统凭据库，可以关闭此窗口并测试连接。" : "Token 已移除，可以关闭此窗口。" });
      });
      await settings.changed();
    } catch { reply(400, { message: "凭据操作失败，请检查输入或系统凭据库权限后重新打开窗口" }); }
  });
  server.requestTimeout = 15000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    issueField: input => bridge.issue(input),
    prepareField: input => channel.prepare(input),
    commitField: input => channel.commit(input),
    async openService(id) {
      const service = serviceById(id);
      if (!serviceSupported(service, settings.backend)) throw new Error("此服务尚未接入插件凭据配置，请查看认证说明");
      for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key);
      if (sessions.size >= 32) throw new Error("凭据窗口数量已达上限");
      const nonce = randomBytes(32).toString("hex");
      sessions.set(nonce, { id, service: true, expires: Date.now() + 10 * 60 * 1000 });
      return `${origin}/credentials#${nonce}`;
    },
    async open(id) {
      const { config } = await settings.read();
      const connection = config.connections.find(value => value.id === id && value.authentication === "token");
      if (!connection) throw new Error("连接不需要 Token 或不存在");
      for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key);
      if (sessions.size >= 32) throw new Error("凭据窗口数量已达上限");
      const nonce = randomBytes(32).toString("hex");
      sessions.set(nonce, { id, instance: connection.instance, expires: Date.now() + 10 * 60 * 1000 });
      return `${origin}/credentials#${nonce}`;
    },
    close() { sessions.clear(); channel.close(); server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); },
  };
}
