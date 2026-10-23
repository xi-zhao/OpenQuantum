import path from "node:path";
import { DISCOVER_TOOL, PREPARE_TOOL, preparationProperties } from "../codex/preparation.mjs";
import { harnessSchema } from "../../../runtime/openquantum/agent-presets/openquantum/tool-schema.mjs";
import { PREPARATION_TIMEOUT_MS } from "./preparation.mjs";

const output = { schema: { type: "object", additionalProperties: true }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] };
// Match the shared HTTP/MCP wire representation before DSH validates lossless
// JSON. In-progress receipts contain optional properties with undefined values.
const wireValue = value => JSON.parse(JSON.stringify(value));
const tool = (name, description, properties, required, execute) => ({ name, description,
  parameters: harnessSchema({ type: "object", properties, required, additionalProperties: false }), output,
  execute: async (...args) => wireValue(await execute(...args)) });

export async function apply(ctx) {
  const application = ctx.openquantumCapabilities.application;
  const { settings } = application;
  const registered = new Map();
  const installationApproved = new WeakSet();
  const standingInstallations = new WeakSet();
  const standingWrites = new WeakSet();
  const owners = new Set();
  const fullAccess = exec => Boolean(exec.agent?.session && ctx.get("sandboxPolicy")?.resolve({ session: exec.agent.session }).mode === "danger-full-access");
  // MCP annotations do not install a DSH permission policy. Native pre-execute
  // asks flow through DSH approval, session audit and cancellation. Local
  // writes may use the session's standing full-access grant. Never infer that
  // grant from approval=never: in confined sessions never means reject asks.
  // Never override a denial/ask made by another host policy.
  ctx.on("tools/pre-execute", async (exec, next) => {
    const decision = await next();
    if (!["allow", "ask"].includes(decision.kind)) return decision;
    if (exec.name === PREPARE_TOOL) {
      if (decision.kind === "ask") installationApproved.add(exec.token);
      const selection = Object.fromEntries(Object.entries(exec.arguments).filter(([key]) => key !== "retry"));
      const plan = await application.discover(selection);
      if (plan.state === "environment_required" || plan.state === "retry_required") {
        if (decision.kind === "allow" && fullAccess(exec)) {
          standingInstallations.add(exec.token);
          return decision;
        }
        installationApproved.add(exec.token);
        return decision.kind === "ask" ? decision : { kind: "ask", reason: "为当前任务下载并安装所选 Skill 的固定依赖，只准备这一项。" };
      }
    } else if (decision.kind === "allow") {
      const declaration = settings.backend.providers.flatMap(provider => provider.tools).find(value => value.name === exec.name);
      if (declaration?.effect === "workspace-write" && fullAccess(exec)) standingWrites.add(exec.token);
      else if (declaration && declaration.effect !== "read-only") return { kind: "ask", reason: `此 OpenQuantum Tool 的操作权限为 ${declaration.effect}，可能写入工作区或调用外部服务。` };
    }
    return decision;
  });
  let invalidate = () => {};
  let closed = false;
  let refreshes = Promise.resolve();
  const refresh = () => refreshes = refreshes.then(async () => {
    if (closed) return;
    const allowed = new Set((await settings.listTools()).map(value => value.name));
    if (closed) return;
    for (const [name, dispose] of registered) if (!allowed.has(name)) { dispose(); registered.delete(name); }
    for (const definition of settings.backend.tools) {
      if (!allowed.has(definition.name) || registered.has(definition.name)) continue;
      const provider = settings.backend.providers.find(value => value.key === settings.backend.providerFor(definition.name));
      const effect = provider.tools.find(value => value.name === definition.name).effect;
      registered.set(definition.name, ctx.tools.register({ name: definition.name,
        description: `${definition.name === "solve_and_validate_ground_state" ? "计算二量子位基态事实和 Validator observations；最终科学验收仅由 Harness 的物化与中央验收链确定。" : definition.description}\nOpenQuantum: ${effect}. Prepare the selected Skill first; never bypass explicit prohibitions.`,
        parameters: harnessSchema(definition.inputSchema), output: { ...output, render: (_args, value) => value.content?.every(item => item.type === "text") ? value.content : output.render(_args, value) }, timeoutMs: 180000,
        async execute(args, exec) {
          owners.add(exec.agent);
          const value = await application.execute(definition.name, args, exec, { authorize: () => {
            if (standingWrites.has(exec.token) && !fullAccess(exec)) throw new Error("当前聊天权限已变化，请重新调用此 Tool 以确认执行。");
          } });
          // Returning isError as ordinary JSON would be a successful DSH event.
          if (value.isError) throw new Error(value.content?.filter(item => item.type === "text").map(item => item.text).join("\n") || "OpenQuantum Tool 执行失败");
          return wireValue(value);
        },
      }));
    }
    invalidate();
  });
  ctx.tools.register(tool(DISCOVER_TOOL, "Search OpenQuantum Skills by task or inspect one selection. Read-only; never installs or starts services. Explicit user prohibitions always win.",
    { ...preparationProperties, query: { type: "string", maxLength: 240 } }, [], args => application.discover(args)));
  ctx.tools.register({ ...tool(PREPARE_TOOL, "Prepare exactly one Skill's Tool or SDK when needed. Downloads and writes pinned dependencies, then waits for completion in this call. Do not poll discovery/job_list or execute in parallel; execute only after this call returns ready. A failure, prohibition or missing credential stops preparation. Missing credentials belong in OpenQuantum settings, never chat. Ready Tools and sdk.run work in this same chat.",
    { ...preparationProperties, retry: { type: "boolean" } }, ["skillId"], (args, exec) => { owners.add(exec.agent); return application.prepare(args, exec, {
      allowInstall: () => installationApproved.has(exec.token) || (standingInstallations.has(exec.token) && fullAccess(exec)),
    }); }), timeoutMs: PREPARATION_TIMEOUT_MS + 30000 });
  const candidates = async () => {
    const { codex } = await settings.read();
    return settings.skills(codex).map(item => ({ name: item.id, description: item.description, source: "bundled", provider: "openquantum-task-skills",
      invocation: { modelInvocable: item.enabled, userInvocable: item.enabled }, rank: 600, locator: item.id,
      resourceBase: { kind: "directory", path: path.join(application.root, ".agents/skills", item.id) } }));
  };
  ctx.skills.registerProvider(control => {
    invalidate = control.invalidate;
    return { name: "openquantum-task-skills", list: candidates, async get(candidate, { signal } = {}) {
      signal?.throwIfAborted();
      const current = (await candidates()).find(value => value.name === candidate.name);
      if (!current?.invocation.modelInvocable) return undefined;
      const capability = settings.backend.sourceCapabilities.find(value => value.id === candidate.name);
      const body = capability.skill.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
      return { ...current, content: `# Desktop 执行约定\n\nAgent 按任务选择 Skill，不要求用户逐项开启。先用 find_openquantum_skills 查询 skillId=${capability.id}；真正执行时用 prepare_openquantum_skill 只准备所选 Tool 或 SDK。明确禁用不可绕过；缺凭据请引导到 OpenQuantum 设置，绝不在聊天索要密钥。准备调用会等待安装和检查结束；无需轮询状态或查询 job_list，也不要并行执行。只在准备返回 ready 后在当前聊天执行。\n\n当前 Tool 名称：${capability.tools.join(", ") || "使用宿主通用 Tool"}。SDK 自定义程序：准备时指定 sdkId，准备返回 ready 时已包含 sdk.run，使用其解释器和环境经宿主代码 Tool 执行。不要使用其他宿主的安装器、凭据窗口或旧 mcp__ 前缀名称。下面领域参考的物理条件保持有效；安装、命名与生命周期以本节和实际返回为准。执行完成不代表科学验收通过。\n\n${body}` };
    } };
  });
  settings.listeners.add(refresh);
  ctx.on("agent/disposed", ({ agent }) => application.closeAgent(agent));
  ctx.effect(() => async () => {
    closed = true; settings.listeners.delete(refresh);
    await refreshes;
    await Promise.all([...owners].map(agent => application.closeAgent(agent))); owners.clear();
    for (const dispose of registered.values()) dispose(); registered.clear();
  });
  await refresh();
}
