import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import Ajv from "ajv";
import { credentialRef, externalToolName } from "./application.mjs";

const ajv = new Ajv({ strict: false, allErrors: true });
const MAX_BYTES = 2 * 1024 * 1024;
const toolName = /^[A-Za-z0-9_-]{1,64}$/;
export function connectionTools(tools) {
  if (!Array.isArray(tools) || tools.length > 128 || Buffer.byteLength(JSON.stringify(tools)) > MAX_BYTES) throw new Error("连接返回的工具清单超过限制");
  const seen = new Set();
  return tools.map(tool => {
    if (!toolName.test(tool.name) || seen.has(tool.name) || tool.inputSchema?.type !== "object") throw new Error("连接返回的 Tool 合同无效");
    seen.add(tool.name); ajv.compile(tool.inputSchema);
    return { name: tool.name, ...(tool.title ? { title: String(tool.title).slice(0,200) } : {}), description: String(tool.description || "").slice(0,6000), inputSchema: tool.inputSchema,
      ...(tool.outputSchema ? { outputSchema: tool.outputSchema } : {}),
      annotations: { readOnlyHint: tool.annotations?.readOnlyHint === true, destructiveHint: tool.annotations?.destructiveHint !== false,
        idempotentHint: tool.annotations?.idempotentHint === true, openWorldHint: tool.annotations?.openWorldHint !== false } };
  });
}
export class Connections {
  constructor({ settings, credentials }) { Object.assign(this, { settings, credentials }); this.clients = new Set(); this.active = 0; }
  async bounded(action) {
    if (this.active >= 2) throw new Error("已有两个 MCP 操作正在执行，请稍后重试");
    this.active++;
    try { return await action(); } finally { this.active--; }
  }
  async connect(connection) {
    const token = connection.authentication === "token" ? await this.credentials.resolve(credentialRef(connection.id)) : null;
    if (connection.authentication === "token" && !token) throw new Error("此连接尚未配置 Token");
    let transport;
    if (connection.transport === "http") {
      transport = new StreamableHTTPClientTransport(new URL(connection.url), { requestInit: { redirect: "error", ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) } });
    } else {
      const allowed = ["PATH", "HOME", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR"];
      const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
      if (token) env[connection.tokenEnv] = token;
      transport = new StdioClientTransport({ command: connection.command, args: connection.args, env, stderr: "pipe" });
      transport.stderr?.resume();
    }
    const client = new Client({ name: "openquantum-managed-connection", version: "1.0.0" });
    try { await client.connect(transport, { timeout: 15000 }); this.clients.add(client); return { client, token }; }
    catch { await transport.close(); throw new Error("MCP 连接失败，请检查地址、启动命令和认证"); }
  }
  async closeClient(client) { this.clients.delete(client); await client.close(); }
  async probe(id) { return this.bounded(() => this.probeConnection(id)); }
  async probeConnection(id) {
    const { config } = await this.settings.read();
    const connection = config.connections.find(value => value.id === id);
    if (!connection) throw new Error("连接不存在");
    const before = JSON.stringify({ ...connection, tools: [] });
    let client, token;
    try {
      ({ client, token } = await this.connect(connection));
      const result = await client.listTools({}, { timeout: 15000 });
      if (result.nextCursor) throw new Error("此连接需要分页工具目录，当前版本尚未支持");
      // A server must never copy its authentication value into persisted metadata.
      // Reject the response instead of altering JSON Schema strings.
      if (token && JSON.stringify(result).includes(JSON.stringify(token).slice(1, -1))) throw new Error("连接返回了无效的工具清单");
      const tools = connectionTools(result.tools);
      await this.settings.inventory(id, tools, before);
      this.settings.statuses.set(id, { state: "connected", message: `已发现 ${tools.length} 个 Tool；新发现的 Tool 默认关闭`, checkedAt: new Date().toISOString() });
    } catch (error) {
      this.settings.statuses.set(id, { state: "error", message: "连接测试失败，请检查地址、凭据和服务状态" });
      throw new Error(error.message.startsWith("此连接需要") ? error.message : "连接测试失败，请检查地址、凭据和服务状态");
    } finally { if (client) await this.closeClient(client); }
    return this.settings.snapshot();
  }
  async call(name, args, signal) { return this.bounded(() => this.callConnection(name, args, signal)); }
  async callConnection(name, args, signal) {
    const { config } = await this.settings.read();
    const connection = config.connections.find(value => value.enabled && value.tools.some(tool => tool.enabled && externalToolName(value.id, tool.name) === name));
    if (!connection) throw new Error("Tool 未启用");
    const tool = connection.tools.find(value => externalToolName(connection.id, value.name) === name);
    if (!ajv.compile(tool.inputSchema)(args)) throw new Error("Tool 参数不符合合同");
    const { client, token } = await this.connect(connection);
    try {
      signal?.throwIfAborted();
      // A setting may have changed while the connection was starting.
      const latest = (await this.settings.read()).config.connections.find(value => value.id === connection.id);
      if (latest?.instance !== connection.instance || !await this.settings.enabled(name)) throw new Error("Tool 已关闭或连接已替换");
      const result = await client.callTool({ name: tool.name, arguments: args }, undefined, { timeout: 180000, signal });
      let encoded = JSON.stringify(result);
      if (Buffer.byteLength(encoded) > MAX_BYTES) throw new Error("Tool 输出超过限制");
      if (token) encoded = encoded.replaceAll(JSON.stringify(token).slice(1,-1), "[redacted]");
      // Remote UI metadata cannot redirect the OpenQuantum settings surface.
      const { content, structuredContent, isError } = JSON.parse(encoded);
      return { content, ...(structuredContent ? { structuredContent } : {}), ...(isError ? { isError } : {}) };
    } catch { throw new Error("MCP Tool 执行失败、已取消或已停用；请检查连接状态"); }
    finally { await this.closeClient(client); }
  }
  async close() { await Promise.allSettled([...this.clients].map(client => this.closeClient(client))); }
}
