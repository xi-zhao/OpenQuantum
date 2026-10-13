import { App, applyHostStyleVariables, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import { openHostLink } from "./open-link.mjs";
import { credentialEntries, renderCredentialCards, clearCredentialDrafts, h } from "./credential-cards.mjs";
import { COMPONENT_TABS, COMPONENT_INTROS, COMPONENT_CHECKS, componentCard, componentCardCss } from "../../../src/settings/component-view.mjs";
import "./style.css";

const $ = selector => document.querySelector(selector);
const filterToolbar = $("#toolbar");
let snapshot, tab = "runtime", busy = false, app;
let stateRequests = Promise.resolve();
const connectionDraft = {};
const expandedGroups = new Map();
const componentStyle = document.createElement("style"); componentStyle.textContent = componentCardCss; document.head.append(componentStyle);
function t(key, params) {
  let value = snapshot?.components?.copy?.[key] ?? key;
  for (const [name, replacement] of Object.entries(params ?? {})) value = value.replaceAll(`{${name}}`, replacement);
  return value;
}
function skillEntries() { return snapshot.components?.skills ?? snapshot.skills; }
function mcpEntries() { return snapshot.components?.mcpServers ?? snapshot.providers; }
const preview = window.parent === window && ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) && location.hash.startsWith("#preview=");
const previewToken = preview ? location.hash.slice(9) : null;
if (preview) history.replaceState(null, "", location.pathname);
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function notice(message, error = false) { $("#notice").textContent = message; $("#notice").className = error ? "error" : ""; }
async function request(input) {
  if (preview) {
    const response = await fetch("/settings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${previewToken}` }, body: JSON.stringify(input) });
    const value = await response.json(); if (!response.ok) throw new Error(value.error); return value;
  }
  const result = await app.callServerTool({ name: "openquantum_settings", arguments: input });
  if (result.isError) throw new Error(result.content?.find(item => item.type === "text")?.text || "操作失败");
  const value = result._meta?.openquantumSettings;
  if (!value) throw new Error("宿主未返回设置数据，请检查插件版本");
  return value;
}
function updateSnapshot(input) {
  // Credential cards can save independently. Serialize every state response,
  // including commands and manual refresh, so an older read cannot win later.
  const next = stateRequests.catch(() => {}).then(async () => {
    snapshot = await request({ ...input, ...(snapshot && input.action !== "snapshot" ? { revision: snapshot.revision } : {}) });
  });
  stateRequests = next;
  return next;
}
async function run(input) {
  if (busy) return;
  busy = true;
  notice(input.action === "connection.test" ? "正在连接 MCP 并读取工具清单…" : "正在更新设置…");
  document.querySelectorAll("button,input,select,textarea").forEach(node => node.disabled = true);
  try {
    await updateSnapshot(input);
    if (input.action === "connection.add") for (const key of Object.keys(connectionDraft)) delete connectionDraft[key];
    notice(input.action === "snapshot" ? (tab === "credentials" ? "" : snapshot.notice) : "设置已保存。" + snapshot.notice);
  }
  catch (error) { notice(error.message, true); }
  finally { busy = false; document.querySelectorAll("button,input,select,textarea").forEach(node => node.disabled = false); render(); }
}
function switchFor(checked, label, action, { disabled = false, text } = {}) {
  const node = element("label", undefined, "switch");
  const input = element("input"); input.type = "checkbox"; input.checked = checked; input.setAttribute("aria-label", label);
  input.disabled = disabled;
  input.onchange = () => run({ ...action, enabled: input.checked }); node.append(input, element("span", text ?? (checked ? "配置启用" : "配置关闭"))); return node;
}
function button(text, action, className) { const node = element("button", text, className); node.type = "button"; node.onclick = action; return node; }
function categories() { return snapshot.categories ?? [{ id: "other", title: "其他与自定义" }]; }
function categoryOf(item) { return categories().some(category => category.id === item.category) ? item.category : "other"; }
function searchText(item) {
  return [item.title, t(item.title ?? ""), item.id, item.description, t(item.description ?? ""), item.provider, item.url, item.command,
    ...(item.serverNames ?? []),
    ...(item.fields ?? []).flatMap(field => [field.name, field.title, field.displayName]),
    ...(item.tools ?? []).flatMap(tool => typeof tool === "string" ? [tool] : [tool.name, tool.title, tool.description]),
    categories().find(value => value.id === categoryOf(item))?.title].filter(Boolean).join(" ").normalize("NFKC").toLowerCase();
}
function matches(item) {
  const query = $("#search").value.trim().normalize("NFKC").toLowerCase();
  const state = $("#state").value;
  return query.split(/\s+/).every(word => searchText(item).includes(word))
    && (state === "all" || (state === "unsupported" ? item.supported === false || item.configuration === "unsupported" : ["enabled", "disabled"].includes(state) ? item.enabled === (state === "enabled") : item.configuration === state))
    && ($("#category").value === "all" || categoryOf(item) === $("#category").value);
}
function categoryGroups(container, items, renderItem, scope = tab) {
  const filtered = items.filter(item => matches(item));
  for (const category of categories()) {
    const entries = filtered.filter(item => categoryOf(item) === category.id);
    if (!entries.length) continue;
    const group = element("details", undefined, "category-group");
    const key = [scope, $("#search").value.trim(), $("#category").value, $("#state").value, category.id].join("|");
    group.open = expandedGroups.get(key) ?? Boolean($("#search").value.trim() || $("#category").value !== "all" || $("#state").value !== "all");
    group.ontoggle = () => { if (group.isConnected) expandedGroups.set(key, group.open); };
    const summary = element("summary");
    summary.append(element("strong", t(category.title)), element("span", tab === "skills" ? `${entries.length} 项` : `${entries.length} 项 · ${entries.filter(item => item.enabled).length} 项配置启用`, "hint"));
    const grid = element("div", undefined, "oq-cap-grid");
    for (const item of entries) grid.append(renderItem(item));
    group.append(summary, grid); container.append(group);
  }
  return filtered.length;
}
function renderSkills(container) {
  categoryGroups(container, skillEntries(), skill => {
    const supported = skill.supported !== false;
    const actions = element("div", undefined, "oq-cap-actions");
    actions.append(switchFor(skill.enabled, t("允许 Agent 自动加载"), { action: "skill.set", id: skill.id }, { disabled: !supported, text: t("允许 Agent 自动加载") }));
    return componentCard(h, { title: skill.title, code: `Skill · /${skill.id}`, description: skill.description, t,
      label: !supported ? "当前宿主未接入" : skill.enabled ? t("允许 Agent 自动加载") : "配置关闭",
      meta: t("独立 Skill 指令 · {p0}", { p0: [skill.version, skill.maturity].filter(Boolean).join(" · ") || t("项目工作流") }),
      note: skill.availabilityNote, actions,
    });
  });
  const add = element("details", undefined, "add-connection");
  add.append(element("summary", t("添加现有 Skill")), element("p", "自定义 Skill 由 Codex 原生 Skills 设置管理。本页目录随 OpenQuantum 插件更新。", "hint"));
  container.append(add);
}
function renderTools(container) {
  container.append(element("p", "内置工具按用途分组；新增 MCP 的工具在对应连接下管理。", "hint"));
  const nativeProviders = snapshot.providers.filter(provider => provider.id.startsWith("native:"));
  if (nativeProviders.length) {
    const native = element("details", undefined, "technical-details");
    native.open = expandedGroups.get("native-providers") ?? false;
    native.ontoggle = () => { if (native.isConnected) expandedGroups.set("native-providers", native.open); };
    native.append(element("summary", "原生工具服务开关"));
    for (const provider of nativeProviders) {
      const row = element("div", undefined, "tool-row");
      row.append(element("strong", provider.title), switchFor(provider.enabled, `${provider.title} 启用`, { action: "provider.set", id: provider.id })); native.append(row);
    }
    container.append(native);
  }
  categoryGroups(container, snapshot.tools, tool => {
    const card = element("article", undefined, "card"); const top = element("div", undefined, "card-top");
    top.append(element("h2", tool.title), switchFor(tool.enabled, `${tool.title} 启用`, { action: "tool.set", id: tool.id }));
    const provider = snapshot.providers.find(item => item.id === tool.provider);
    card.append(top, element("p", tool.description, "description"), element("span", provider?.enabled ? (tool.readOnly ? "只读计算或查询" : "可能产生写入") : "所属连接已关闭", `badge ${provider?.enabled ? "" : "warning"}`));
    if (provider?.service) card.append(button("查看服务配置", () => showService(provider.service), "text-button"));
    return card;
  });
}
async function openCredential(id, container, service = false) {
  if (busy) return;
  busy = true;
  try {
    const { url } = await request({ action: service ? "service.credentials.open" : "credentials.open", id });
    container.querySelector(".credential-window")?.remove();
    const panel = element("div", undefined, "credential-window");
    const link = element("a", "打开本机凭据窗口", "credential-link"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
    const label = element("label", "窗口未打开时，复制本机地址到浏览器：");
    const address = element("input"); address.type = "text"; address.readOnly = true; address.value = url;
    address.setAttribute("aria-label", "本机凭据窗口地址"); address.onclick = () => address.select(); label.append(address);
    panel.append(link, label, element("p", "地址 10 分钟内有效。保存后返回这里刷新状态。", "hint"), button("我已保存，刷新状态", () => run({ action: "snapshot" })));
    container.append(panel);
    const open = async () => {
      try {
        await openHostLink(app, url);
        notice("已请求打开本机凭据窗口。若没有弹出，请复制卡片中的地址到浏览器。");
      } catch { notice("未能打开本机凭据窗口，请复制卡片中的地址到浏览器继续。", true); }
    };
    link.onclick = async event => { if (!preview) { event.preventDefault(); await open(); } };
    if (!preview) await open();
    else {
      window.open(url, "_blank", "noopener,noreferrer");
      notice("请在本机凭据窗口保存；若没有弹出，请复制卡片中的地址到浏览器。");
    }
  } catch (error) { notice(error.message, true); }
  finally { busy = false; }
}
function setTab(value) {
  if (tab === "credentials" && value !== tab) clearCredentialDrafts();
  if (!COMPONENT_TABS.some(([id]) => id === value)) return;
  tab = value;
  document.querySelectorAll("[data-tab]").forEach(node => { node.classList.toggle("active", node.dataset.tab === tab); node.setAttribute("aria-selected", String(node.dataset.tab === tab)); });
  $("#state").value = "all"; $("#category").value = "all"; $("#search").value = "";
  notice("");
  render();
}
function showCredentials(id) { setTab("credentials"); $("#search").value = id; render(); $("#toolbar").scrollIntoView({ block: "start" }); }
function showService(id) { setTab("mcp"); $("#search").value = id; render(); $("#toolbar").scrollIntoView({ block: "start" }); }
function renderRuntime(container) {
  const summary = element("div", undefined, "runtime-summary");
  summary.append(element("strong", "组件配置已读取"), element("p", "查看 OpenQuantum 在当前 Codex 中提供的组件；配置状态和实际运行分别显示。", "hint"));
  container.append(summary);
  const grid = element("div", undefined, "oq-cap-grid");
  const skills = snapshot.skills.filter(skill => skill.enabled);
  const tools = snapshot.tools.filter(tool => tool.enabled && snapshot.providers.some(provider => provider.id === tool.provider && provider.enabled));
  const cards = [
    ["model-routes", "由 Codex 管理", "用于理解需求和生成回答。模型与账户由 Codex 当前对话管理。", null],
    ["skill-registry", `${skills.length} 项配置启用`, "帮助助手选择研究方法、安排计算步骤。当前聊天是否加载需在 Codex 中确认。", button("查看 Skills", () => setTab("skills"))],
    ["tool-registry", `${tools.length} 项工具开放`, "供会话调用的计算与辅助工具。已列入插件工具目录，实际连接在使用时确认。", null],
  ];
  for (const [id, label, description, actions] of cards) grid.append(componentCard(h, { title: COMPONENT_CHECKS[id].title, label, description, actions, t }));
  container.append(grid);
  const toolsPanel = element("details", undefined, "runtime-tools");
  const key = "runtime-tools";
  toolsPanel.open = expandedGroups.get(key) ?? Boolean($("#search").value.trim() || $("#category").value !== "all" || $("#state").value !== "all");
  toolsPanel.ontoggle = () => { if (toolsPanel.isConnected) expandedGroups.set(key, toolsPanel.open); };
  toolsPanel.append(element("summary", "Tools · 查看与配置工具"));
  toolsPanel.append(filterToolbar);
  renderTools(toolsPanel); container.append(toolsPanel);
  const diagnostic = element("details", undefined, "technical-details");
  diagnostic.append(element("summary", t("诊断详情")), element("p", `读取时间：${new Date(snapshot.observedAt).toLocaleString()}。范围：当前用户的 OpenQuantum 插件。`, "hint"),
    element("p", "Skills 显示持久化加载配置；Tools 显示插件开放的工具目录。Codex 模型、当前聊天加载状态、MCP 实际连通和账户认证均未在此测试。", "hint"));
  container.append(diagnostic);
}
function renderMcp(container) {
  const form = element("form", undefined, "card"); form.append(element("h2", "添加 MCP 连接"));
  const fields = element("div", undefined, "form-grid"); const inputs = {};
  const field = (name, title, kind, options) => {
    const label = element("label", title); const input = element(kind || "input"); input.name = name;
    if (options) for (const [value, title] of options) { const option = element("option", title); option.value = value; input.append(option); }
    if (name === "args") label.className = "wide";
    if (connectionDraft[name] !== undefined) input.value = connectionDraft[name];
    input.addEventListener("input", () => connectionDraft[name] = input.value);
    label.append(input); fields.append(label); inputs[name] = input; return input;
  };
  field("id", "连接名称（英文字母、数字或下划线）");
  field("transport", "连接方式", "select", [["http", "HTTP"], ["stdio", "本机 stdio"]]);
  field("target", "服务地址 / 本机启动命令");
  field("authentication", "认证方式", "select", [["none", "无需 Token"], ["token", "Token"]]);
  field("tokenEnv", "stdio 接收 Token 的环境变量名");
  field("args", "stdio 启动参数（每行一个，不填写密钥）", "textarea");
  const updateFields = () => {
    const stdio = inputs.transport.value === "stdio";
    inputs.args.parentElement.hidden = !stdio;
    inputs.tokenEnv.parentElement.hidden = !stdio || inputs.authentication.value !== "token";
  };
  inputs.transport.onchange = updateFields;
  inputs.authentication.onchange = updateFields;
  updateFields();
  const submit = element("button", "添加连接", "primary"); submit.type = "submit";
  form.append(fields, element("p", "添加后默认关闭。Token 在添加后通过系统凭据库保存。", "hint"), submit);
  form.onsubmit = event => {
    event.preventDefault(); const value = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value.trim()]));
    run({ action: "connection.add", connection: { id: value.id, transport: value.transport, authentication: value.authentication,
      ...(value.transport === "http" ? { url: value.target } : { command: value.target, args: value.args ? value.args.split("\n").filter(Boolean) : [], ...(value.authentication === "token" ? { tokenEnv: value.tokenEnv } : {}) }) } });
  };
  const add = element("details", undefined, "add-connection"); add.append(element("summary", t("注册已有 MCP Server")), form);
  add.open = Object.values(connectionDraft).some(Boolean);
  if (mcpEntries().some(server => matches(server))) container.append(element("h2", "MCP", "section-title"));
  categoryGroups(container, mcpEntries(), server => {
    const supported = server.supported !== false;
    const label = !supported ? "当前宿主未接入" : server.requiredCredentialsMissing ? "需要凭据" : server.enabled ? t("连接配置启用") : t("连接配置关闭");
    const details = element("details", undefined, "oq-cap-details");
    details.append(element("summary", t("连接详情与超时")),
      element("p", `${server.transport ?? "stdio"} · ${server.target ?? server.id}${server.packageVersion ? " · " + server.packageVersion : ""}`, "oq-cap-meta"));
    if (supported) details.append(element("p", "单次调用超时：180000 毫秒。较长的自定义计算请使用宿主代码工具。", "oq-cap-meta"));
    const actions = element("div", undefined, "oq-cap-actions");
    actions.append(switchFor(server.enabled, t(server.title), { action: "provider.set", id: server.id }, { disabled: !supported }));
    if (server.service) actions.append(button("服务密钥", () => showCredentials(server.service)));
    if (server.sourceUrl) {
      const source = element("a", t("源码"), "oq-cap-link"); source.href = server.sourceUrl; source.target = "_blank"; source.rel = "noopener noreferrer";
      source.onclick = event => { if (!preview) { event.preventDefault(); void openHostLink(app, source.href).catch(() => notice(`未能打开源码：${source.href}`, true)); } }; actions.append(source);
    }
    if (server.tools?.length) {
      const toolList = element("details", undefined, "oq-cap-details");
      toolList.append(element("summary", `Tools（${server.tools.length}）`));
      for (const tool of server.tools) {
        const row = element("div", undefined, "tool-row"), info = element("div");
        info.append(element("strong", tool.title), element("p", tool.description, "hint"));
        row.append(info, switchFor(tool.enabled, `${tool.title} 启用`, { action: "tool.set", id: tool.id })); toolList.append(row);
      }
      details.append(toolList);
    }
    return componentCard(h, { title: server.title, code: `MCP Server · ${server.id} · ${server.provider ?? "OpenQuantum"}`, description: server.description, label, t,
      note: server.availabilityNote, details, actions,
    });
  }, "builtin-mcp");
  if (snapshot.connections.some(connection => matches(connection))) container.append(element("h2", "我的 MCP 连接", "section-title"));
  if (!snapshot.connections.length && !$("#search").value.trim() && $("#category").value === "all" && $("#state").value === "all") container.append(element("p", "还没有自定义连接。内置量子工具可直接使用。", "hint"));
  categoryGroups(container, snapshot.connections, connection => {
    const card = element("article", undefined, "card connection"); const top = element("div", undefined, "card-top");
    top.append(element("h2", connection.id), switchFor(connection.enabled, `${connection.id} 启用`, { action: "connection.set", id: connection.id }));
    card.append(top, element("p", connection.url || connection.command, "description"), element("p", connection.status.message, "hint"));
    if (connection.authentication === "token") card.append(element("span", connection.credential.unavailable ? "凭据库不可用" : connection.credential.configured ? "Token 已配置" : "需要 Token", "badge"));
    const actions = element("div", undefined, "actions");
    actions.append(button("测试连接", () => run({ action: "connection.test", id: connection.id })));
    if (connection.authentication === "token") actions.append(button("配置 Token", () => openCredential(connection.id, actions)));
    actions.append(button("移除连接", () => run({ action: "connection.remove", id: connection.id }), "danger")); card.append(actions);
    const toolList = element("details"); toolList.append(element("summary", `Tools（${connection.tools.length}）`));
    toolList.open = Boolean($("#search").value.trim());
    for (const tool of connection.tools) {
      const row = element("div", undefined, "tool-row"); const info = element("div"); info.append(element("strong", tool.title || tool.name), element("p", tool.description, "hint"));
      row.append(info, switchFor(tool.enabled, `${connection.id} ${tool.name} 启用`, { action: "connection.tool.set", id: connection.id, tool: tool.name })); toolList.append(row);
    }
    if (connection.tools.length) card.append(toolList);
    return card;
  }, "custom-connections");
  container.append(add);
}
function render() {
  if (!snapshot) return;
  // Keep the same filter controls alive while moving them into the Tools panel.
  // Returning them before replacing content also preserves their event handlers.
  $("#notice").before(filterToolbar);
  const intro = COMPONENT_INTROS[tab];
  $("#page-title").textContent = t(intro[0]);
  $("#page-description").textContent = t(intro[1]) + (tab === "credentials" ? "语言模型的密钥由 Codex 管理。" : "");
  $("#search").placeholder = tab === "credentials" ? "搜索服务、Token 名称或用途" : tab === "runtime" ? "搜索工具名称或用途" : t("搜索名称或用途");
  const items = tab === "credentials" ? credentialEntries(snapshot.services ?? []) : tab === "skills" ? skillEntries() : tab === "runtime" ? snapshot.tools : [...snapshot.connections, ...mcpEntries()];
  const states = [["all", "全部状态"], ["enabled", "配置启用"], ["disabled", "配置关闭"]];
  if (["skills", "mcp"].includes(tab)) states.push(["unsupported", "当前宿主未接入"]);
  if (tab === "credentials") states.splice(1, 2, ["incomplete", "未配置"], ["configured", "已配置"], ["unavailable", "未读取"], ["unsupported", "需单独配置"]);
  const selectedState = $("#state").value;
  $("#state").replaceChildren(...states.map(([value, label]) => { const option = element("option", label); option.value = value; return option; }));
  $("#state").value = states.some(([value]) => value === selectedState) ? selectedState : "all";
  const selected = $("#category").value || "all";
  const all = element("option", "全部用途"); all.value = "all";
  $("#category").replaceChildren(all);
  for (const category of categories()) {
    const total = items.filter(item => categoryOf(item) === category.id).length;
    if (!total && selected !== category.id) continue;
    const option = element("option", `${t(category.title)} (${total})`); option.value = category.id; $("#category").append(option);
  }
  $("#category").value = selected;
  $("#count").textContent = `${t("显示 {p0} / {p1} 项", { p0: items.filter(item => matches(item)).length, p1: items.length })}`;
  const content = $("#content"); content.replaceChildren();
  if (tab === "credentials") {
    renderCredentialCards(content, items.filter(matches), {
      request, notice, refresh: async () => { try { await updateSnapshot({ action: "snapshot" }); } finally { render(); } },
      openLink: async url => { try { if (preview) window.open(url, "_blank", "noopener,noreferrer"); else await openHostLink(app, url); } catch { notice(`未能打开文档：${url}`, true); } },
      fallback: (id, card) => openCredential(id, card, true),
    });
  } else if (tab === "runtime") renderRuntime(content); else if (tab === "skills") renderSkills(content); else renderMcp(content);
  if (!items.some(item => matches(item))) {
    const empty = element("div", undefined, "empty");
    empty.append(element("p", "没有匹配的能力"), button("清除筛选", () => { $("#search").value = ""; $("#category").value = "all"; $("#state").value = "all"; render(); }));
    content.append(empty);
  }
}
document.querySelectorAll("[data-tab]").forEach(node => node.onclick = () => setTab(node.dataset.tab));
$("#search").oninput = render;
$("#category").onchange = render;
$("#state").onchange = render;
$("#refresh").onclick = () => run({ action: "snapshot" });
const githubLink = $("#github-link");
githubLink.onclick = async event => {
  if (preview) return;
  event.preventDefault();
  try {
    await openHostLink(app, githubLink.href);
  } catch {
    notice(`未能打开 GitHub，请在浏览器访问：${githubLink.href}`, true);
  }
};
try {
  if (!preview) {
    app = new App({ name: "OpenQuantum Settings", version: "__RELEASE_VERSION__" });
    const theme = context => { if (context?.theme) applyDocumentTheme(context.theme); if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables); };
    app.onhostcontextchanged = theme;
    await app.connect(); theme(app.getHostContext());
  }
  await run({ action: "snapshot" });
} catch (error) { notice(error.message, true); }
