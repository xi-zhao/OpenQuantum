import type {
  ConfigurableProviderView,
  CredentialView,
  RpcResponse,
  SettingsNamespaceView,
} from "@deepseek-ai/dsh-host-apiproxy/api";

import { OpenQuantumWebApiClient } from "@/harness/web-api-client";

import type {
  McpCredentialSettings,
  McpServerSettings,
  ModelProtocol,
  OpenQuantumSettingsPort,
  SettingsCommand,
  SettingsSnapshot,
  SkillSettings,
} from "./interface";

interface SettingsHarnessClient {
  readonly settings: OpenQuantumWebApiClient["settings"];
  readonly credentials: OpenQuantumWebApiClient["credentials"];
  readonly llm: OpenQuantumWebApiClient["llm"];
}

interface ProjectSettingsSnapshot {
  readonly skills: readonly SkillSettings[];
  readonly mcpServers: readonly McpServerSettings[];
  readonly mcpCredentials: readonly Omit<
    McpCredentialSettings,
    "configured" | "writable"
  >[];
  readonly mcpRevision: string;
}

interface ProviderConfig {
  readonly displayName?: unknown;
  readonly baseURL?: unknown;
  readonly api?: unknown;
  readonly apiKeyEnv?: unknown;
  readonly models?: unknown;
}

const MODEL_PROTOCOLS = new Set<ModelProtocol>([
  "openai-completions",
  "openai-responses",
  "anthropic-messages",
]);

function unwrap<T>(response: RpcResponse<T>): T {
  if (response.result.ok) {
    return response.result.value;
  }
  throw new Error(response.result.error.message);
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function providerConfigs(namespace: SettingsNamespaceView) {
  return record(record(namespace.value).providers);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function protocolValue(value: unknown): ModelProtocol {
  return typeof value === "string" && MODEL_PROTOCOLS.has(value as ModelProtocol)
    ? (value as ModelProtocol)
    : "openai-completions";
}

function modelIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => stringValue(record(entry).id).trim())
    .filter((id, index, items) => id.length > 0 && items.indexOf(id) === index);
}

function configuredProviderDirectory(
  providers: readonly ConfigurableProviderView[],
): Map<string, ConfigurableProviderView> {
  return new Map(providers.map((provider) => [provider.provider, provider]));
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Harness 设置暂时不可用";
}

async function projectRequest(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ProjectSettingsSnapshot> {
  const response = await fetch("/api/settings/project", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  const value = (await response.json()) as
    | ProjectSettingsSnapshot
    | { error?: string };
  if (!response.ok) {
    throw new Error("error" in value && value.error ? value.error : "项目设置保存失败");
  }
  return value as ProjectSettingsSnapshot;
}

export class HarnessSettingsAdapter implements OpenQuantumSettingsPort {
  private readonly client: SettingsHarnessClient;

  constructor(client: SettingsHarnessClient = new OpenQuantumWebApiClient()) {
    this.client = client;
  }

  async snapshot(signal?: AbortSignal): Promise<SettingsSnapshot> {
    const [project, models] = await Promise.all([
      this.loadProject(signal),
      this.loadModels(signal).catch((error) => ({
        status: "unavailable" as const,
        message: failureMessage(error),
        providers: [],
      })),
    ]);
    return { models, project };
  }

  async execute(
    command: SettingsCommand,
    signal?: AbortSignal,
  ): Promise<SettingsSnapshot> {
    switch (command.type) {
      case "model.update":
        await this.updateModel(command, signal);
        break;
      case "skill.update":
      case "skill.remove":
        await projectRequest({ action: command.type, ...command }, signal);
        break;
      case "mcp.update":
        await this.updateMcp(command, signal);
        break;
      case "mcp.credential.update":
        await this.updateMcpCredential(command, signal);
        break;
      case "mcp.register":
        await projectRequest({ action: command.type, ...command }, signal);
        break;
      case "mcp.remove":
        await this.removeMcp(command, signal);
        break;
    }
    return this.snapshot(signal);
  }

  private async loadProject(signal?: AbortSignal) {
    const project = await projectRequest({ action: "snapshot" }, signal);
    const refs = project.mcpCredentials.map((credential) => credential.ref);
    const described = refs.length
      ? unwrap(await this.client.credentials.describe({ refs }, signal))
      : { credentials: {} as Record<string, CredentialView> };
    return {
      ...project,
      mcpCredentials: project.mcpCredentials.map((credential) => ({
        ...credential,
        configured: described.credentials[credential.ref]?.configured ?? false,
        writable: described.credentials[credential.ref]?.writable ?? false,
      })),
    };
  }

  private async updateMcp(
    command: Extract<SettingsCommand, { type: "mcp.update" }>,
    signal?: AbortSignal,
  ): Promise<void> {
    const project = await projectRequest({ action: "snapshot" }, signal);
    const server = project.mcpServers.find(
      (candidate) => candidate.serverName === command.serverName,
    );
    if (!server) {
      throw new Error("MCP 服务已不存在，请刷新设置后重试");
    }
    if (command.enabled && server.setup?.status === "required") {
      throw new Error(server.setup.message);
    }
    if (command.enabled && server.requiredCredentialRefs.length > 0) {
      const described = unwrap(
        await this.client.credentials.describe(
          { refs: [...server.requiredCredentialRefs] },
          signal,
        ),
      );
      const missing = server.requiredCredentialRefs.filter(
        (ref) => !described.credentials[ref]?.configured,
      );
      if (missing.length > 0) {
        const displayNames = missing.map(
          (ref) =>
            project.mcpCredentials.find((candidate) => candidate.ref === ref)
              ?.displayName ?? ref,
        );
        throw new Error(
          `请先保存 ${displayNames.join("、")}，再启用该服务`,
        );
      }
    }
    await projectRequest({ action: command.type, ...command }, signal);
  }

  private async updateMcpCredential(
    command: Extract<SettingsCommand, { type: "mcp.credential.update" }>,
    signal?: AbortSignal,
  ): Promise<void> {
    const project = await projectRequest({ action: "snapshot" }, signal);
    if (!project.mcpCredentials.some((credential) => credential.ref === command.ref)) {
      throw new Error("MCP 凭据已不存在，请刷新设置后重试");
    }
    if (command.remove) {
      const enabledConsumers = project.mcpServers.filter(
        (server) => server.enabled && server.credentialRefs.includes(command.ref),
      );
      if (enabledConsumers.length > 0) {
        throw new Error(
          `请先停用 ${enabledConsumers.map((server) => server.displayName).join("、")}，再移除 Token`,
        );
      }
      unwrap(await this.client.credentials.unset({ ref: command.ref }, signal));
      return;
    }
    const value = command.value?.trim();
    if (!value) {
      throw new Error("请输入凭据值");
    }
    unwrap(await this.client.credentials.set({ ref: command.ref, value }, signal));
  }

  private async removeMcp(
    command: Extract<SettingsCommand, { type: "mcp.remove" }>,
    signal?: AbortSignal,
  ): Promise<void> {
    const project = await this.loadProject(signal);
    const server = project.mcpServers.find(
      (candidate) => candidate.serverName === command.serverName,
    );
    if (!server) {
      throw new Error("MCP 服务已不存在，请刷新设置后重试");
    }
    if (server.enabled) {
      throw new Error("请先停用 MCP 服务，再将其移除");
    }
    const configuredCredentials = project.mcpCredentials.filter(
      (credential) =>
        server.credentialRefs.includes(credential.ref) && credential.configured,
    );
    if (configuredCredentials.length > 0) {
      throw new Error(
        `请先移除 ${configuredCredentials.map((credential) => credential.displayName).join("、")}，再移除 MCP 服务`,
      );
    }
    await projectRequest({ action: command.type, ...command }, signal);
  }

  private async loadModels(signal?: AbortSignal) {
    const [settingsValue, providerValue] = await Promise.all([
      this.client.settings.describe({}, signal).then(unwrap),
      this.client.llm.providers({}, signal).then(unwrap),
    ]);
    const namespace = settingsValue.namespaces.find(
      (candidate) => candidate.ns === "llm-pi-ai",
    );
    if (!namespace) {
      throw new Error("Harness 未注册 llm-pi-ai 设置");
    }

    const configs = providerConfigs(namespace);
    const directory = configuredProviderDirectory(providerValue.providers);
    const refs = Object.values(configs)
      .map((value) => stringValue((value as ProviderConfig).apiKeyEnv))
      .filter((ref, index, items) => ref.length > 0 && items.indexOf(ref) === index);
    const credentialValue = refs.length
      ? unwrap(await this.client.credentials.describe({ refs }, signal))
      : { credentials: {} as Record<string, CredentialView> };

    return {
      status: "ready" as const,
      providers: Object.entries(configs).map(([id, rawConfig]) => {
        const config = rawConfig as ProviderConfig;
        const apiKeyRef = stringValue(config.apiKeyEnv) || null;
        const credential = apiKeyRef
          ? credentialValue.credentials[apiKeyRef]
          : undefined;
        return {
          id,
          displayName:
            stringValue(config.displayName) || directory.get(id)?.displayName || id,
          baseUrl: stringValue(config.baseURL),
          protocol: protocolValue(config.api),
          modelIds: modelIds(config.models),
          apiKeyRef,
          apiKeyConfigured: credential?.configured ?? false,
          apiKeyWritable: credential?.writable ?? false,
          active: directory.get(id)?.active ?? false,
          revision: namespace.revision,
        };
      }),
    };
  }

  private async updateModel(
    command: Extract<SettingsCommand, { type: "model.update" }>,
    signal?: AbortSignal,
  ): Promise<void> {
    const settingsValue = unwrap(await this.client.settings.describe({}, signal));
    const namespace = settingsValue.namespaces.find(
      (candidate) => candidate.ns === "llm-pi-ai",
    );
    const current = namespace
      ? (providerConfigs(namespace)[command.provider] as ProviderConfig | undefined)
      : undefined;
    const apiKeyRef = stringValue(current?.apiKeyEnv);
    const existingModels = new Map(
      (Array.isArray(current?.models) ? current.models : [])
        .filter((model) => stringValue(record(model).id).length > 0)
        .map((model) => [stringValue(record(model).id), model]),
    );
    if (!namespace || !current) {
      throw new Error("模型提供方已不存在，请刷新设置后重试");
    }

    unwrap(
      await this.client.settings.mutate(
        {
          ns: namespace.ns,
          expectedRevision: command.revision,
          ops: [
            {
              op: "set",
              path: ["providers", command.provider, "displayName"],
              value: command.displayName.trim(),
            },
            {
              op: "set",
              path: ["providers", command.provider, "baseURL"],
              value: command.baseUrl.trim(),
            },
            {
              op: "set",
              path: ["providers", command.provider, "api"],
              value: command.protocol,
            },
            {
              op: "set",
              path: ["providers", command.provider, "models"],
              value: command.modelIds.map(
                (id) => existingModels.get(id) ?? { id, name: id },
              ),
            },
          ],
        },
        signal,
      ),
    );

    if (command.removeApiKey) {
      if (apiKeyRef) {
        unwrap(await this.client.credentials.unset({ ref: apiKeyRef }, signal));
      }
    } else if (command.apiKey?.trim()) {
      if (!apiKeyRef) {
        throw new Error("该模型提供方没有配置凭据引用");
      }
      unwrap(
        await this.client.credentials.set(
          { ref: apiKeyRef, value: command.apiKey.trim() },
          signal,
        ),
      );
    }
  }
}
