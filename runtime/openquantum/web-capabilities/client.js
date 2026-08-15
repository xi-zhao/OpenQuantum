globalThis.__ModuleLoader__.load({
  id: "@openquantum/harness-web-capabilities",
  factory: (require) => {
    const pluginModule = { exports: {} };
    const React = require("react");
    const h = React.createElement;

    const css = `
      .oq-cap-root{width:100%;max-width:820px;color:var(--dsw-alias-label-primary);padding-bottom:28px}
      .oq-cap-hero{border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 30%,var(--dsw-alias-border-l2));background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-state-success-primary) 9%,var(--dsw-alias-bg-layer-1)),var(--dsw-alias-bg-layer-1));border-radius:14px;padding:18px}
      .oq-cap-eyebrow{color:var(--dsw-alias-state-success-primary);font-size:10px;font-weight:700;letter-spacing:.14em;margin:0 0 6px}
      .oq-cap-hero h2,.oq-cap-card h3,.oq-cap-group h3{margin:0}.oq-cap-hero h2{font-size:22px;line-height:30px}.oq-cap-hero p{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:21px;margin:7px 0 0}
      .oq-cap-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}.oq-cap-metric{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 86%,transparent);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px}.oq-cap-metric strong{font-size:19px}.oq-cap-metric span{color:var(--dsw-alias-label-tertiary);font-size:11px;margin-left:5px}
      .oq-cap-relationship{align-items:stretch;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px;margin-top:14px}.oq-cap-role{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 90%,transparent);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px}.oq-cap-role strong{display:block;font-size:12px}.oq-cap-role span{color:var(--dsw-alias-label-tertiary);display:block;font-size:10px;line-height:16px;margin-top:2px}.oq-cap-relation{align-items:center;color:var(--dsw-alias-label-tertiary);display:flex;font-size:10px;font-weight:600;justify-content:center;white-space:nowrap}.oq-cap-separation{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;margin:10px 0 0}.oq-cap-separation strong{color:var(--dsw-alias-label-primary)}
      .oq-cap-tabs{display:flex;gap:6px;margin:16px 0 12px}.oq-cap-tab{border:0;border-radius:18px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:13px;padding:7px 13px}.oq-cap-tab[aria-selected=true]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1)}
      .oq-cap-tab-intro{margin:0 0 12px}.oq-cap-tab-intro strong{display:block;font-size:13px}.oq-cap-tab-intro span{color:var(--dsw-alias-label-tertiary);display:block;font-size:11px;line-height:18px;margin-top:2px}
      .oq-cap-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.oq-cap-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;min-width:0}.oq-cap-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.oq-cap-title{min-width:0}.oq-cap-title h3{font-size:14px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.oq-cap-code{color:var(--dsw-alias-label-tertiary);display:block;font-family:var(--ds-font-family-code);font-size:10px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.oq-cap-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:19px;margin:9px 0}.oq-cap-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;margin:0}.oq-cap-badge{background:var(--dsw-alias-bg-module-platform);border-radius:999px;color:var(--dsw-alias-label-secondary);font-size:10px;padding:3px 7px;white-space:nowrap}.oq-cap-badge[data-tone=ready]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary)}.oq-cap-badge[data-tone=attention]{background:color-mix(in srgb,var(--dsw-alias-state-warning-primary) 14%,transparent);color:var(--dsw-alias-state-warning-primary)}
      .oq-cap-actions{align-items:center;display:flex;gap:7px;margin-top:11px}.oq-cap-button{border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;font-size:12px;padding:6px 10px}.oq-cap-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.oq-cap-button[data-primary=true]{background:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1)}.oq-cap-button[data-danger=true]{color:var(--dsw-alias-state-error-primary)}.oq-cap-button:disabled{cursor:not-allowed;opacity:.48}.oq-cap-link{color:var(--dsw-alias-state-business-primary);font-size:11px;text-decoration:none}.oq-cap-link:hover{text-decoration:underline}
      .oq-cap-switch{align-items:center;display:inline-flex;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}.oq-cap-switch input{accent-color:var(--dsw-alias-state-success-primary)}
      .oq-cap-credential{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.7fr);gap:12px;align-items:end}.oq-cap-field{display:flex;flex-direction:column;gap:5px}.oq-cap-field label,.oq-cap-field>span{color:var(--dsw-alias-label-secondary);font-size:11px}.oq-cap-input,.oq-cap-select,.oq-cap-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:8px 10px;outline:none}.oq-cap-input:focus,.oq-cap-select:focus,.oq-cap-textarea:focus{border-color:var(--dsw-alias-state-business-primary)}.oq-cap-textarea{min-height:78px;resize:vertical}.oq-cap-secret-help{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:16px;margin:5px 0 0}
      .oq-cap-notice,.oq-cap-error,.oq-cap-loading{border-radius:9px;font-size:12px;line-height:19px;margin:12px 0;padding:9px 11px}.oq-cap-notice{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent);color:var(--dsw-alias-state-success-primary)}.oq-cap-error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}.oq-cap-loading{color:var(--dsw-alias-label-tertiary);padding-left:0}
      .oq-cap-empty{color:var(--dsw-alias-label-tertiary);font-size:12px}.oq-cap-group{border-top:1px solid var(--dsw-alias-border-l2);margin-top:18px;padding-top:15px}.oq-cap-group summary{cursor:pointer;font-size:13px;font-weight:600}.oq-cap-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.oq-cap-span{grid-column:1/-1}
      @media(max-width:700px){.oq-cap-grid,.oq-cap-metrics,.oq-cap-form,.oq-cap-relationship{grid-template-columns:1fr}.oq-cap-credential{grid-template-columns:1fr}.oq-cap-relation{justify-content:flex-start}.oq-cap-span{grid-column:auto}}
    `;
    const styleId = "openquantum-capability-settings";
    if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${styleId}"]`) === null) {
      const style = document.createElement("style");
      style.dataset.plugin = "@openquantum/harness-web-capabilities";
      style.dataset.pluginCss = styleId;
      style.textContent = css;
      document.head.appendChild(style);
    }

    const copy = {
      zh: {
        nav: "量子组件",
        title: "量子扩展组件",
        summary: "Skill 与 MCP 是 DeepSeek Harness 中两个独立的扩展类型：Skill 提供领域工作流，MCP 提供确定性工具和量子后端。",
      },
      en: {
        nav: "Quantum components",
        title: "Quantum extension components",
        summary: "Skills and MCP servers are independent DeepSeek Harness extension types: Skills provide domain workflows, while MCP servers provide deterministic tools and quantum backends.",
      },
    };

    function unwrap(response) {
      if (!response?.result?.ok) {
        throw new Error(response?.result?.error?.message ?? "Harness 请求失败");
      }
      return response.result.value;
    }

    async function projectRequest(command) {
      const response = await fetch("/openquantum/api/capabilities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? "能力设置请求失败");
      return value;
    }

    function status(server, credentials) {
      if (server.setup?.status === "required") return ["需要安装", "attention"];
      if (server.requiredCredentialRefs.some((ref) => !credentials[ref]?.configured)) {
        return ["需要凭据", "attention"];
      }
      return server.enabled ? ["已启用", "ready"] : ["已关闭", "off"];
    }

    function CredentialCard({ credential, info, requiredByEnabled, api, busy, onBusy, onRefresh, onError, onNotice }) {
      const [value, setValue] = React.useState("");
      const save = async () => {
        if (value.trim() === "") return;
        onBusy(`credential:${credential.ref}`);
        onError(null);
        try {
          unwrap(await api.credentials.set({ ref: credential.ref, value }));
          setValue("");
          await onRefresh();
          onNotice(`${credential.displayName} 已安全保存。现有值不会在页面回显。`);
        } catch (error) {
          onError(error instanceof Error ? error.message : "凭据保存失败");
        } finally {
          onBusy(null);
        }
      };
      const remove = async () => {
        onBusy(`credential:${credential.ref}`);
        onError(null);
        try {
          unwrap(await api.credentials.unset({ ref: credential.ref }));
          await onRefresh();
          onNotice(`${credential.displayName} 已移除。`);
        } catch (error) {
          onError(error instanceof Error ? error.message : "凭据移除失败");
        } finally {
          onBusy(null);
        }
      };
      const locked = busy !== null || info?.writable === false;
      return h("article", { className: "oq-cap-card oq-cap-credential" },
        h("div", null,
          h("div", { className: "oq-cap-card-head" },
            h("div", { className: "oq-cap-title" }, h("h3", null, credential.displayName), h("code", { className: "oq-cap-code" }, credential.ref)),
            h("span", { className: "oq-cap-badge", "data-tone": info?.configured ? "ready" : "off" }, info?.configured ? "已配置" : "未配置"),
          ),
          h("p", { className: "oq-cap-desc" }, credential.description),
          h("p", { className: "oq-cap-meta" }, `用于：${credential.serverNames.join("、") || "自定义 MCP"}`),
          credential.documentationUrl ? h("a", { className: "oq-cap-link", href: credential.documentationUrl, target: "_blank", rel: "noreferrer" }, "获取凭据") : null,
        ),
        h("div", { className: "oq-cap-field" },
          h("label", { htmlFor: `credential-${credential.ref}` }, "输入新值"),
          h("input", { id: `credential-${credential.ref}`, className: "oq-cap-input", type: "password", autoComplete: "new-password", value, disabled: locked, placeholder: info?.configured ? "输入新值以替换" : "粘贴 API Key / Token", onChange: (event) => setValue(event.currentTarget.value) }),
          h("p", { className: "oq-cap-secret-help" }, "密钥由 Harness 凭据库保存；已有值不会回显、不会写入项目配置。"),
          requiredByEnabled ? h("p", { className: "oq-cap-secret-help" }, "此凭据正被已启用的 MCP 必需使用；请先关闭对应 MCP 再移除。") : null,
          h("div", { className: "oq-cap-actions" },
            h("button", { type: "button", className: "oq-cap-button", "data-primary": "true", disabled: locked || value.trim() === "", onClick: save }, "保存"),
            info?.configured ? h("button", { type: "button", className: "oq-cap-button", "data-danger": "true", disabled: locked || requiredByEnabled, onClick: remove }, "移除") : null,
          ),
        ),
      );
    }

    function CapabilitySettingsSection({ api, loopback, t }) {
      const [snapshot, setSnapshot] = React.useState(null);
      const [credentials, setCredentials] = React.useState({});
      const [tab, setTab] = React.useState("mcp");
      const [busy, setBusy] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [notice, setNotice] = React.useState(null);
      const [skillDraft, setSkillDraft] = React.useState({ name: "", displayName: "", description: "", instructions: "" });
      const [mcpDraft, setMcpDraft] = React.useState({ serverName: "", transport: "stdio", target: "", args: "", credentialRef: "" });

      const loadCredentials = React.useCallback(async (nextSnapshot) => {
        const refs = nextSnapshot.mcpCredentials.map((item) => item.ref);
        if (refs.length === 0) {
          setCredentials({});
          return;
        }
        const described = unwrap(await api.credentials.describe({ refs }));
        setCredentials(described.credentials);
      }, [api]);

      const reload = React.useCallback(async () => {
        const next = await projectRequest({ action: "snapshot" });
        setSnapshot(next);
        await loadCredentials(next);
      }, [loadCredentials]);

      React.useEffect(() => {
        let current = true;
        projectRequest({ action: "snapshot" }).then(async (next) => {
          if (!current) return;
          setSnapshot(next);
          await loadCredentials(next);
        }).catch((caught) => {
          if (current) setError(caught instanceof Error ? caught.message : "能力目录加载失败");
        });
        return () => { current = false; };
      }, [loadCredentials]);

      const runProject = async (key, command, success) => {
        setBusy(key);
        setError(null);
        setNotice(null);
        try {
          const next = await projectRequest(command);
          setSnapshot(next);
          await loadCredentials(next);
          setNotice(success);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "能力设置保存失败");
        } finally {
          setBusy(null);
        }
      };

      if (!snapshot) return h("div", { className: "oq-cap-root" }, error ? h("p", { className: "oq-cap-error", role: "alert" }, error) : h("p", { className: "oq-cap-loading" }, "正在读取 Harness 能力目录…"));
      const enabled = snapshot.mcpServers.filter((server) => server.enabled).length;
      const configured = snapshot.mcpCredentials.filter((item) => credentials[item.ref]?.configured).length;
      const disabled = busy !== null || !loopback;

      const mcpCards = snapshot.mcpServers.map((server) => {
        const [label, tone] = status(server, credentials);
        const enableBlocked = !server.enabled && (
          server.setup?.status === "required" ||
          server.requiredCredentialRefs.some((ref) => !credentials[ref]?.configured)
        );
        return h("article", { className: "oq-cap-card", key: server.serverName },
          h("div", { className: "oq-cap-card-head" },
            h("div", { className: "oq-cap-title" }, h("h3", null, server.displayName), h("code", { className: "oq-cap-code" }, `MCP · ${server.serverName} · ${server.provider}`)),
            h("span", { className: "oq-cap-badge", "data-tone": tone }, label),
          ),
          h("p", { className: "oq-cap-desc" }, server.description),
          h("p", { className: "oq-cap-meta" }, `独立 MCP 组件 · ${server.transport} · ${server.target}${server.packageVersion ? ` · ${server.packageVersion}` : ""}`),
          h("div", { className: "oq-cap-actions" },
            h("label", { className: "oq-cap-switch" },
              h("input", { type: "checkbox", checked: server.enabled, disabled: disabled || enableBlocked, title: enableBlocked ? label : undefined, onChange: (event) => runProject(`mcp:${server.serverName}`, { action: "mcp.update", serverName: server.serverName, revision: snapshot.mcpRevision, enabled: event.currentTarget.checked, toolCallTimeoutMs: server.toolCallTimeoutMs, reconnect: server.reconnect }, "MCP 配置已保存；重启 OpenQuantum 后使用新配置。") }),
              server.enabled ? "已启用" : "已关闭",
            ),
            server.sourceUrl ? h("a", { className: "oq-cap-link", href: server.sourceUrl, target: "_blank", rel: "noreferrer" }, "源码") : null,
            server.managed ? h("button", { type: "button", className: "oq-cap-button", "data-danger": "true", disabled: disabled || server.enabled, onClick: () => runProject(`mcp:${server.serverName}`, { action: "mcp.remove", serverName: server.serverName, revision: snapshot.mcpRevision }, "自定义 MCP 已移入安全回收流程。") }, "移除") : null,
          ),
        );
      });

      const skillCards = snapshot.skills.map((skill) => h("article", { className: "oq-cap-card", key: skill.name },
        h("div", { className: "oq-cap-card-head" },
          h("div", { className: "oq-cap-title" }, h("h3", null, skill.displayName), h("code", { className: "oq-cap-code" }, `Skill · /${skill.name}`)),
          h("span", { className: "oq-cap-badge", "data-tone": skill.modelInvocable ? "ready" : "off" }, skill.modelInvocable ? "Agent 可用" : "仅显式调用"),
        ),
        h("p", { className: "oq-cap-desc" }, skill.description),
        h("p", { className: "oq-cap-meta" }, `独立 Skill 组件 · ${[skill.version, skill.maturity].filter(Boolean).join(" · ") || "项目工作流"}`),
        h("div", { className: "oq-cap-actions" },
          h("label", { className: "oq-cap-switch" }, h("input", { type: "checkbox", checked: skill.modelInvocable, disabled, onChange: (event) => runProject(`skill:${skill.name}`, { action: "skill.update", name: skill.name, revision: skill.revision, modelInvocable: event.currentTarget.checked, userInvocable: skill.userInvocable }, "Skill 调用策略已保存，新会话生效。") }), "允许 Agent 自动调用"),
          skill.managed ? h("button", { type: "button", className: "oq-cap-button", "data-danger": "true", disabled, onClick: () => runProject(`skill:${skill.name}`, { action: "skill.remove", name: skill.name, revision: skill.revision }, "自定义 Skill 已移入项目回收目录。") }, "移除") : null,
        ),
      ));

      const credentialCards = snapshot.mcpCredentials.map((credential) => h(CredentialCard, {
        key: credential.ref,
        credential,
        info: credentials[credential.ref],
        requiredByEnabled: snapshot.mcpServers.some(
          (server) => server.enabled && server.requiredCredentialRefs.includes(credential.ref),
        ),
        api,
        busy,
        onBusy: setBusy,
        onRefresh: reload,
        onError: setError,
        onNotice: setNotice,
      }));

      const createSkill = async (event) => {
        event.preventDefault();
        await runProject("skill:create", { action: "skill.create", ...skillDraft, modelInvocable: true, userInvocable: true }, "自定义 Skill 已创建，新会话可用。 ");
        setSkillDraft({ name: "", displayName: "", description: "", instructions: "" });
      };
      const createMcp = async (event) => {
        event.preventDefault();
        const stdio = mcpDraft.transport === "stdio";
        await runProject("mcp:create", { action: "mcp.create", revision: snapshot.mcpRevision, serverName: mcpDraft.serverName, transport: mcpDraft.transport, ...(stdio ? { command: mcpDraft.target, args: mcpDraft.args.split("\n").map((item) => item.trim()).filter(Boolean), ...(mcpDraft.credentialRef.trim() ? { credentialRef: mcpDraft.credentialRef.trim() } : {}) } : { url: mcpDraft.target }) }, "自定义 MCP 已创建并保持关闭；检查配置后再启用。 ");
        setMcpDraft({ serverName: "", transport: "stdio", target: "", args: "", credentialRef: "" });
      };

      const activeCards = tab === "mcp" ? mcpCards : tab === "skills" ? skillCards : credentialCards;
      const tabIntro = tab === "mcp"
        ? ["MCP 组件", "由 Harness MCP Client 独立注册和启停；提供 Tool、数据源或外部量子后端，不加载 Skill。"]
        : tab === "skills"
        ? ["Skill 组件", "由 Harness Skill Registry 独立发现；提供知识和工作流，可以调用已注册 Tool，但不会启动 MCP。"]
        : ["安全凭据", "凭据按引用提供给 MCP；Skill 无权读取密钥，页面也不会回显已有值。"];
      return h("div", { className: "oq-cap-root" },
        h("section", { className: "oq-cap-hero" },
          h("p", { className: "oq-cap-eyebrow" }, "HARNESS EXTENSIONS"),
          h("h2", null, t("title")),
          h("p", null, t("summary")),
          h("div", { className: "oq-cap-relationship", "aria-label": "Skill 与 MCP 组件关系" },
            h("div", { className: "oq-cap-role" }, h("strong", null, "Skill"), h("span", null, "知识、领域边界与可复用工作流")),
            h("div", { className: "oq-cap-relation" }, "按 Tool 名调用 →"),
            h("div", { className: "oq-cap-role" }, h("strong", null, "MCP"), h("span", null, "独立 Tool、数据源与外部后端")),
          ),
          h("p", { className: "oq-cap-separation" },
            h("strong", null, "互不包含："),
            "两者分别注册、配置与启停；源码可以位于同一仓库，一个 Skill 可以使用多个 MCP，一个 MCP 也可以被多个 Skill 复用。",
          ),
          h("div", { className: "oq-cap-metrics" },
            h("div", { className: "oq-cap-metric" }, h("strong", null, snapshot.skills.length), h("span", null, "Skills")),
            h("div", { className: "oq-cap-metric" }, h("strong", null, `${enabled}/${snapshot.mcpServers.length}`), h("span", null, "MCP 已启用")),
            h("div", { className: "oq-cap-metric" }, h("strong", null, `${configured}/${snapshot.mcpCredentials.length}`), h("span", null, "凭据已配置")),
          ),
        ),
        !loopback ? h("p", { className: "oq-cap-error", role: "alert" }, "远程浏览器只读；请在 Harness 本机打开设置后写入凭据或配置。") : null,
        error ? h("p", { className: "oq-cap-error", role: "alert" }, error) : null,
        notice ? h("p", { className: "oq-cap-notice", role: "status" }, notice) : null,
        h("div", { className: "oq-cap-tabs", role: "tablist", "aria-label": "能力分类" },
          [["mcp", "MCP 组件"], ["skills", "Skill 组件"], ["credentials", "安全凭据"]].map(([id, label]) => h("button", { key: id, type: "button", role: "tab", className: "oq-cap-tab", "aria-selected": tab === id, onClick: () => setTab(id) }, label)),
        ),
        h("div", { className: "oq-cap-tab-intro" }, h("strong", null, tabIntro[0]), h("span", null, tabIntro[1])),
        activeCards.length ? h("div", { className: "oq-cap-grid" }, activeCards) : h("p", { className: "oq-cap-empty" }, "暂无能力配置。"),
        tab === "mcp" ? h("details", { className: "oq-cap-group" },
          h("summary", null, "添加独立 MCP 组件"),
          h("form", { className: "oq-cap-form", onSubmit: createMcp },
            h("div", { className: "oq-cap-field" }, h("label", null, "Server name"), h("input", { className: "oq-cap-input", required: true, pattern: "[A-Za-z0-9_-]{1,32}", value: mcpDraft.serverName, onChange: (event) => setMcpDraft({ ...mcpDraft, serverName: event.currentTarget.value }) })),
            h("div", { className: "oq-cap-field" }, h("label", null, "传输"), h("select", { className: "oq-cap-select", value: mcpDraft.transport, onChange: (event) => setMcpDraft({ ...mcpDraft, transport: event.currentTarget.value }) }, h("option", { value: "stdio" }, "stdio"), h("option", { value: "streamable-http" }, "streamable-http"))),
            h("div", { className: "oq-cap-field oq-cap-span" }, h("label", null, mcpDraft.transport === "stdio" ? "命令" : "URL"), h("input", { className: "oq-cap-input", required: true, value: mcpDraft.target, placeholder: mcpDraft.transport === "stdio" ? "uvx" : "https://mcp.example.com/", onChange: (event) => setMcpDraft({ ...mcpDraft, target: event.currentTarget.value }) })),
            mcpDraft.transport === "stdio" ? h(React.Fragment, null,
              h("div", { className: "oq-cap-field" }, h("label", null, "参数（每行一项）"), h("textarea", { className: "oq-cap-textarea", value: mcpDraft.args, onChange: (event) => setMcpDraft({ ...mcpDraft, args: event.currentTarget.value }) })),
              h("div", { className: "oq-cap-field" }, h("label", null, "凭据引用（可选）"), h("input", { className: "oq-cap-input", pattern: "[A-Za-z_][A-Za-z0-9_]*", value: mcpDraft.credentialRef, placeholder: "EXAMPLE_API_KEY", onChange: (event) => setMcpDraft({ ...mcpDraft, credentialRef: event.currentTarget.value }) })),
            ) : null,
            h("div", { className: "oq-cap-span" }, h("button", { type: "submit", className: "oq-cap-button", "data-primary": "true", disabled }, "创建为关闭状态")),
          ),
        ) : null,
        tab === "skills" ? h("details", { className: "oq-cap-group" },
          h("summary", null, "添加独立 Skill 组件"),
          h("form", { className: "oq-cap-form", onSubmit: createSkill },
            h("div", { className: "oq-cap-field" }, h("label", null, "Skill name"), h("input", { className: "oq-cap-input", required: true, pattern: "[a-z0-9]+(?:-[a-z0-9]+)*", value: skillDraft.name, onChange: (event) => setSkillDraft({ ...skillDraft, name: event.currentTarget.value }) })),
            h("div", { className: "oq-cap-field" }, h("label", null, "显示名称"), h("input", { className: "oq-cap-input", required: true, value: skillDraft.displayName, onChange: (event) => setSkillDraft({ ...skillDraft, displayName: event.currentTarget.value }) })),
            h("div", { className: "oq-cap-field oq-cap-span" }, h("label", null, "能力说明"), h("input", { className: "oq-cap-input", required: true, value: skillDraft.description, onChange: (event) => setSkillDraft({ ...skillDraft, description: event.currentTarget.value }) })),
            h("div", { className: "oq-cap-field oq-cap-span" }, h("label", null, "工作流指令"), h("textarea", { className: "oq-cap-textarea", required: true, value: skillDraft.instructions, onChange: (event) => setSkillDraft({ ...skillDraft, instructions: event.currentTarget.value }) })),
            h("div", { className: "oq-cap-span" }, h("button", { type: "submit", className: "oq-cap-button", "data-primary": "true", disabled }, "创建 Skill")),
          ),
        ) : null,
      );
    }

    const NS = "settings.openquantumCapabilities";
    const inject = ["slots", "locale", "connection"];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, copy), "openquantum capabilities: dictionaries");
      const t = ctx.locale.bind(NS);
      const connection = ctx.get("connection");
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "openquantum-capabilities",
        order: 12,
        label: () => t("nav"),
        locale: NS,
        inject: () => ({ api: connection.api, loopback: connection.isLoopback, t }),
      }, CapabilitySettingsSection));
    }

    pluginModule.exports.apply = apply;
    pluginModule.exports.inject = inject;
    return pluginModule.exports;
  },
});
