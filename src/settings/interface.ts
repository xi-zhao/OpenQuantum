export type ModelProtocol =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages";

export interface ModelProviderSettings {
  readonly id: string;
  readonly displayName: string;
  readonly baseUrl: string;
  readonly protocol: ModelProtocol;
  readonly modelIds: readonly string[];
  readonly apiKeyRef: string | null;
  readonly apiKeyConfigured: boolean;
  readonly apiKeyWritable: boolean;
  readonly active: boolean;
  readonly revision: number;
}

export interface SkillSettings {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly version: string | null;
  readonly maturity: string | null;
  readonly modelInvocable: boolean;
  readonly userInvocable: boolean;
  readonly revision: string;
}

export interface McpServerSettings {
  readonly serverName: string;
  readonly displayName: string;
  readonly description: string;
  readonly provider: string;
  readonly sourceUrl: string | null;
  readonly packageName: string | null;
  readonly packageVersion: string | null;
  readonly credentialRef: string | null;
  readonly transport: "stdio" | "streamable-http";
  readonly target: string;
  readonly enabled: boolean;
  readonly toolCallTimeoutMs: number;
  readonly failOnStartupError: boolean;
  readonly reconnect: {
    readonly enabled: boolean;
    readonly initialDelayMs: number;
    readonly maxDelayMs: number;
    readonly maxAttempts: number;
  };
}

export interface McpCredentialSettings {
  readonly ref: string;
  readonly displayName: string;
  readonly description: string;
  readonly documentationUrl: string;
  readonly serverNames: readonly string[];
  readonly configured: boolean;
  readonly writable: boolean;
}

export interface SettingsSnapshot {
  readonly models: {
    readonly status: "ready" | "unavailable";
    readonly message?: string;
    readonly providers: readonly ModelProviderSettings[];
  };
  readonly project: {
    readonly skills: readonly SkillSettings[];
    readonly mcpServers: readonly McpServerSettings[];
    readonly mcpCredentials: readonly McpCredentialSettings[];
    readonly mcpRevision: string;
  };
}

export type SettingsCommand =
  | {
      readonly type: "model.update";
      readonly provider: string;
      readonly revision: number;
      readonly displayName: string;
      readonly baseUrl: string;
      readonly protocol: ModelProtocol;
      readonly modelIds: readonly string[];
      readonly apiKey?: string;
      readonly removeApiKey?: boolean;
    }
  | {
      readonly type: "skill.update";
      readonly name: string;
      readonly revision: string;
      readonly modelInvocable: boolean;
      readonly userInvocable: boolean;
    }
  | {
      readonly type: "mcp.update";
      readonly serverName: string;
      readonly revision: string;
      readonly enabled: boolean;
      readonly toolCallTimeoutMs: number;
      readonly reconnect: {
        readonly enabled: boolean;
        readonly initialDelayMs: number;
        readonly maxDelayMs: number;
        readonly maxAttempts: number;
      };
    }
  | {
      readonly type: "mcp.credential.update";
      readonly ref: string;
      readonly value?: string;
      readonly remove?: boolean;
    };

/** 设置中心的唯一 Interface；调用方只需读取快照或提交一个业务命令。 */
export interface OpenQuantumSettingsPort {
  snapshot(signal?: AbortSignal): Promise<SettingsSnapshot>;
  execute(
    command: SettingsCommand,
    signal?: AbortSignal,
  ): Promise<SettingsSnapshot>;
}
