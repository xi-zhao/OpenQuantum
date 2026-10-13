// One presentation contract for Desktop and the Codex sidebar. Hosts own IO,
// current state and supported actions; these functions only render content.
export const COMPONENT_TABS = Object.freeze([
  ["runtime", "运行状态"], ["mcp", "MCP Server 连接"],
  ["skills", "Skill 指令"], ["credentials", "安全凭据"],
]);

export const COMPONENT_INTROS = Object.freeze({
  runtime: ["当前运行状态", "来自当前 Harness Host 与已挂载 OpenQuantum Agent 的被动 Registry 证据；与持久化配置分开显示。"],
  mcp: ["MCP Server 连接", "Harness MCP Client 独立连接和启停 Server，并把 MCP-exposed Tool 注册进 Tool Registry；它不加载 Skill。"],
  skills: ["Skill 指令", "由 Harness Skill Registry 独立发现；向 Agent 提供知识和工作流，但不执行 Tool、启动 MCP Server 或读取凭据。"],
  credentials: ["安全凭据", "凭据按引用提供给受控 Tool Provider；Skill 无权读取密钥，页面也不会回显已有值。"],
});

export const COMPONENT_CHECKS = Object.freeze({
  "model-routes": { title: "模型路由", description: "当前 Host 已注册的模型 Adapter Route；不发送模型请求，也不检查 Endpoint 或鉴权。" },
  "skill-registry": { title: "Skill 指令", description: "当前已挂载 OpenQuantum Agent scope 中发现的 Skill；Snapshot 不返回或展示 Skill 正文。" },
  "tool-registry": { title: "计算工具", description: "当前 Agent scope 中可见的 Tool schema；Tool 已注册不等于 MCP Server 此刻在线。" },
});

export function componentCard(h, { key, title, code, description, meta, label, tone = "off", details, actions, note, t = key => key }) {
  return h("article", { key, className: "oq-cap-card", "aria-label": t(title) },
    h("div", { className: "oq-cap-card-head" },
      h("div", { className: "oq-cap-title" }, h("h3", null, t(title)), code ? h("code", { className: "oq-cap-code" }, code) : null),
      h("span", { className: "oq-cap-badge", "data-tone": tone }, label)),
    h("p", { className: "oq-cap-desc" }, t(description ?? "")),
    meta ? h("p", { className: "oq-cap-meta" }, meta) : null,
    note ? h("p", { className: "oq-cap-meta" }, note) : null,
    details ?? null, actions ?? null,
  );
}

export const componentCardCss = `
.oq-cap-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.oq-cap-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;min-width:0}
.oq-cap-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.oq-cap-title{min-width:0}.oq-cap-title h3{font-size:14px;line-height:20px;margin:0;overflow-wrap:anywhere}
.oq-cap-code{color:var(--dsw-alias-label-tertiary);display:block;font-family:var(--ds-font-family-code,monospace);font-size:10px;line-height:17px;overflow-wrap:anywhere}
.oq-cap-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:19px;margin:9px 0}
.oq-cap-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;margin:0;overflow-wrap:anywhere}
.oq-cap-badge{background:var(--dsw-alias-bg-module-platform);border-radius:999px;color:var(--dsw-alias-label-secondary);font-size:10px;padding:3px 7px;white-space:nowrap}
.oq-cap-badge[data-tone=ready]{color:var(--dsw-alias-state-success-primary)}
.oq-cap-actions{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:11px}
.oq-cap-details{margin:10px 0}.oq-cap-details>summary{font-size:11px;color:var(--dsw-alias-label-tertiary);cursor:pointer}.oq-cap-details[open]>summary{margin-bottom:8px}
@media(max-width:700px){.oq-cap-grid{grid-template-columns:1fr}}
`;
