globalThis.__ModuleLoader__.load({
  id: "@openquantum/harness-web-capabilities",
  factory: (require) => {
    const pluginModule = { exports: {} };
    const React = require("react");
    const h = React.createElement;

    const css = `
      .oq-cap-root{width:100%;max-width:820px;color:var(--dsw-alias-label-primary);padding-bottom:28px}
      .oq-cap-card h3,.oq-cap-group h3{margin:0}
      .oq-cap-tabs{display:flex;gap:6px;margin:0 0 12px}.oq-cap-tab{border:0;border-radius:18px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:13px;padding:7px 13px}.oq-cap-tab[aria-selected=true]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1)}
      .oq-cap-tab-intro{margin:0 0 12px}.oq-cap-tab-intro strong{display:block;font-size:13px}.oq-cap-tab-intro span{color:var(--dsw-alias-label-tertiary);display:block;font-size:11px;line-height:18px;margin-top:2px}
      .oq-cap-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.oq-cap-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;min-width:0}.oq-cap-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.oq-cap-title{min-width:0}.oq-cap-title h3{font-size:14px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.oq-cap-code{color:var(--dsw-alias-label-tertiary);display:block;font-family:var(--ds-font-family-code);font-size:10px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.oq-cap-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:19px;margin:9px 0}.oq-cap-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;margin:0}.oq-cap-badge{background:var(--dsw-alias-bg-module-platform);border-radius:999px;color:var(--dsw-alias-label-secondary);font-size:10px;padding:3px 7px;white-space:nowrap}.oq-cap-badge[data-tone=ready]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary)}.oq-cap-badge[data-tone=attention]{background:color-mix(in srgb,var(--dsw-alias-state-warning-primary) 14%,transparent);color:var(--dsw-alias-state-warning-primary)}
      .oq-cap-actions{align-items:center;display:flex;gap:7px;margin-top:11px}.oq-cap-button{border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;font-size:12px;padding:6px 10px;white-space:nowrap}.oq-cap-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.oq-cap-button[data-primary=true]{background:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1)}.oq-cap-button[data-danger=true]{color:var(--dsw-alias-state-error-primary)}.oq-cap-button:disabled{cursor:not-allowed;opacity:.48}.oq-cap-link{color:var(--dsw-alias-state-business-primary);font-size:11px;text-decoration:none}.oq-cap-link:hover{text-decoration:underline}
      .oq-cap-switch{align-items:center;display:inline-flex;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}.oq-cap-switch input{accent-color:var(--dsw-alias-state-success-primary)}
      .oq-cap-credential{display:flex;flex-direction:column;gap:12px}.oq-cap-field{display:flex;flex-direction:column;gap:5px}.oq-cap-field label,.oq-cap-field>span{color:var(--dsw-alias-label-secondary);font-size:11px}.oq-cap-input,.oq-cap-select,.oq-cap-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:8px 10px;outline:none}.oq-cap-input:focus,.oq-cap-select:focus,.oq-cap-textarea:focus{border-color:var(--dsw-alias-state-business-primary)}.oq-cap-textarea{min-height:78px;resize:vertical}.oq-cap-secret-help{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:16px;margin:5px 0 0}
      .oq-cap-notice,.oq-cap-error,.oq-cap-loading{border-radius:9px;font-size:12px;line-height:19px;margin:12px 0;padding:9px 11px}.oq-cap-notice{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent);color:var(--dsw-alias-state-success-primary)}.oq-cap-error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}.oq-cap-loading{color:var(--dsw-alias-label-tertiary);padding-left:0}
      .oq-cap-empty{color:var(--dsw-alias-label-tertiary);font-size:12px}.oq-cap-group{border-top:1px solid var(--dsw-alias-border-l2);margin-top:18px;padding-top:15px}.oq-cap-group summary{cursor:pointer;font-size:13px;font-weight:600}.oq-cap-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.oq-cap-span{grid-column:1/-1}
      .oq-cap-discovery{background:var(--dsw-alias-bg-module-platform);border-radius:10px;margin-top:12px;padding:12px}.oq-cap-discovery p{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;margin:0}.oq-cap-path{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:7px;color:var(--dsw-alias-label-primary);display:block;font-family:var(--ds-font-family-code);font-size:11px;margin:9px 0;padding:8px 10px;word-break:break-all}
      .oq-runtime-summary{align-items:flex-start;background:var(--dsw-alias-bg-module-platform);border-radius:10px;display:flex;gap:12px;justify-content:space-between;margin-bottom:12px;padding:12px}.oq-runtime-summary strong{display:block;font-size:13px}.oq-runtime-summary p{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;margin:3px 0 0}.oq-runtime-items{border-top:1px solid var(--dsw-alias-border-l2);margin-top:10px;padding-top:8px}.oq-runtime-items summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:11px}.oq-runtime-items code{color:var(--dsw-alias-label-tertiary);display:block;font-family:var(--ds-font-family-code);font-size:10px;line-height:17px;overflow-wrap:anywhere}.oq-runtime-limit{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:17px;margin:12px 0 0}
      .oq-channel-flow{align-items:center;display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.oq-channel-node{background:var(--dsw-alias-bg-module-platform);border-radius:8px;color:var(--dsw-alias-label-secondary);font-size:11px;padding:7px 9px}.oq-channel-arrow{color:var(--dsw-alias-label-tertiary);font-size:11px}.oq-channel-commands{display:grid;gap:7px;margin-top:12px}.oq-channel-command{background:var(--dsw-alias-bg-module-platform);border-radius:8px;display:flex;flex-direction:column;gap:3px;padding:8px 10px}.oq-channel-command span{color:var(--dsw-alias-label-tertiary);font-size:10px}.oq-channel-command code{color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);font-size:11px;word-break:break-all}
      @media(max-width:700px){.oq-cap-grid,.oq-cap-form{grid-template-columns:1fr}.oq-cap-span{grid-column:auto}}
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
        channelsNav: "消息渠道",
      },
      en: {
        nav: "Quantum components",
        channelsNav: "Messaging channels",
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

    async function channelRequest(command) {
      const response = await fetch("/openquantum/api/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? "消息渠道请求失败");
      return value;
    }

    async function readinessRequest() {
      const response = await fetch("/openquantum/api/runtime-readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "snapshot" }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? "运行状态请求失败");
      return value;
    }

    function status(server, credentials) {
      if (server.setup?.status === "required") return ["需要安装", "attention"];
      if (server.requiredCredentialRefs.some((ref) => !credentials[ref]?.configured)) {
        return ["需要凭据", "attention"];
      }
      return server.enabled ? ["连接配置启用", "configured"] : ["连接配置关闭", "off"];
    }

    const runtimeCheckCopy = {
      "model-routes": {
        title: "模型路由",
        code: "Host · Model Registry",
        description: "当前 Host 已注册的模型 Adapter Route；不发送模型请求，也不检查 Endpoint 或鉴权。",
      },
      "skill-registry": {
        title: "Skill Registry",
        code: "OpenQuantum Agent Preset",
        description: "当前已挂载 OpenQuantum Agent scope 中发现的 Skill；Snapshot 不返回或展示 Skill 正文。",
      },
      "tool-registry": {
        title: "Tool Registry",
        code: "OpenQuantum Agent Preset",
        description: "当前 Agent scope 中可见的 Tool schema；Tool 已注册不等于 MCP Server 此刻在线。",
      },
    };

    function runtimeCheckStatus(check) {
      if (check.state === "observed") {
        return check.id === "model-routes"
          ? ["Route 已注册", "ready"]
          : ["Registry 已观测", "ready"];
      }
      if (check.state === "incomplete") return ["观测不完整", "attention"];
      if (check.state === "failed") return ["观测失败", "attention"];
      return ["尚未形成观测", "off"];
    }

    const runtimeReasonCopy = {
      PRESET_NOT_MOUNTED: "等待 OpenQuantum Agent 会话",
      MULTIPLE_PRESET_GENERATIONS: "检测到多个 Preset generation，建议重启 OpenQuantum 后刷新",
      SKILL_CATALOG_INCOMPLETE: "Skill 目录在本次读取中发生变化，请刷新重试",
      NO_SKILLS_OBSERVED: "当前 Agent scope 中没有发现 Skill",
      NO_TOOLS_OBSERVED: "当前 Agent scope 中没有发现 Tool",
      NO_MODEL_ROUTES_OBSERVED: "当前 Host 没有注册模型 Route",
      SKILL_REGISTRY_TIMEOUT: "Skill Registry 读取超时",
      TOOL_REGISTRY_TIMEOUT: "Tool Registry 读取超时",
      MODEL_ROUTE_REGISTRY_TIMEOUT: "模型 Route Registry 读取超时",
    };

    function runtimeReason(check) {
      const translated = check.reasonCodes
        .map((code) => runtimeReasonCopy[code])
        .filter(Boolean);
      if (translated.length > 0) return translated.join("；");
      return check.reasonCodes.length > 0
        ? "本次 Registry 观测未完成，请刷新或查看 Host 日志"
        : "";
    }

    function RuntimeReadinessPanel({ snapshot, busy, error, onRefresh }) {
      if (!snapshot) {
        return h("div", null,
          error ? h("p", { className: "oq-cap-error", role: "alert" }, error) : h("p", { className: "oq-cap-loading" }, "正在读取当前 Runtime Registry…"),
          h("button", { type: "button", className: "oq-cap-button", disabled: busy, onClick: onRefresh }, "重新读取"),
        );
      }
      const overall = snapshot.status === "observed"
        ? ["运行证据已形成", "当前 Host、OpenQuantum Agent 的 Model、Skill 与 Tool Registry 均已完成只读观测。"]
        : snapshot.status === "partial"
        ? ["运行证据需要关注", "部分 Registry 观测不完整或存在多个 Preset generation；展开卡片查看当前事实。"]
        : ["等待 Agent 运行观测", "当前 Host 尚未挂载 OpenQuantum Agent Preset。打开或创建一个 OpenQuantum 会话后再刷新。"];
      const observedAt = new Date(snapshot.observedAt).toLocaleString();
      return h("div", null,
        error ? h("p", { className: "oq-cap-error", role: "alert" }, error) : null,
        h("div", { className: "oq-runtime-summary" },
          h("div", null,
            h("strong", null, overall[0]),
            h("p", null, overall[1]),
            h("p", null, `被动观测 · ${snapshot.preset.id} · ${snapshot.preset.generationCount} 个 generation · ${observedAt}`),
          ),
          h("button", { type: "button", className: "oq-cap-button", disabled: busy, onClick: onRefresh }, busy ? "正在读取…" : "刷新状态"),
        ),
        h("div", { className: "oq-cap-grid" }, snapshot.checks.map((check) => {
          const copy = runtimeCheckCopy[check.id] ?? { title: check.id, code: check.scope, description: "当前 Runtime 的只读观测。" };
          const [label, tone] = runtimeCheckStatus(check);
          const groups = check.groups?.length
            ? ` · ${check.groups.length} 个 MCP Tool namespace`
            : "";
          const reason = runtimeReason(check);
          return h("article", { className: "oq-cap-card", key: check.id },
            h("div", { className: "oq-cap-card-head" },
              h("div", { className: "oq-cap-title" }, h("h3", null, copy.title), h("code", { className: "oq-cap-code" }, copy.code)),
              h("span", { className: "oq-cap-badge", "data-tone": tone }, label),
            ),
            h("p", { className: "oq-cap-desc" }, copy.description),
            h("p", { className: "oq-cap-meta" }, `${check.itemCount} 项当前 Registry 证据${groups}`),
            reason ? h("p", { className: "oq-cap-meta" }, `提示：${reason}`) : null,
            check.items.length ? h("details", { className: "oq-runtime-items" },
              h("summary", null, "查看已观测项目"),
              check.items.map((item) => h("code", { key: item.id }, item.label ? `${item.label} · ${item.id}` : item.id)),
            ) : null,
          );
        })),
        h("p", { className: "oq-runtime-limit" }, "检查边界：不会启动 MCP Server、执行 Tool、调用模型、访问量子云或读取凭据。Model Endpoint、MCP 连接和下游服务可达性本次均为 not_checked。"),
      );
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
          requiredByEnabled ? h("p", { className: "oq-cap-secret-help" }, "此凭据正被配置为启用的 MCP Server 必需使用；请先关闭对应连接配置再移除。") : null,
          h("div", { className: "oq-cap-actions" },
            h("button", { type: "button", className: "oq-cap-button", "data-primary": "true", disabled: locked || value.trim() === "", onClick: save }, "保存"),
            info?.configured ? h("button", { type: "button", className: "oq-cap-button", "data-danger": "true", disabled: locked || requiredByEnabled, onClick: remove }, "移除") : null,
          ),
        ),
      );
    }

    function CapabilitySettingsSection({ api, loopback }) {
      const [snapshot, setSnapshot] = React.useState(null);
      const [readiness, setReadiness] = React.useState(null);
      const [credentials, setCredentials] = React.useState({});
      const [tab, setTab] = React.useState("runtime");
      const [busy, setBusy] = React.useState(null);
      const [readinessBusy, setReadinessBusy] = React.useState(false);
      const [readinessError, setReadinessError] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [notice, setNotice] = React.useState(null);
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
        if (tab === "runtime" || snapshot !== null) return undefined;
        let current = true;
        setError(null);
        projectRequest({ action: "snapshot" }).then(async (next) => {
          if (!current) return;
          setSnapshot(next);
          await loadCredentials(next);
        }).catch((caught) => {
          if (current) setError(caught instanceof Error ? caught.message : "能力目录加载失败");
        });
        return () => { current = false; };
      }, [loadCredentials, snapshot, tab]);

      const refreshReadiness = React.useCallback(async () => {
        setReadinessBusy(true);
        setReadinessError(null);
        try {
          setReadiness(await readinessRequest());
        } catch (caught) {
          setReadinessError(caught instanceof Error ? caught.message : "运行状态读取失败");
        } finally {
          setReadinessBusy(false);
        }
      }, []);

      React.useEffect(() => { void refreshReadiness(); }, [refreshReadiness]);

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

      const disabled = busy !== null || !loopback;

      const mcpCards = snapshot ? snapshot.mcpServers.map((server) => {
        const [label, tone] = status(server, credentials);
        const enableBlocked = !server.enabled && (
          server.setup?.status === "required" ||
          server.requiredCredentialRefs.some((ref) => !credentials[ref]?.configured)
        );
        return h("article", { className: "oq-cap-card", key: server.serverName },
          h("div", { className: "oq-cap-card-head" },
            h("div", { className: "oq-cap-title" }, h("h3", null, server.displayName), h("code", { className: "oq-cap-code" }, `MCP Server · ${server.serverName} · ${server.provider}`)),
            h("span", { className: "oq-cap-badge", "data-tone": tone }, label),
          ),
          h("p", { className: "oq-cap-desc" }, server.description),
          h("p", { className: "oq-cap-meta" }, `独立 MCP Server 连接 · ${server.transport} · ${server.target}${server.packageVersion ? ` · ${server.packageVersion}` : ""}`),
          h("p", { className: "oq-cap-meta" }, "这里显示的是持久化连接配置，不代表 Server 已运行或 Tool 已进入 Registry；配置变更需重启后生效。"),
          h("div", { className: "oq-cap-actions" },
            h("label", { className: "oq-cap-switch" },
              h("input", { type: "checkbox", checked: server.enabled, disabled: disabled || enableBlocked, title: enableBlocked ? label : undefined, onChange: (event) => runProject(`mcp:${server.serverName}`, { action: "mcp.update", serverName: server.serverName, revision: snapshot.mcpRevision, enabled: event.currentTarget.checked, toolCallTimeoutMs: server.toolCallTimeoutMs, reconnect: server.reconnect }, "MCP Server 连接配置已保存；重启 OpenQuantum 后使用新配置。") }),
              server.enabled ? "配置启用" : "配置关闭",
            ),
            server.sourceUrl ? h("a", { className: "oq-cap-link", href: server.sourceUrl, target: "_blank", rel: "noreferrer" }, "源码") : null,
            server.managed ? h("button", { type: "button", className: "oq-cap-button", "data-danger": "true", disabled: disabled || server.enabled, onClick: () => runProject(`mcp:${server.serverName}`, { action: "mcp.remove", serverName: server.serverName, revision: snapshot.mcpRevision }, "自定义 MCP Server 连接已移入安全回收流程。") }, "移除") : null,
          ),
        );
      }) : [];

      const skillCards = snapshot ? snapshot.skills.map((skill) => h("article", { className: "oq-cap-card", key: skill.name },
        h("div", { className: "oq-cap-card-head" },
          h("div", { className: "oq-cap-title" }, h("h3", null, skill.displayName), h("code", { className: "oq-cap-code" }, `Skill · /${skill.name}`)),
          h("span", { className: "oq-cap-badge", "data-tone": skill.modelInvocable ? "configured" : "off" }, skill.modelInvocable ? "允许 Agent 自动加载" : "仅显式加载"),
        ),
        h("p", { className: "oq-cap-desc" }, skill.description),
        h("p", { className: "oq-cap-meta" }, `独立 Skill 指令 · ${[skill.version, skill.maturity].filter(Boolean).join(" · ") || "项目工作流"}`),
        h("div", { className: "oq-cap-actions" },
          h("label", { className: "oq-cap-switch" }, h("input", { type: "checkbox", checked: skill.modelInvocable, disabled, onChange: (event) => runProject(`skill:${skill.name}`, { action: "skill.update", name: skill.name, revision: skill.revision, modelInvocable: event.currentTarget.checked, userInvocable: skill.userInvocable }, "Skill 加载策略已保存，新会话生效。") }), "允许 Agent 自动加载"),
          skill.managed ? h("button", { type: "button", className: "oq-cap-button", "data-danger": "true", disabled, onClick: () => runProject(`skill:${skill.name}`, { action: "skill.remove", name: skill.name, revision: skill.revision }, "自定义 Skill 已移入项目回收目录。") }, "移除") : null,
        ),
      )) : [];

      const credentialCards = snapshot ? snapshot.mcpCredentials.map((credential) => h(CredentialCard, {
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
      })) : [];

      const createMcp = async (event) => {
        event.preventDefault();
        const stdio = mcpDraft.transport === "stdio";
        await runProject("mcp:register", { action: "mcp.register", revision: snapshot.mcpRevision, serverName: mcpDraft.serverName, transport: mcpDraft.transport, ...(stdio ? { command: mcpDraft.target, args: mcpDraft.args.split("\n").map((item) => item.trim()).filter(Boolean), ...(mcpDraft.credentialRef.trim() ? { credentialRef: mcpDraft.credentialRef.trim() } : {}) } : { url: mcpDraft.target }) }, "MCP Server 注册已保存并保持关闭；确认来源与配置后再启用。 ");
        setMcpDraft({ serverName: "", transport: "stdio", target: "", args: "", credentialRef: "" });
      };

      const activeCards = tab === "mcp" ? mcpCards : tab === "skills" ? skillCards : credentialCards;
      const tabIntro = tab === "runtime"
        ? ["当前运行状态", "来自当前 Harness Host 与已挂载 OpenQuantum Agent 的被动 Registry 证据；与持久化配置分开显示。"]
        : tab === "mcp"
        ? ["MCP Server 连接", "Harness MCP Client 独立连接和启停 Server，并把 MCP-exposed Tool 注册进 Tool Registry；它不加载 Skill。"]
        : tab === "skills"
        ? ["Skill 指令", "由 Harness Skill Registry 独立发现；向 Agent 提供知识和工作流，但不执行 Tool、启动 MCP Server 或读取凭据。"]
        : ["安全凭据", "凭据按引用提供给受控 Tool Provider；Skill 无权读取密钥，页面也不会回显已有值。"];
      return h("div", { className: "oq-cap-root" },
        tab !== "runtime" && !loopback ? h("p", { className: "oq-cap-error", role: "alert" }, "远程浏览器只读；请在 Harness 本机打开设置后写入凭据或配置。") : null,
        tab !== "runtime" && error ? h("p", { className: "oq-cap-error", role: "alert" }, error) : null,
        tab !== "runtime" && notice ? h("p", { className: "oq-cap-notice", role: "status" }, notice) : null,
        h("div", { className: "oq-cap-tabs", role: "tablist", "aria-label": "能力分类" },
          [["runtime", "运行状态"], ["mcp", "MCP Server 连接"], ["skills", "Skill 指令"], ["credentials", "安全凭据"]].map(([id, label]) => h("button", { key: id, type: "button", role: "tab", className: "oq-cap-tab", "aria-selected": tab === id, onClick: () => setTab(id) }, label)),
        ),
        h("div", { className: "oq-cap-tab-intro" }, h("strong", null, tabIntro[0]), h("span", null, tabIntro[1])),
        tab === "runtime"
          ? h(RuntimeReadinessPanel, { snapshot: readiness, busy: readinessBusy, error: readinessError, onRefresh: refreshReadiness })
          : !snapshot ? (error ? null : h("p", { className: "oq-cap-loading" }, "正在读取 Harness 能力目录…"))
          : activeCards.length ? h("div", { className: "oq-cap-grid" }, activeCards) : h("p", { className: "oq-cap-empty" }, "暂无能力配置。"),
        tab === "mcp" && snapshot ? h("details", { className: "oq-cap-group" },
          h("summary", null, "注册已有 MCP Server"),
          h("div", { className: "oq-cap-discovery" },
            h("p", null, "这里只向 Agent Preset 写入一条 Harness MCP Client 连接配置，不会下载、安装或创建 MCP Server。stdio 命令必须已在本机可用；HTTP 端点必须已经部署并经过审查。"),
          ),
          h("form", { className: "oq-cap-form", onSubmit: createMcp },
            h("div", { className: "oq-cap-field" }, h("label", null, "Server ID"), h("input", { className: "oq-cap-input", required: true, pattern: "[A-Za-z0-9_-]{1,32}", value: mcpDraft.serverName, onChange: (event) => setMcpDraft({ ...mcpDraft, serverName: event.currentTarget.value }) })),
            h("div", { className: "oq-cap-field" }, h("label", null, "传输"), h("select", { className: "oq-cap-select", value: mcpDraft.transport, onChange: (event) => setMcpDraft({ ...mcpDraft, transport: event.currentTarget.value }) }, h("option", { value: "stdio" }, "stdio"), h("option", { value: "streamable-http" }, "streamable-http"))),
            h("div", { className: "oq-cap-field oq-cap-span" }, h("label", null, mcpDraft.transport === "stdio" ? "已有 MCP 程序命令" : "已部署 MCP URL"), h("input", { className: "oq-cap-input", required: true, value: mcpDraft.target, placeholder: mcpDraft.transport === "stdio" ? "uvx" : "https://mcp.example.com/", onChange: (event) => setMcpDraft({ ...mcpDraft, target: event.currentTarget.value }) })),
            mcpDraft.transport === "stdio" ? h(React.Fragment, null,
              h("div", { className: "oq-cap-field" }, h("label", null, "参数（每行一项）"), h("textarea", { className: "oq-cap-textarea", value: mcpDraft.args, onChange: (event) => setMcpDraft({ ...mcpDraft, args: event.currentTarget.value }) })),
              h("div", { className: "oq-cap-field" }, h("label", null, "凭据引用（可选）"), h("input", { className: "oq-cap-input", pattern: "[A-Za-z_][A-Za-z0-9_]*", value: mcpDraft.credentialRef, placeholder: "EXAMPLE_API_KEY", onChange: (event) => setMcpDraft({ ...mcpDraft, credentialRef: event.currentTarget.value }) })),
            ) : null,
            h("div", { className: "oq-cap-span" }, h("button", { type: "submit", className: "oq-cap-button", "data-primary": "true", disabled }, "注册为关闭状态")),
          ),
        ) : null,
        tab === "skills" && snapshot ? h("details", { className: "oq-cap-group" },
          h("summary", null, "添加现有 Skill"),
          h("div", { className: "oq-cap-discovery" },
            h("p", null, "Skill 由 Harness 文件系统 Provider 从项目目录发现。简单 Skill 只需要一个带 frontmatter 的 SKILL.md；复杂 Skill 可以在同一目录附带 references、scripts 或其他资源。"),
            h("code", { className: "oq-cap-path" }, ".agents/skills/<skill-name>/SKILL.md"),
            h("p", null, "通过 Git、解压或手动复制把完整 Skill 目录加入项目，然后重新扫描。设置中心只管理发现后的加载策略，不在表单里创作 Skill。"),
            h("div", { className: "oq-cap-actions" },
              h("button", { type: "button", className: "oq-cap-button", disabled: busy !== null, onClick: reload }, "重新扫描 Skill 目录"),
            ),
          ),
        ) : null,
      );
    }

    function MessageChannelSettingsSection({ loopback }) {
      const [channel, setChannel] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);

      const reload = React.useCallback(async () => {
        setError(null);
        try {
          setChannel(await channelRequest({ action: "snapshot" }));
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "消息渠道状态读取失败");
        }
      }, []);

      React.useEffect(() => { void reload(); }, [reload]);

      const setup = async () => {
        setBusy(true);
        setError(null);
        try {
          setChannel(await channelRequest({ action: "setup" }));
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "消息渠道初始化失败");
        } finally {
          setBusy(false);
        }
      };

      if (!channel) return h("div", { className: "oq-cap-root" }, error ? h("p", { className: "oq-cap-error", role: "alert" }, error) : h("p", { className: "oq-cap-loading" }, "正在读取消息渠道状态…"));
      const stateLabel = channel.state === "running"
        ? "运行中"
        : channel.state === "configured"
        ? "待启动"
        : channel.state === "needs-platform"
        ? "待添加平台"
        : channel.state === "not-installed"
        ? "依赖未安装"
        : "未初始化";
      const stateTone = channel.state === "running" ? "ready" : "attention";
      const platforms = channel.platformTypes.length > 0
        ? `已配置：${channel.platformTypes.join("、")}`
        : "尚未添加消息平台，可在 CC Connect 管理后台配置。";
      return h("div", { className: "oq-cap-root" },
        !loopback ? h("p", { className: "oq-cap-error", role: "alert" }, "远程浏览器只读；消息渠道只能在 Harness 本机配置。") : null,
        error ? h("p", { className: "oq-cap-error", role: "alert" }, error) : null,
        h("article", { className: "oq-cap-card" },
          h("div", { className: "oq-cap-card-head" },
            h("div", { className: "oq-cap-title" }, h("h3", null, "CC Connect"), h("code", { className: "oq-cap-code" }, `ACP 消息桥 · ${channel.version}`)),
            h("span", { className: "oq-cap-badge", "data-tone": stateTone }, stateLabel),
          ),
          h("p", { className: "oq-cap-desc" }, "把 OpenQuantum 接入飞书、钉钉、企业微信、Slack、Telegram、Discord、QQ 和微信等消息平台。"),
          h("div", { className: "oq-channel-flow", "aria-label": "消息渠道调用链" },
            h("span", { className: "oq-channel-node" }, "消息平台"),
            h("span", { className: "oq-channel-arrow" }, "→"),
            h("span", { className: "oq-channel-node" }, "CC Connect"),
            h("span", { className: "oq-channel-arrow" }, "→ ACP →"),
            h("span", { className: "oq-channel-node" }, "DeepSeek Harness"),
            h("span", { className: "oq-channel-arrow" }, "→"),
            h("span", { className: "oq-channel-node" }, "Skill + Tool Provider + 可选 Validator"),
          ),
          h("p", { className: "oq-cap-meta" }, platforms),
          h("p", { className: "oq-cap-meta" }, `本地配置：${channel.configPath}。平台 Token 由 CC Connect 保存，不进入源码、Harness Session 或 Git。`),
          h("div", { className: "oq-channel-commands" },
            channel.platformTypes.length === 0 ? h("div", { className: "oq-channel-command" }, h("span", null, "快速添加第一个飞书渠道"), h("code", null, "npm run cc-connect:feishu")) : null,
            h("div", { className: "oq-channel-command" }, h("span", null, "启动消息服务"), h("code", null, channel.commands.start)),
            h("div", { className: "oq-channel-command" }, h("span", null, "打开带登录凭据的本地管理后台"), h("code", null, channel.commands.web)),
          ),
          h("div", { className: "oq-cap-actions" },
            !channel.configured ? h("button", { type: "button", className: "oq-cap-button", "data-primary": "true", disabled: busy || !loopback || !channel.installed, onClick: setup }, busy ? "正在初始化…" : "初始化本地配置") : null,
            channel.running ? h("a", { className: "oq-cap-link", href: channel.managementUrl, target: "_blank", rel: "noreferrer" }, "打开管理后台") : null,
            h("a", { className: "oq-cap-link", href: channel.sourceUrl, target: "_blank", rel: "noreferrer" }, "查看 CC Connect 源码"),
            h("button", { type: "button", className: "oq-cap-button", disabled: busy, onClick: reload }, "刷新状态"),
          ),
        ),
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
        inject: () => ({ api: connection.api, loopback: connection.isLoopback }),
      }, CapabilitySettingsSection));
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "openquantum-channels",
        order: 13,
        label: () => t("channelsNav"),
        locale: NS,
        inject: () => ({ loopback: connection.isLoopback }),
      }, MessageChannelSettingsSection));
    }

    pluginModule.exports.apply = apply;
    pluginModule.exports.inject = inject;
    return pluginModule.exports;
  },
});
