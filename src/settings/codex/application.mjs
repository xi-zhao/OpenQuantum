import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { parse, stringify } from "smol-toml";
import { atomicWrite, digest, readOptional, withLock } from "./storage.mjs";
import { CAPABILITY_CATEGORIES, capabilityCategory, providerCategory } from "../capability-categories.mjs";
import { SERVICES, SERVICE_TOOL_TITLES, serviceById, serviceValues, missingFields } from "./service-catalog.mjs";

const NAME = /^[a-z][a-z0-9_-]{0,31}$/;
const ENV = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const fresh = () => ({ schemaVersion: 1, disabledTools: [], disabledProviders: [], connections: [] });
export const credentialRef = id => `mcp-${id}`;
export const externalToolName = (id, tool) => `oqext_${id.slice(0, 16)}_${tool.slice(0, 16)}_${digest(JSON.stringify([id, tool])).slice(0, 20)}`;
function record(value) { return value && typeof value === "object" && !Array.isArray(value); }
function requireKeys(input, keys) {
  if (!record(input) || Object.keys(input).some(key => !keys.includes(key))) throw new Error("设置字段无效");
}
function bool(value) { if (typeof value !== "boolean") throw new Error("启用状态必须是布尔值"); return value; }
function toggle(list, name, enabled) { return enabled ? list.filter(value => value !== name) : [...new Set([...list, name])]; }
function skillSelector(entry, id, skillRoot) {
  return entry.name === `openquantum:${id}` || (typeof entry.path === "string" && path.resolve(entry.path) === path.join(skillRoot, id, "SKILL.md"));
}

export function validateConnection(input) {
  requireKeys(input, ["id", "transport", "url", "command", "args", "tokenEnv", "authentication"]);
  if (typeof input.id !== "string" || !NAME.test(input.id) || !["none", "token"].includes(input.authentication)) throw new Error("连接名称或认证方式无效");
  if (input.transport === "http") {
    if (typeof input.url !== "string" || input.url.length > 2048) throw new Error("MCP 地址无效");
    const url = new URL(input.url);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname)))) throw new Error("请使用不含凭据的 HTTPS MCP 地址（本机测试允许 HTTP）");
    return { id: input.id, transport: "http", url: url.href, authentication: input.authentication, enabled: false, tools: [] };
  }
  if (input.transport !== "stdio" || typeof input.command !== "string" || !input.command.trim() || input.command.length > 1024 || /[\r\n\0]/.test(input.command)) throw new Error("stdio 命令无效");
  if (!Array.isArray(input.args) || input.args.length > 32 || input.args.some(arg => typeof arg !== "string" || arg.length > 2048 || /[\r\n\0]/.test(arg))) throw new Error("启动参数无效");
  if (input.authentication === "token" && (typeof input.tokenEnv !== "string" || !ENV.test(input.tokenEnv))) throw new Error("请填写接收 Token 的环境变量名");
  return { id: input.id, transport: "stdio", command: input.command, args: input.args, authentication: input.authentication,
    ...(input.authentication === "token" ? { tokenEnv: input.tokenEnv } : {}), enabled: false, tools: [] };
}

export class Settings {
  constructor({ backend, credentials, skillRoot, componentDirectory, directory = path.join(os.homedir(), ".openquantum/plugins/codex"), codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex") }) {
    if (componentDirectory && (componentDirectory.schemaVersion !== 1 || !Array.isArray(componentDirectory.skills) || !Array.isArray(componentDirectory.mcpServers))) throw new Error("量子组件目录版本不受支持");
    Object.assign(this, { backend, credentials, skillRoot, componentDirectory });
    this.file = path.join(directory, "settings.json");
    this.codexFile = path.join(codexHome, "config.toml");
    this.listeners = new Set();
    this.statuses = new Map();
  }
  async read() {
    const [raw, codexRaw] = await Promise.all([readOptional(this.file), readOptional(this.codexFile)]);
    let config;
    try { config = raw ? JSON.parse(raw) : fresh(); }
    catch { throw new Error("OpenQuantum 配置无法解析，请保留文件并检查升级说明"); }
    if (config.schemaVersion !== 1 || !Array.isArray(config.disabledTools) || !Array.isArray(config.disabledProviders) || !Array.isArray(config.connections)) throw new Error("设置版本不受支持，请保留文件并检查升级说明");
    for (const key of ["enabledProviders", "enabledTools"]) {
      if (config[key] !== undefined && (!Array.isArray(config[key]) || config[key].some(id => typeof id !== "string"))) throw new Error("设置启用清单无效");
    }
    let codex;
    try { codex = codexRaw ? parse(codexRaw) : {}; }
    catch { throw new Error("Codex 配置无法解析，请修复用户配置后重试"); }
    return { config, codex, raw, codexRaw, revision: digest(`${raw}\0${codexRaw}`) };
  }
  skills(codex) {
    return this.backend.sourceCapabilities.filter(item => item.status === "available" && item.skill).map(item => {
      const override = codex.skills?.config?.findLast(value => skillSelector(value, item.id, this.skillRoot));
      return { id: item.id, title: item.title, description: item.summary ?? item.description, category: capabilityCategory(item.id), tools: item.tools, enabled: override?.enabled !== false };
    });
  }
  async snapshot() {
    const { config, codex, revision } = await this.read();
    const capabilities = this.backend.sourceCapabilities;
    const providers = this.backend.providers.map(provider => {
      const members = capabilities.filter(item => item.tools.some(name => this.backend.providerFor(name) === provider.key));
      return { id: provider.key, title: provider.title || (members.length === 1 ? members[0].title : provider.kind === "native" ? "通用量子计算工具" : provider.key), category: providerCategory(members), enabled: this.providerEnabled(config, provider.key), bundled: true, service: serviceById(provider.key)?.id };
    });
    const tools = this.backend.tools.map(tool => ({ id: tool.name, title: SERVICE_TOOL_TITLES[tool.name] || tool.title || tool.name, description: tool.description,
      category: capabilityCategory(capabilities.find(item => item.tools.includes(tool.name))?.id),
      provider: this.backend.providerFor(tool.name), enabled: this.toolEnabled(config, tool.name), readOnly: tool.annotations?.readOnlyHint === true }));
    const connections = await Promise.all(config.connections.map(async connection => ({ ...connection,
      credential: connection.authentication === "token" ? await this.credentials.describe(credentialRef(connection.id)).catch(() => ({ configured: false, unavailable: true })) : { configured: false },
      status: this.statuses.get(connection.id) ?? { state: "not_checked", message: "尚未测试连接" },
    })));
    const services = await Promise.all(SERVICES.map(async service => {
      const supported = service.supported === true && providers.some(provider => provider.id === service.id);
      let values = {}, unavailable = false;
      if (supported) try { values = await serviceValues(this.credentials, service); } catch { unavailable = true; }
      const missing = missingFields(service, values);
      return { ...service, supported, enabled: supported && this.providerEnabled(config, service.id),
        fields: service.fields.map(field => ({ ...field, configured: Boolean(values[field.name]) })),
        configuration: !supported ? "unsupported" : unavailable ? "unavailable" : missing.length ? "incomplete" : Object.keys(values).length ? "configured" : "optional",
        missing, checked: false, tools: tools.filter(tool => tool.provider === service.id) };
    }));
    const skills = this.skills(codex);
    const components = this.componentDirectory ? {
      copy: this.componentDirectory.copy,
      skills: this.componentDirectory.skills.map(item => {
        const available = skills.find(skill => skill.id === item.name);
        const capability = capabilities.find(capability => capability.id === item.name);
        return { ...item, id: item.name, title: item.displayName, supported: Boolean(available), enabled: available?.enabled ?? false,
          tools: available?.tools ?? [], availabilityNote: available ? null : capability?.reason ?? "此 Skill 使用 Desktop 工作流，当前 Codex 插件未提供。" };
      }),
      mcpServers: this.componentDirectory.mcpServers.map(item => {
        const provider = providers.find(provider => provider.id === item.serverName);
        const capability = capabilities.find(capability => capability.mcp?.some(server => server.name === item.serverName));
        const service = services.find(service => service.id === item.serverName);
        return { ...item, id: item.serverName, title: item.displayName, supported: Boolean(provider), enabled: provider?.enabled ?? false,
          toolCallTimeoutMs: 180000, service: service?.id, configuration: service?.configuration,
          requiredCredentialsMissing: service?.configuration === "incomplete",
          tools: tools.filter(tool => tool.provider === item.serverName),
          availabilityNote: provider ? null : capability?.reason ?? "此连接使用 Desktop 工作流，当前 Codex 插件未提供。" };
      }),
    } : undefined;
    return { revision, categories: CAPABILITY_CATEGORIES, skills, providers, tools, connections, services, components,
      observedAt: new Date().toISOString(),
      notice: "Skill 开关保存在 Codex 用户配置；已有聊天可能需要重载。Tool 禁用立即阻止新的调用。", scope: "当前用户的 OpenQuantum 插件" };
  }
  providerEnabled(config, id) {
    const provider = this.backend.providers.find(provider => provider.key === id);
    return Boolean(provider) && !config.disabledProviders.includes(id) && (provider.defaultEnabled !== false || config.enabledProviders?.includes(id) === true);
  }
  toolEnabled(config, id) {
    const provider = this.backend.providers.find(provider => provider.key === this.backend.providerFor(id));
    return !config.disabledTools.includes(id) && (provider?.defaultEnabled !== false || config.enabledTools?.includes(id) === true);
  }
  async providerEnvironment(name, args = {}) {
    const service = serviceById(this.backend.providerFor(name));
    if (service?.credentialFreeTools?.includes(name) || (name === "discover_fieldqkit_backends" && args.provider === "simulator")) return {};
    return service?.supported ? serviceValues(this.credentials, service) : {};
  }
  async enabled(name) {
    const { config } = await this.read();
    const provider = this.backend.providerFor(name);
    if (provider) return this.providerEnabled(config, provider) && this.toolEnabled(config, name);
    return config.connections.some(connection => connection.enabled && connection.tools.some(tool => externalToolName(connection.id, tool.name) === name && tool.enabled));
  }
  async listTools() {
    const { config } = await this.read();
    return [
      ...this.backend.tools.filter(tool => this.toolEnabled(config, tool.name) && this.providerEnabled(config, this.backend.providerFor(tool.name))),
      ...config.connections.filter(connection => connection.enabled).flatMap(connection => connection.tools.filter(tool => tool.enabled).map(({ enabled: _enabled, ...tool }) => ({ ...tool, name: externalToolName(connection.id, tool.name) }))),
    ];
  }
  async command(input) {
    requireKeys(input, ["action", "revision", "id", "enabled", "connection", "tool"]);
    if (typeof input.revision !== "string") throw new Error("缺少设置版本，请刷新页面");
    await withLock(this.file, () => withLock(this.codexFile, async () => {
      const current = await this.read();
      if (input.revision !== current.revision) throw new Error("配置已被其他操作更新，请刷新后重试");
      const { config, codex } = current;
      switch (input.action) {
        case "skill.set": {
          if (!this.skills(codex).some(skill => skill.id === input.id)) throw new Error("未知 OpenQuantum Skill");
          const entries = (codex.skills?.config ?? []).filter(value => !skillSelector(value, input.id, this.skillRoot));
          // The native plugin-qualified selector survives versioned cache paths.
          entries.push({ name: `openquantum:${input.id}`, enabled: bool(input.enabled) });
          codex.skills = { ...codex.skills, config: entries };
          // The current desktop host has no supported config-write bridge.
          // Preserve the previous document privately; the guarded replacement
          // detects observed conflicts, but is not a cross-process atomic CAS.
          await atomicWrite(`${this.codexFile}.openquantum-backup`, current.codexRaw);
          await atomicWrite(this.codexFile, stringify(codex), { expected: current.codexRaw });
          break;
        }
        case "tool.set":
          if (!this.backend.tools.some(tool => tool.name === input.id)) throw new Error("未知内置 Tool");
          config.enabledTools = toggle(config.enabledTools ?? [], input.id, !bool(input.enabled));
          config.disabledTools = toggle(config.disabledTools, input.id, bool(input.enabled)); break;
        case "provider.set":
          if (!this.backend.providers.some(provider => provider.key === input.id)) throw new Error("未知内置 MCP 连接");
          config.enabledProviders = toggle(config.enabledProviders ?? [], input.id, !bool(input.enabled));
          config.disabledProviders = toggle(config.disabledProviders, input.id, bool(input.enabled)); break;
        case "connection.add": {
          const connection = validateConnection(input.connection);
          if (config.connections.some(value => value.id === connection.id) || config.connections.length >= 32) throw new Error("连接名称重复或已达数量上限");
          config.connections.push({ ...connection, instance: randomUUID() }); break;
        }
        case "connection.set": {
          const connection = config.connections.find(value => value.id === input.id);
          if (!connection) throw new Error("连接不存在");
          if (bool(input.enabled) && connection.authentication === "token" && !(await this.credentials.describe(credentialRef(connection.id))).configured) throw new Error("请先保存此连接需要的 Token");
          connection.enabled = input.enabled; break;
        }
        case "connection.tool.set": {
          const connection = config.connections.find(value => value.id === input.id);
          const tool = connection?.tools.find(value => value.name === input.tool);
          if (!tool) throw new Error("请先测试连接，获取真实 Tool 列表");
          tool.enabled = bool(input.enabled); break;
        }
        case "connection.remove": {
          const connection = config.connections.find(value => value.id === input.id);
          if (!connection || connection.enabled) throw new Error("请先关闭连接再移除");
          if (connection.authentication === "token" && (await this.credentials.describe(credentialRef(connection.id))).configured) throw new Error("请先移除此连接的 Token");
          config.connections = config.connections.filter(value => value.id !== input.id); break;
        }
        default: throw new Error("未知设置操作");
      }
      if (input.action !== "skill.set") await atomicWrite(this.file, JSON.stringify(config, null, 2) + "\n");
    }));
    await this.changed();
    return this.snapshot();
  }
  async inventory(id, tools, before) {
    await withLock(this.file, async () => {
      const { config } = await this.read();
      const connection = config.connections.find(value => value.id === id);
      if (!connection || JSON.stringify({ ...connection, tools: [] }) !== before) throw new Error("连接配置已变化，请重新测试");
      connection.tools = tools.map(tool => ({ ...tool, enabled: connection.tools.find(value => value.name === tool.name)?.enabled === true }));
      await atomicWrite(this.file, JSON.stringify(config, null, 2) + "\n");
    });
    await this.changed();
  }
  async changed() { await Promise.allSettled([...this.listeners].map(listener => listener())); }
}
