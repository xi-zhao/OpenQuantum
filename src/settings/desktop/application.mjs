import path from "node:path";
import { createDesktopBackend } from "./backend.mjs";
import { Settings } from "../codex/application.mjs";
import { Environments } from "../codex/environments.mjs";
import { discoverSkills, prepareSkill } from "../codex/preparation.mjs";
import { createCredentialChannel } from "../codex/credential-channel.mjs";
import { sdkCli } from "../../lib/sdk-access.mjs";
import { desktopSkillPolicy } from "./policy.mjs";
import { DesktopCredentials } from "./credentials.mjs";
import { withDesktopWorkflow } from "./workflow.mjs";
import { prepareDesktopSkill } from "./preparation.mjs";

// Application Interface shared by the native Tool Provider and bounded settings
// route. This owns preparation, not Agent turns, permissions or a Tool registry.
export async function createDesktopApplication({ root, directory, credentials: provider, backendFactory = createDesktopBackend, environment = process.env, nodeExecutable = process.execPath } = {}) {
  environment = { ...environment, PATH: `${path.dirname(nodeExecutable)}${path.delimiter}${environment.PATH ?? ""}` };
  const credentials = new DesktopCredentials(provider);
  const skillPolicy = desktopSkillPolicy(directory);
  const createSettings = backend => {
    const environments = new Environments({ root, directory, environment, nodeExecutable });
    let current;
    const adapted = withDesktopWorkflow(backend, { credentials, environments, settings: () => current });
    current = new Settings({ backend: adapted, credentials, skillPolicy, directory, skillRoot: path.join(root, ".agents/skills"), environments });
    return current;
  };
  const settings = createSettings(await backendFactory({ root, nodeExecutable }));
  const channel = createCredentialChannel({ settings, credentials });
  const agents = new Map();
  const disposedAgents = new WeakSet();
  const closingAgents = new Map();
  const pending = new Set();
  const lifetime = new AbortController();
  let closed = false;
  async function owned(agent) {
    if (closed || !agent || disposedAgents.has(agent)) throw new Error("此 Tool 需要当前有效的 Desktop 聊天");
    if (!agents.has(agent)) {
      agents.set(agent, backendFactory({ root, nodeExecutable }).then(backend => ({ settings: createSettings(backend), controller: new AbortController() })));
      agent.ctx?.effect(() => () => closeAgent(agent), "openquantum: close this chat's resources");
    }
    return agents.get(agent);
  }
  async function track(action) {
    if (closed) throw new Error("OpenQuantum 插件已关闭");
    const promise = action(); pending.add(promise);
    try { return await promise; } finally { pending.delete(promise); }
  }
  async function describeSdk(value, current) {
    if (value.state !== "ready" || !value.selection?.sdkId) return value;
    const id = value.selection.sdkId;
    const sdk = await sdkCli(root, ["inspect", id, ...(value.selection.dependencyGroups ?? []).flatMap(group => ["--group", group])], { environment: current.environments.environment });
    if (sdk.run) sdk.run.environment = { ...current.environments.values(id, await current.environments.read(id)), ...sdk.run.environment };
    sdk.setup = { tool: "prepare_openquantum_skill", selection: value.selection, effect: "workspace-write-and-download" };
    return { ...value, sdk };
  }
  settings.listeners.add(async () => {
    await Promise.all([...agents.values()].map(async promise => (await promise).settings.backend.reconcileExternal()));
  });
  function closeAgent(agent) {
    if (closingAgents.has(agent)) return closingAgents.get(agent);
    disposedAgents.add(agent);
    const promise = agents.get(agent);
    const closing = (async () => {
      if (!promise) return;
      const owner = await promise;
      owner.controller.abort();
      await Promise.all([owner.settings.backend.close(), owner.settings.environments.close()]);
      agents.delete(agent);
    })();
    closingAgents.set(agent, closing);
    // Retain only active teardown work; disposedAgents prevents recreation.
    closing.finally(() => closingAgents.delete(agent)).catch(() => {});
    return closing;
  }
  return {
    settings, credentials, root, directory,
    async discover(input) {
      const value = await describeSdk(await discoverSkills(settings, input), settings);
      return value.state === "preparing" ? { ...value, next: "Call prepare_openquantum_skill with this selection to wait for completion. Do not poll discovery or execute before ready." } : value;
    },
    prepare(input, exec, options) { return track(async () => {
      const owner = await owned(exec.agent);
      const signal = AbortSignal.any([lifetime.signal, owner.controller.signal, exec.signal]);
      const value = await prepareDesktopSkill(owner.settings, input, signal, options);
      return { ...await describeSdk(value, owner.settings), ...(value.state === "credentials_required" ? { settingsPath: `/openquantum/settings#skill=${encodeURIComponent(value.skillId)}`, instruction: "打开 OpenQuantum 设置填写所缺凭据，保存后在当前聊天继续；不要在聊天中发送密钥。" } : {}) };
    }); },
    execute(name, args, exec, { authorize } = {}) { return track(async () => {
      const owner = await owned(exec.agent);
      authorize?.();
      return owner.settings.callBuiltin(name, args, AbortSignal.any([lifetime.signal, owner.controller.signal, exec.signal]), { cwd: exec.agent.session?.header?.cwd ?? root });
    }); },
    request(input) { return track(async () => {
      if (input.action === "snapshot") return settings.snapshot();
      if (input.action === "credential.field.prepare") return channel.prepare(input);
      if (input.action === "credential.field.commit") return channel.commit(input);
      if (input.action === "skill.prepare") {
        const selection = Object.fromEntries(Object.entries(input).filter(([key]) => !["action", "revision"].includes(key)));
        await prepareSkill(settings, selection, lifetime.signal); return settings.snapshot();
      }
      if (input.action?.startsWith("environment.")) return settings.environmentCommand(input);
      if (!["skill.set", "tool.set", "tool.operation.set", "provider.set"].includes(input.action)) throw new Error("此操作由 Desktop 原生设置管理");
      return settings.command(input);
    }); },
    closeAgent,
    async close() {
      closed = true; lifetime.abort(); channel.close();
      await Promise.all([...agents.keys()].map(agent => closeAgent(agent)));
      await Promise.all([...closingAgents.values()]);
      await Promise.allSettled([...pending]);
      await Promise.all([settings.environments.close(), settings.backend.close()]);
    },
  };
}
