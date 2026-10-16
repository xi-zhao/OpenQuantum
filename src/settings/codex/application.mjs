import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { codexSkillPolicy } from "./skill-policy.mjs";
export { skillEnabled } from "./skill-policy.mjs";
import { atomicWrite, digest, readOptional, withLock } from "./storage.mjs";
import { CAPABILITY_CATEGORIES, capabilityCategory, providerCategory } from "../capability-categories.mjs";
import { SERVICES, SERVICE_TOOL_TITLES, SERVICE_TOOL_SUMMARIES, serviceSupported, serviceById, serviceValues, missingFields } from "./service-catalog.mjs";
import { Environments } from "./environments.mjs";
import { skillRelations, toolCredential } from "./relations.mjs";
import { executionPreparation, recentSkills, recordSkill } from "./preparation.mjs";
import { externalMcp, operationCredential } from "../../../runtime/chatgpt/external/catalog.mjs";

const NAME = /^[a-z][a-z0-9_-]{0,31}$/;
const ENV = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const fresh = () => ({ schemaVersion: 1, disabledTools: [], disabledProviders: [], connections: [] });
export const credentialRef = id => `mcp-${id}`;
export const externalToolName = (id, tool) => `oqext_${id.slice(0, 16)}_${tool.slice(0, 16)}_${digest(JSON.stringify([id, tool])).slice(0, 20)}`;
export function sameToolContract(left, right) {
  return Boolean(left && right) && ["name", "description", "inputSchema", "outputSchema", "annotations"].every(key => isDeepStrictEqual(left[key], right[key]));
}
function record(value) { return value && typeof value === "object" && !Array.isArray(value); }
function requireKeys(input, keys) {
  if (!record(input) || Object.keys(input).some(key => !keys.includes(key))) throw new Error("设置字段无效");
}
function bool(value) { if (typeof value !== "boolean") throw new Error("启用状态必须是布尔值"); return value; }
function toggle(list, name, enabled) { return enabled ? list.filter(value => value !== name) : [...new Set([...list, name])]; }
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
  constructor({ backend, credentials, skillRoot, componentDirectory, environments, skillPolicy, directory = path.join(os.homedir(), ".openquantum/plugins/codex"), codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex") }) {
    if (componentDirectory && (componentDirectory.schemaVersion !== 1 || !Array.isArray(componentDirectory.skills) || !Array.isArray(componentDirectory.mcpServers))) throw new Error("量子组件目录版本不受支持");
    Object.assign(this, { backend, credentials, skillRoot, componentDirectory });
    this.file = path.join(directory, "settings.json");
    this.skillPolicy = skillPolicy ?? codexSkillPolicy(codexHome, skillRoot);
    this.codexFile = this.skillPolicy.file; // Compatibility alias for the shared transaction lock.
    this.listeners = new Set();
    this.statuses = new Map();
    this.environments = environments ?? (backend.root ? new Environments({ root: backend.root, directory }) : null);
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
    const codex = this.skillPolicy.parse(codexRaw);
    return { config, codex, raw, codexRaw, revision: digest(`${raw}\0${codexRaw}`) };
  }
  skills(codex) {
    return this.backend.sourceCapabilities.filter(item => item.status === "available" && item.skill).map(item => {
      return { id: item.id, title: item.title, description: item.summary ?? item.description, category: capabilityCategory(item.id), tools: item.tools, enabled: this.skillPolicy.enabled(codex, item.id) };
    });
  }
  async snapshot() {
    const { config, codex, revision } = await this.read();
    const capabilities = this.backend.sourceCapabilities;
    const providers = this.backend.providers.map(provider => {
      const members = capabilities.filter(item => item.status === "available" && item.tools.some(name => this.backend.providerFor(name) === provider.key));
      return { id: provider.key, title: externalMcp(provider.key)?.title || provider.title || (members.length === 1 ? members[0].title : provider.kind === "native" ? "通用量子计算工具" : provider.key), category: providerCategory(members), environmentId: provider.environmentId, enabled: this.providerEnabled(config, provider.key), bundled: true, service: serviceById(provider.key)?.id };
    });
    const tools = this.backend.tools.map(tool => ({ id: tool.name, title: SERVICE_TOOL_TITLES[tool.name] || (tool.title !== tool.name && tool.title) || this.capabilityFor(tool.name)?.title || tool.name, description: tool.description,
      summary: SERVICE_TOOL_SUMMARIES[tool.name] || this.capabilityFor(tool.name)?.summary || tool.description,
      environmentId: this.environmentFor(tool.name),
      category: capabilityCategory(this.capabilityFor(tool.name)?.id),
      provider: this.backend.providerFor(tool.name), enabled: this.toolEnabled(config, tool.name), readOnly: tool.annotations?.readOnlyHint === true }));
    const connections = await Promise.all(config.connections.map(async connection => ({ ...connection,
      credential: connection.authentication === "token" ? await this.credentials.describe(credentialRef(connection.id)).catch(() => ({ configured: false, unavailable: true })) : { configured: false },
      status: this.statuses.get(connection.id) ?? { state: "not_checked", message: "尚未测试连接" },
    })));
    const credentialReads = new Map();
    const credentials = this.credentials.serviceValues ? this.credentials : { resolve: ref => {
      if (!credentialReads.has(ref)) credentialReads.set(ref, this.credentials.resolve(ref));
      return credentialReads.get(ref);
    } };
    const services = await Promise.all(SERVICES.map(async service => {
      const supported = serviceSupported(service, this.backend);
      const values = {};
      const fields = await Promise.all(service.fields.map(async field => {
        let unavailable = false;
        if (supported) try { Object.assign(values, await serviceValues(credentials, service, { fields: [field.name] })); } catch { unavailable = true; }
        let native = {};
        if (this.credentials.describeField) try { native = await this.credentials.describeField(field.name); } catch { unavailable = true; }
        return { ...field, configured: Boolean(values[field.name]), ...native, unavailable };
      }));
      const unavailable = fields.some(field => field.unavailable);
      const missing = missingFields(service, values);
      return { ...service, supported, enabled: supported && this.providerEnabled(config, service.id),
        fields,
        configuration: !supported ? "unsupported" : unavailable ? "unavailable" : missing.length ? "incomplete" : Object.keys(values).length ? "configured" : "optional",
        missing, checked: false, tools: tools.filter(tool => tool.provider === service.id) };
    }));
    for (const tool of tools) tool.credential = toolCredential(tool, services);
    const skills = this.skills(codex).map(skill => ({ ...skill,
      relations: skillRelations(capabilities.find(item => item.id === skill.id), this.backend, services) }));
    const environments = this.environments ? await this.environments.snapshot(this.environmentIds()) : [];
    const components = this.componentDirectory ? {
      copy: this.componentDirectory.copy,
      skills: this.componentDirectory.skills.map(item => {
        const available = skills.find(skill => skill.id === item.name);
        const capability = capabilities.find(capability => capability.id === item.name);
        return { ...item, id: item.name, title: capability?.title ?? item.displayName, description: capability?.summary ?? item.description, supported: Boolean(available), enabled: available?.enabled ?? false,
          environmentId: capability?.sdkIds?.length === 1 ? capability.sdkIds[0] : null,
          relations: available?.relations ?? skillRelations(capability ?? {}, this.backend, services),
          tools: available?.tools ?? [], availabilityNote: available ? null : capability?.reason ?? "此 Skill 使用 Desktop 工作流，当前 Codex 插件未提供。" };
      }),
      mcpServers: this.componentDirectory.mcpServers.map(item => {
        const provider = providers.find(provider => provider.id === item.serverName);
        const capability = capabilities.find(capability => capability.mcp?.some(server => server.name === item.serverName));
        const service = services.find(service => service.id === item.serverName);
        return { ...item, id: item.serverName, title: item.displayName, supported: Boolean(provider), enabled: provider?.enabled ?? false,
          environmentId: provider?.environmentId ?? (capability?.sdkIds?.length === 1 ? capability.sdkIds[0] : null),
          toolCallTimeoutMs: 180000, service: service?.id, configuration: service?.configuration,
          requiredCredentialsMissing: service?.configuration === "incomplete",
          tools: tools.filter(tool => tool.provider === item.serverName),
          availabilityNote: provider ? null : capability?.reason ?? "此连接使用 Desktop 工作流，当前 Codex 插件未提供。" };
      }),
    } : undefined;
    return { revision, categories: CAPABILITY_CATEGORIES, skills, providers, tools, connections, services, components, environments,
      selectionMode: "auto", recentSkills: await recentSkills(this),
      observedAt: new Date().toISOString(),
      notice: "Agent 按任务选择 Skill，执行前准备所需环境。明确禁用立即阻止新的准备和调用；原生 Skill 简介更新由宿主管理。", host: this.skillPolicy.host, scope: "当前用户的 OpenQuantum 插件" };
  }
  providerEnabled(config, id) {
    const provider = this.backend.providers.find(provider => provider.key === id);
    // Legacy default-off/absent opt-in is not a user prohibition. Preserve the
    // explicit deny lists without rewriting any existing configuration.
    return Boolean(provider) && !config.disabledProviders.includes(id);
  }
  toolEnabled(config, id) {
    return this.backend.tools.some(tool => tool.name === id) && !config.disabledTools.includes(id);
  }
  async providerEnvironment(name, args = {}) {
    const provider = this.backend.providerFor(name), external = externalMcp(provider);
    const service = serviceById(provider);
    if (external && !operationCredential(external, args.operation, args.arguments)) {
      // Check an existing session's key generation without injecting a key into
      // a local operation or making credential access a prerequisite for it.
      return external.id === "qpanda_runtime" ? serviceValues(this.credentials, service).catch(() => ({})) : {};
    }
    if (service?.credentialFreeTools?.includes(name) || (name === "discover_fieldqkit_backends" && args.provider === "simulator")) return {};
    return service?.supported ? serviceValues(this.credentials, service, external ? { fields: [operationCredential(external, args.operation, args.arguments)] } : {}) : {};
  }
  capabilityFor(name) {
    const provider = this.backend.providers.find(item => item.key === this.backend.providerFor(name));
    const id = provider?.tools?.find(tool => tool.name === name)?.capabilityId;
    return this.backend.sourceCapabilities.find(item => item.status === "available" && (id ? item.id === id : item.tools.includes(name)));
  }
  environmentFor(name) {
    const provider = this.backend.providers.find(item => item.key === this.backend.providerFor(name));
    if (provider?.environmentId) return provider.environmentId;
    const capability = this.capabilityFor(name);
    return capability?.sdkIds?.length === 1 ? capability.sdkIds[0] : null;
  }
  async callBuiltin(name, args, signal, context = {}) {
    await this.backend.validateCall?.(name, args);
    if (!await this.enabled(name)) throw new Error("用户已禁止此 Skill、Tool 或 MCP；不能自动恢复");
    signal?.throwIfAborted();
    const preparation = args.operation === "close_session" && externalMcp(this.backend.providerFor(name))?.persistent ? null : await executionPreparation(this, name, args);
    if (preparation) {
      await recordSkill(this, preparation.skillId, preparation.state, { selection: preparation.selection, ...(preparation.serviceId ? { serviceId: preparation.serviceId } : {}) });
      // Scientific output schemas describe successful results. Keep setup errors
      // in content so strict MCP clients can read them without schema rejection.
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ code: "preparation_required", ...preparation }) }] };
    }
    const id = this.environmentFor(name);
    const external = externalMcp(this.backend.providerFor(name));
    const lease = !external && id && this.environments ? await this.environments.acquire(id, name) : null;
    try {
      const getValues = async () => ({ ...(external && id ? this.environments.values(id, await this.environments.read(id)) : lease?.values), ...await this.providerEnvironment(name, args) });
      const values = await getValues();
      const authorize = async () => await this.enabled(name) && (!external || !(await this.read()).config.disabledTools.includes(args.operation));
      const result = await this.backend.call(name, args, signal, authorize, values, { ...context, ...(external ? { values: getValues, acquire: () => this.environments.acquire(id, name) } : {}) });
      const capability = this.capabilityFor(name);
      if (capability && !result.isError) await recordSkill(this, capability.id, "used", { selection: { skillId: capability.id, toolName: name }, lastUsedAt: new Date().toISOString() }).catch(() => {});
      return result;
    } finally { await lease?.release(); }
  }
  async environmentCommand(input) {
    if (!this.environments) throw new Error("当前插件没有运行环境管理入口");
    requireKeys(input, ["action", "id", "revision", "configuration", "configurationRevision", "jobId"]);
    if (input.revision !== (await this.read()).revision) throw new Error("设置已更新，请刷新后重试");
    const ids = this.environmentIds();
    if (!ids.includes(input.id)) throw new Error("当前插件未提供此运行环境");
    if (input.action === "environment.configure") await this.environments.configure(input.id, input.configuration, input.configurationRevision);
    else if (input.action === "environment.cancel") await this.environments.cancel(input.id, input.jobId);
    else if (["environment.install", "environment.check"].includes(input.action)) await this.environments.start(input.id, input.action.slice("environment.".length));
    else throw new Error("未知运行环境操作");
    await this.changed();
    return this.snapshot();
  }
  environmentIds() {
    return [...new Set([...this.backend.sourceCapabilities.filter(item => item.status === "available").flatMap(item => item.sdkIds ?? []), ...this.backend.providers.map(item => item.environmentId).filter(Boolean)])];
  }
  async enabled(name) {
    const { config, codex } = await this.read();
    const provider = this.backend.providerFor(name);
    if (provider) return this.builtinAllowed(config, codex, name);
    return config.connections.some(connection => connection.enabled && connection.tools.some(tool => externalToolName(connection.id, tool.name) === name && tool.enabled));
  }
  builtinAllowed(config, codex, name) {
    const capability = this.capabilityFor(name);
    return this.providerEnabled(config, this.backend.providerFor(name)) && this.toolEnabled(config, name)
      && (!capability?.skill || this.skillPolicy.enabled(codex, capability.id));
  }
  sdkAllowed(config, codex, id) {
    const owner = this.backend.sourceCapabilities.find(item => item.id === id && item.status === "available");
    return !owner || ((!owner.skill || this.skillPolicy.enabled(codex, owner.id))
      && (owner.tools ?? []).every(name => this.toolEnabled(config, name) && this.providerEnabled(config, this.backend.providerFor(name))));
  }
  async listTools() {
    const { config, codex } = await this.read();
    return [
      ...this.backend.tools.filter(tool => this.builtinAllowed(config, codex, tool.name)),
      ...config.connections.filter(connection => connection.enabled).flatMap(connection => connection.tools.filter(tool => tool.enabled).map(({ enabled: _enabled, ...tool }) => ({ ...tool, name: externalToolName(connection.id, tool.name) }))),
    ];
  }
  async command(input) {
    requireKeys(input, ["action", "revision", "id", "enabled", "connection", "tool", "resetCredential"]);
    if (typeof input.revision !== "string") throw new Error("缺少设置版本，请刷新页面");
    await withLock(this.file, () => withLock(this.codexFile, async () => {
      const current = await this.read();
      if (input.revision !== current.revision) throw new Error("配置已被其他操作更新，请刷新后重试");
      const { config, codex } = current;
      switch (input.action) {
        case "skill.set": {
          if (!this.skills(codex).some(skill => skill.id === input.id)) throw new Error("未知 OpenQuantum Skill");
          await this.skillPolicy.set(codex, input.id, bool(input.enabled), current.codexRaw);
          break;
        }
        case "tool.set":
          if (!this.backend.tools.some(tool => tool.name === input.id)) throw new Error("未知内置 Tool");
          config.enabledTools = toggle(config.enabledTools ?? [], input.id, !bool(input.enabled));
          config.disabledTools = toggle(config.disabledTools, input.id, bool(input.enabled)); break;
        case "provider.set": {
          if (!this.backend.providers.some(provider => provider.key === input.id)) throw new Error("未知内置 MCP 连接");
          config.enabledProviders = toggle(config.enabledProviders ?? [], input.id, !bool(input.enabled));
          config.disabledProviders = toggle(config.disabledProviders, input.id, bool(input.enabled)); break;
        }
        case "connection.add": {
          const connection = validateConnection(input.connection);
          if (config.connections.some(value => value.id === connection.id) || config.connections.length >= 32) throw new Error("连接名称重复或已达数量上限");
          config.connections.push({ ...connection, instance: randomUUID() }); break;
        }
        case "connection.update": {
          const index = config.connections.findIndex(value => value.id === input.id);
          if (index < 0) throw new Error("连接不存在");
          const previous = config.connections[index];
          const next = validateConnection(input.connection);
          if (next.id !== previous.id) throw new Error("连接名称不能修改");
          const keys = ["transport", "url", "command", "args", "tokenEnv", "authentication"];
          if (keys.every(key => isDeepStrictEqual(previous[key], next[key]))) break;
          if (previous.authentication === "token" && (await this.credentials.describe(credentialRef(previous.id))).configured) {
            if (input.resetCredential !== true) throw new Error("修改连接会清除原 Token，请确认后保存");
            await this.credentials.remove(credentialRef(previous.id));
          }
          config.connections[index] = { ...next, instance: randomUUID() };
          this.statuses.delete(input.id);
          break;
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
      connection.tools = tools.map(tool => {
        const previous = connection.tools.find(value => value.name === tool.name);
        return { ...tool, enabled: previous?.enabled === true && sameToolContract(previous, tool) };
      });
      await atomicWrite(this.file, JSON.stringify(config, null, 2) + "\n");
    });
    await this.changed();
  }
  async changed() { await this.backend.reconcileExternal?.(); await Promise.allSettled([...this.listeners].map(listener => listener())); }
}
