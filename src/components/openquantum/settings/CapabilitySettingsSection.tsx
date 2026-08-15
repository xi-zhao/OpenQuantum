import type {
  McpCredentialSettings,
  McpServerSettings,
  SkillSettings,
} from "@/settings/interface";

export interface CapabilitySettingsSectionProps {
  skills: readonly SkillSettings[];
  servers: readonly McpServerSettings[];
  credentials: readonly McpCredentialSettings[];
  onOpenMcp: () => void;
  onOpenSkills: () => void;
}

function statusTone(status: "ready" | "attention" | "off") {
  switch (status) {
    case "ready":
      return "bg-[#d9f5ef] text-[#0b776e]";
    case "attention":
      return "bg-[#fff0cf] text-[#8b5b08]";
    case "off":
      return "bg-[#edf3f5] text-[#617682]";
  }
}

function mcpStatus(
  server: McpServerSettings,
  credentialByRef: ReadonlyMap<string, McpCredentialSettings>,
) {
  if (server.setup?.status === "required") {
    return { label: "需要安装", tone: "attention" as const };
  }
  const missing = server.requiredCredentialRefs.some(
    (ref) => !credentialByRef.get(ref)?.configured,
  );
  if (missing) {
    return { label: "需要凭据", tone: "attention" as const };
  }
  return server.enabled
    ? { label: "已启用", tone: "ready" as const }
    : { label: "已关闭", tone: "off" as const };
}

export function CapabilitySettingsSection({
  skills,
  servers,
  credentials,
  onOpenMcp,
  onOpenSkills,
}: CapabilitySettingsSectionProps) {
  const credentialByRef = new Map(
    credentials.map((credential) => [credential.ref, credential]),
  );
  const enabledServers = servers.filter((server) => server.enabled).length;
  const configuredCredentials = credentials.filter(
    (credential) => credential.configured,
  ).length;

  return (
    <div>
      <div className="rounded-2xl border border-[#b8dcd7] bg-[linear-gradient(135deg,#effbf8_0%,#f7fafb_68%)] p-5 sm:p-6">
        <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0b887d]">
          HARNESS EXTENSIONS
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#162936]">
          扩展组件
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526673]">
          Skill 与 MCP 是 DeepSeek Harness 中两个独立的扩展类型。Skill 提供领域工作流，MCP
          提供确定性工具或外部后端。
        </p>
        <div
          aria-label="Skill 与 MCP 组件关系"
          className="mt-4 grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        >
          <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-3">
            <strong className="block text-sm text-[#162936]">Skill</strong>
            <span className="mt-1 block text-[11px] leading-4 text-[#728793]">
              知识、领域边界与可复用工作流
            </span>
          </div>
          <div className="flex items-center text-[11px] font-semibold text-[#728793]">
            按 Tool 名调用 →
          </div>
          <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-3">
            <strong className="block text-sm text-[#162936]">MCP</strong>
            <span className="mt-1 block text-[11px] leading-4 text-[#728793]">
              独立 Tool、数据源与外部后端
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#526673]">
          <strong className="text-[#162936]">互不包含：</strong>
          两者分别注册、配置与启停；源码可以位于同一仓库，一个 Skill 可以使用多个 MCP，一个
          MCP 也可以被多个 Skill 复用。
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/80 bg-white/85 p-4">
            <strong className="text-2xl text-[#162936]">{skills.length}</strong>
            <span className="ml-2 text-xs text-[#728793]">Skills</span>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/85 p-4">
            <strong className="text-2xl text-[#162936]">{enabledServers}</strong>
            <span className="ml-2 text-xs text-[#728793]">/{servers.length} MCP 已启用</span>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/85 p-4">
            <strong className="text-2xl text-[#162936]">{configuredCredentials}</strong>
            <span className="ml-2 text-xs text-[#728793]">/{credentials.length} 凭据已配置</span>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[#162936]">MCP 组件</h3>
            <p className="mt-1 text-xs text-[#728793]">
              由 Harness MCP Client 独立注册和启停，不加载 Skill
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMcp}
            className="shrink-0 text-sm font-semibold text-[#0b887d] hover:underline"
          >
            管理 MCP 与凭据
          </button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {servers.map((server) => {
            const status = mcpStatus(server, credentialByRef);
            const configured = server.credentialRefs.filter(
              (ref) => credentialByRef.get(ref)?.configured,
            ).length;
            return (
              <button
                key={server.serverName}
                type="button"
                onClick={onOpenMcp}
                className="rounded-xl border border-[#dce5ea] bg-white p-4 text-left shadow-[0_8px_28px_rgba(7,19,31,.04)] transition hover:border-[#9fd7cf] hover:shadow-[0_12px_32px_rgba(7,19,31,.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-[#162936]">{server.displayName}</strong>
                    <span className="mt-1 block truncate font-mono text-[10px] text-[#728793]">
                      MCP · {server.serverName} · {server.provider}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(status.tone)}`}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#617682]">{server.description}</p>
                {server.credentialRefs.length > 0 ? (
                  <p className="mt-3 text-[10px] font-medium text-[#728793]">
                    安全凭据 {configured}/{server.credentialRefs.length}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[#162936]">Skill 组件</h3>
            <p className="mt-1 text-xs text-[#728793]">
              由 Harness Skill Registry 独立发现，可以调用 Tool，但不会启动 MCP
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSkills}
            className="shrink-0 text-sm font-semibold text-[#0b887d] hover:underline"
          >
            管理 Skills
          </button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {skills.map((skill) => (
            <button
              key={skill.name}
              type="button"
              onClick={onOpenSkills}
              className="rounded-xl border border-[#dce5ea] bg-white p-4 text-left shadow-[0_8px_28px_rgba(7,19,31,.04)] transition hover:border-[#9fd7cf] hover:shadow-[0_12px_32px_rgba(7,19,31,.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-[#162936]">{skill.displayName}</strong>
                  <span className="mt-1 block truncate font-mono text-[10px] text-[#728793]">
                    Skill · /{skill.name}
                  </span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(skill.modelInvocable ? "ready" : "off")}`}>
                  {skill.modelInvocable ? "Agent 可用" : "仅显式调用"}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#617682]">{skill.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
