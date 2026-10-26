import path from "node:path";
import { ALGORITHM_GROUPS, algorithmGroupArgs, algorithmSelection } from "../../lib/algorithm-environment.mjs";
import { atomicWrite, readOptional, withLock } from "./storage.mjs";
import { skillRelations } from "./relations.mjs";
import { SERVICES, serviceById, serviceSupported, serviceValues, missingFields } from "./service-catalog.mjs";
import { runningJob } from "./environments.mjs";
import { externalMcp, externalContract, ACCOUNT_OPERATIONS, operationCredential, operationPresentation, operationLimitation } from "../../../runtime/chatgpt/external/catalog.mjs";
import { validateExternal } from "../../../runtime/chatgpt/external/client.mjs";

// A projection of the existing capability policy and installation manager.
// Discovery never installs, imports an SDK, starts a provider, or changes policy.
export const DISCOVER_TOOL = "find_openquantum_skills";
export const PREPARE_TOOL = "prepare_openquantum_skill";
export const preparationProperties = {
  skillId: { type: "string", maxLength: 128 },
  toolName: { type: "string", maxLength: 128, description: "Choose one declared Tool. Omit for a knowledge-only Skill." },
  sdkId: { type: "string", maxLength: 128, description: "Choose one declared SDK for a custom program instead of a scientific Tool." },
  dependencyGroups: { type: "array", maxItems: 4, uniqueItems: true, items: { enum: ALGORITHM_GROUPS }, description: "Only for quantum-algorithms: add the groups required by the current task. The Skill's own required groups are always included." },
  serviceId: { type: "string", maxLength: 128, description: "Only for a task that needs this Skill's cloud credentials, e.g. pasqal_cloud. Never pass credentials." },
  credentialField: { type: "string", maxLength: 128, description: "Optional field NAME returned by a preparation_required result for the chosen platform. Never pass its value." },
  operationName: { type: "string", maxLength: 128, description: "For an integrated external MCP Tool, select an operation to inspect its exact input schema and preparation requirements." },
  operationArguments: { type: "object", description: "Optional operation arguments to validate before preparation. Never include credentials. Not saved in recent activity." },
};
function validate(input, keys) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))) throw new Error("能力准备参数无效");
  for (const key of ["skillId", "toolName", "sdkId", "serviceId", "credentialField", "operationName", "query"]) if (input[key] !== undefined && (typeof input[key] !== "string" || !input[key].trim() || input[key].length > (key === "query" ? 240 : 128))) throw new Error("能力选择无效");
  if (input.operationArguments !== undefined && (!input.operationName || !input.operationArguments || typeof input.operationArguments !== "object" || Array.isArray(input.operationArguments))) throw new Error("操作参数需要 operationName 和对象参数");
  if (input.retry !== undefined && typeof input.retry !== "boolean") throw new Error("重试选项无效");
  if (input.dependencyGroups !== undefined) algorithmGroupArgs(input.dependencyGroups);
}
export async function recentSkills(settings) {
  const raw = await readOptional(path.join(path.dirname(settings.file), "activity.json"));
  if (!raw) return [];
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value.slice(0, 20) : []; } catch { return []; }
}
export async function recordSkill(settings, id, state, extra = {}) {
  if (extra.selection) {
    const selection = { ...extra.selection };
    delete selection.operationArguments;
    extra = { ...extra, selection };
  }
  const file = path.join(path.dirname(settings.file), "activity.json");
  await withLock(file, async () => {
    const previous = await recentSkills(settings);
    const old = previous.find(item => item.id === id);
    const now = new Date().toISOString();
    const item = { id, state, selectedAt: now, ...(old?.lastUsedAt ? { lastUsedAt: old.lastUsedAt } : {}), ...extra };
    await atomicWrite(file, JSON.stringify([item, ...previous.filter(item => item.id !== id)].slice(0, 20)));
  });
}
const available = settings => settings.backend.sourceCapabilities.filter(item => item.status === "available" && (item.skill || item.tools?.length));
const brief = (item, enabled) => ({ skillId: item.id, kind: item.skill ? "skill" : "tool", title: item.title, description: (item.summary ?? item.description ?? "").slice(0, 240), policy: enabled ? "auto" : "blocked", tools: item.tools ?? [], sdkIds: item.sdkIds ?? [] });

export async function discoverSkills(settings, input = {}) {
  validate(input, [...Object.keys(preparationProperties), "query"]);
  if (input.skillId) return inspectPreparation(settings, input);
  if (["toolName", "sdkId", "dependencyGroups", "serviceId", "credentialField", "operationName", "operationArguments"].some(key => input[key])) throw new Error("请先指定 Skill");
  const { config, codex } = await settings.read();
  const enabled = new Map(settings.skills(codex).map(item => [item.id, item.enabled]));
  const query = (input.query ?? "").normalize("NFKC").toLowerCase();
  const terms = query.match(/[a-z0-9_-]+|[\p{Script=Han}]/gu) ?? [];
  const matches = available(settings).map(item => {
    const text = `${item.id} ${item.title} ${item.summary} ${item.description} ${item.tools.join(" ")}`.normalize("NFKC").toLowerCase();
    const score = (query && text.includes(query) ? 20 : 0) + terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    return { item, score };
  }).filter(({ item, score }) => (!terms.length || score > 0) && (item.skill ? enabled.get(item.id) : item.tools.some(name => settings.builtinAllowed(config, codex, name))))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  return { selection: "Agent chooses a relevant Skill; users can explicitly forbid it. Discovery has no setup side effects.",
    matches: matches.slice(0, 8).map(({ item }) => brief(item, true)), totalMatches: matches.length,
    next: `Inspect one selection for its exact Tool contract; read its Skill when present. Call ${PREPARE_TOOL} only when execution is needed. Refine the query if needed.` };
}

export async function inspectPreparation(settings, input) {
  validate(input, [...Object.keys(preparationProperties), "retry"]);
  const capability = available(settings).find(item => item.id === input.skillId);
  if (!capability) throw new Error("当前插件未提供此 Skill");
  const { config, codex } = await settings.read();
  const enabled = !capability.skill || settings.skills(codex).find(item => item.id === capability.id)?.enabled;
  const result = { ...brief(capability, enabled), state: "ready", selection: { skillId: capability.id } };
  if (!enabled) return { ...result, state: "blocked", message: "用户已禁止此 Skill；不能自行恢复或改用原生代码绕过。" };
  if (input.toolName && input.sdkId) throw new Error("一次只选择一个 Tool 或 SDK");
  if (input.toolName && !capability.tools.includes(input.toolName)) throw new Error("此 Tool 不属于所选 Skill");
  if (input.sdkId && !capability.sdkIds?.includes(input.sdkId)) throw new Error("此 SDK 不属于所选 Skill");
  const toolName = input.toolName ?? (!input.sdkId && capability.tools.length === 1 ? capability.tools[0] : undefined);
  if (!toolName && !input.sdkId && capability.tools.length > 1) return { ...result, state: "choice_required", message: "按任务选择一个 Tool，或指定 SDK 编写自定义程序。" };
  const sdkId = input.sdkId ?? (toolName ? settings.environmentFor(toolName) : capability.sdkIds?.length === 1 ? capability.sdkIds[0] : null);
  if (input.dependencyGroups && sdkId !== "quantum-algorithms") throw new Error("依赖组只适用于 quantum-algorithms");
  const groups = sdkId === "quantum-algorithms" ? algorithmSelection(algorithmGroupArgs([...new Set([...(capability.sdkGroups ?? []), ...(input.dependencyGroups ?? [])])])) : [];
  if (!toolName && !sdkId && capability.sdkIds?.length > 1) return { ...result, state: "choice_required", message: "按任务选择一个 SDK；不会安装整个目录。" };
  if (sdkId && !toolName && !settings.sdkAllowed(config, codex, sdkId)) return { ...result, state: "blocked", message: "用户已禁止此 SDK 所属的 Skill、Tool 或 MCP；不能通过其他 Skill 绕过。" };
  if (toolName) result.selection.toolName = toolName;
  else if (sdkId) result.selection.sdkId = sdkId;
  if (sdkId === "quantum-algorithms") result.selection.dependencyGroups = groups;
  // A direct SDK route must not silently circumvent a forbidden associated
  // provider or Tool. The user may restore the choice in settings.
  const relations = skillRelations(capability, settings.backend, SERVICES);
  // A workbench aggregates independent alternatives. A selected native SDK is
  // governed by its actual owner (sdkAllowed above), not every workbench MCP.
  const blocked = (toolName ? [toolName] : sdkId ? [] : relations.toolIds).filter(id => !settings.toolEnabled(config, id));
  const blockedProviders = (toolName ? [settings.backend.providerFor(toolName)] : sdkId ? [] : relations.providerIds).filter(id => config.disabledProviders.includes(id));
  if (blocked.length || blockedProviders.length || (toolName && !settings.builtinAllowed(config, codex, toolName, capability.id))) return { ...result, state: "blocked", blockedTools: blocked, blockedProviders,
    message: "用户已禁止关联的 Tool 或 MCP；准备不会更改此选择。" };
  const external = toolName && externalMcp(settings.backend.providerFor(toolName));
  let requiredField;
  if (input.operationName && !external) throw new Error("此 Tool 不使用 operationName");
  if (external) {
    const contract = await externalContract(settings.backend.root, external.id);
    const operations = contract.tools.filter(tool => !ACCOUNT_OPERATIONS.has(tool.name) && !config.disabledTools.includes(tool.name)).map(tool => operationPresentation(external, tool));
    if (!input.operationName) return { ...result, state: "choice_required", operations: operations.map(({ name, description }) => ({ name, description: description?.slice(0, 240) })), message: "按任务选择 operationName 查看参数与准备要求；不会安装其他 MCP。" };
    if (config.disabledTools.includes(input.operationName)) return { ...result, state: "blocked", message: "用户已禁止此操作；不能通过关联 Tool 绕过。" };
    const operation = operations.find(tool => tool.name === input.operationName);
    if (!operation && !(external.persistent && input.operationName === "close_session")) throw new Error("此 MCP 未提供所选操作");
    const limitation = operationLimitation(external, input.operationName);
    if (limitation) return { ...result, state: "unavailable", message: limitation };
    if (input.operationArguments && input.operationName !== "close_session") await validateExternal(settings.backend.root, external, { operation: input.operationName, arguments: input.operationArguments });
    result.selection.operationName = input.operationName;
    if (input.operationArguments) result.selection.operationArguments = input.operationArguments;
    result.operation = operation ? { name: operation.name, description: operation.description, inputSchema: operation.inputSchema } : { name: "close_session", description: external.id === "qpanda_runtime"
      ? "关闭本地会话，释放绑定和任务句柄；已提交的云端任务不会取消。" : "关闭会话及全部后台计算。" };
    requiredField = operationCredential(external, input.operationName, input.operationArguments);
  }
  const inferredService = toolName ? serviceById(settings.backend.providerFor(toolName)) : null;
  const service = input.serviceId ? serviceById(input.serviceId)
    : external ? requiredField ? inferredService : null
      : inferredService && (inferredService.fields.some(field => field.required) || inferredService.alternatives) && !inferredService.credentialFreeTools?.includes(toolName) ? inferredService : null;
  if (input.serviceId && (!service || !relations.credentialServiceIds.includes(input.serviceId))) throw new Error("此凭据不属于所选 Skill");
  if (input.credentialField && !service?.fields.some(field => field.name === input.credentialField)) throw new Error("此凭据字段不属于所选服务");
  if (service) {
    if (!serviceSupported(service, settings.backend)) return { ...result, state: "unsupported", message: "此云端执行入口尚未接入。" };
    result.selection.serviceId = service.id;
    if (input.credentialField) result.selection.credentialField = input.credentialField;
    let values;
    try { values = await serviceValues(settings.credentials, service, external ? { fields: [requiredField, input.credentialField].filter(Boolean) } : {}); }
    catch { return { ...result, state: "credentials_required", serviceId: service.id, message: "凭据暂时无法读取，请在设置中检查。" }; }
    const missing = [...new Set([...(external ? requiredField && !values[requiredField] ? [requiredField] : [] : missingFields(service, values)), ...(input.credentialField && !values[input.credentialField] ? [input.credentialField] : [])])];
    if (missing.length) return { ...result, state: "credentials_required", serviceId: service.id,
      fields: service.fields.filter(field => missing.includes(field.name)).map(({ name, title }) => ({ name, title })),
      message: "请在显示的配置表单填写。凭据不会进入聊天；保存后再次准备即可。" };
  }
  if (sdkId) {
    if (!settings.environments) return { ...result, state: "unavailable", message: "当前插件缺少环境管理入口。" };
    const environment = await settings.environments.status(sdkId, { groups });
    result.environment = { id: sdkId, title: environment.title, state: environment.state, installation: environment.installation,
      ready: environment.ready, job: environment.job, ...(sdkId === "quantum-algorithms" ? { requiredGroups: groups } : {}) };
    if (!environment.ready) result.state = runningJob(environment.job) && ["preparing", "cancelling"].includes(environment.state) ? "preparing"
      : ["unsupported_platform", "unreadable", "needs_configuration"].includes(environment.state) ? "configuration_required"
        : ["failed", "cancelled", "interrupted"].includes(environment.job?.status) ? "retry_required" : "environment_required";
    if (toolName === "simulate_squidasm_bell_pairs" && environment.ready && !environment.optionalSimulation) {
      result.state = "configuration_required";
      result.message = "需要另行配置许可的 SquidASM / NetSquid 环境；不会自动下载许可依赖。";
    }
  }
  result.next = result.state === "ready" ? toolName ? `Call ${toolName} in this conversation. The provider starts only for the call.`
    : sdkId ? "Use this Skill's scripts/sdk-access.mjs inspect to locate the prepared interpreter, then run the program with the host code Tool."
      : "Read the Skill instructions; no installation is needed."
    : result.state === "preparing" ? `Call ${DISCOVER_TOOL} with this selection after a short wait to read progress.`
      : `Call ${PREPARE_TOOL} with this selection when execution is needed.`;
  return result;
}

export async function prepareSkill(settings, input, signal, { allowInstall = true, onStarted } = {}) {
  validate(input, [...Object.keys(preparationProperties), "retry"]);
  signal?.throwIfAborted();
  // Serialize policy reads with user changes until the one selected job starts.
  const result = await withLock(settings.file, () => withLock(settings.codexFile, async () => {
    signal?.throwIfAborted();
    let plan = await inspectPreparation(settings, input);
    signal?.throwIfAborted();
    if (plan.state === "environment_required" || (plan.state === "retry_required" && input.retry)) {
      // A native host can resolve its standing permission at the last boundary
      // before installation, after asynchronous planning and owner creation.
      if ((typeof allowInstall === "function" ? allowInstall() : allowInstall) !== true) return { ...plan, message: "准备状态或权限已变化，请重新调用 prepare_openquantum_skill 以确认安装。" };
      const operation = plan.environment.installation === "present" ? "check" : "install";
      await settings.environments.start(plan.environment.id, operation, { signal, onStarted, groups: plan.environment.requiredGroups ?? [] });
      plan = await inspectPreparation(settings, input);
    }
    return plan;
  }));
  await recordSkill(settings, input.skillId, result.state, { selection: result.selection, ...(result.serviceId ? { serviceId: result.serviceId } : {}) });
  return result;
}

export async function executionPreparation(settings, name, args, { skillId } = {}) {
  const capability = skillId ? settings.backend.sourceCapabilities.find(item => item.id === skillId) : settings.capabilityFor(name);
  if (!capability) return null;
  const external = externalMcp(settings.backend.providerFor(name));
  const plan = await inspectPreparation(settings, { skillId: capability.id, toolName: name,
    ...(external ? { operationName: args.operation, operationArguments: args.arguments } : {}) });
  // FieldQKit chooses credentials by platform. Local simulator and inspection
  // must stay usable without an account; only the requested cloud is prompted.
  if (name === "discover_fieldqkit_backends" && args.provider && args.provider !== "simulator") {
    const service = serviceById("fieldqkit");
    const field = service.fields.find(field => field.name === `${args.provider.toUpperCase()}_API_TOKEN`);
    if (field && !["blocked", "credentials_required"].includes(plan.state)) {
      let values;
      try { values = await serviceValues(settings.credentials, service); }
      catch { return { ...plan, state: "credentials_required", serviceId: service.id, message: "所选平台的凭据暂时无法读取，请在配置表单中检查。" }; }
      if (!values[field.name]) Object.assign(plan, { state: "credentials_required", serviceId: service.id, fields: [{ name: field.name, title: field.title }],
        selection: { ...plan.selection, serviceId: service.id, credentialField: field.name },
        message: "所选平台需要凭据，请在配置表单填写后继续。" });
    }
  }
  return plan.state === "ready" ? null : plan;
}
