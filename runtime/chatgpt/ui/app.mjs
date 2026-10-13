import { App, applyHostStyleVariables, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import { openHostLink } from "./open-link.mjs";
import { credentialEntries, renderCredentialCards, clearCredentialDrafts } from "./credential-cards.mjs";
import "./style.css";

const $ = selector => document.querySelector(selector);
let snapshot, tab = "credentials", busy = false, app;
let stateRequests = Promise.resolve();
const connectionDraft = {};
const expandedGroups = new Map();
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
function switchFor(checked, label, action) {
  const node = element("label", undefined, "switch");
  const input = element("input"); input.type = "checkbox"; input.checked = checked; input.setAttribute("aria-label", label);
  input.onchange = () => run({ ...action, enabled: input.checked }); node.append(input, element("span", checked ? "已启用" : "已关闭")); return node;
}
function button(text, action, className) { const node = element("button", text, className); node.type = "button"; node.onclick = action; return node; }
function categories() { return snapshot.categories ?? [{ id: "other", title: "其他与自定义" }]; }
function categoryOf(item) { return categories().some(category => category.id === item.category) ? item.category : "other"; }
function searchText(item) {
  return [item.title, item.id, item.description, item.provider, item.url, item.command,
    ...(item.serverNames ?? []),
    ...(item.fields ?? []).flatMap(field => [field.name, field.title, field.displayName]),
    ...(item.tools ?? []).flatMap(tool => typeof tool === "string" ? [tool] : [tool.name, tool.title, tool.description]),
    categories().find(value => value.id === categoryOf(item))?.title].filter(Boolean).join(" ").normalize("NFKC").toLowerCase();
}
function matches(item) {
  const query = $("#search").value.trim().normalize("NFKC").toLowerCase();
  const state = $("#state").value;
  return query.split(/\s+/).every(word => searchText(item).includes(word))
    && (state === "all" || (["enabled", "disabled"].includes(state) ? item.enabled === (state === "enabled") : item.configuration === state))
    && ($("#category").value === "all" || categoryOf(item) === $("#category").value);
}
function categoryGroups(container, items, renderItem, scope = tab) {
  const filtered = items.filter(item => matches(item));
  for (const category of categories()) {
    const entries = filtered.filter(item => categoryOf(item) === category.id);
    if (!entries.length) continue;
    const group = element("details", undefined, "category-group");
    const key = [scope, $("#search").value.trim(), $("#category").value, $("#state").value, category.id].join("|");
    group.open = expandedGroups.get(key) ?? Boolean(tab === "services" || $("#search").value.trim() || $("#category").value !== "all" || $("#state").value !== "all");
    group.ontoggle = () => { if (group.isConnected) expandedGroups.set(key, group.open); };
    const summary = element("summary");
    summary.append(element("strong", category.title), element("span", tab === "services" ? `${entries.length} 个服务` : `${entries.length} 项 · ${entries.filter(item => item.enabled).length} 项配置启用`, "hint"));
    const grid = element("div", undefined, "grid");
    for (const item of entries) grid.append(renderItem(item));
    group.append(summary, grid); container.append(group);
  }
  return filtered.length;
}
function renderSkills(container) {
  categoryGroups(container, snapshot.skills, skill => {
    const card = element("article", undefined, "card"); const top = element("div", undefined, "card-top");
    top.append(element("h2", skill.title), switchFor(skill.enabled, `${skill.title} 启用`, { action: "skill.set", id: skill.id }));
    const unavailable = skill.tools.filter(name => { const tool = snapshot.tools.find(item => item.id === name); return !tool?.enabled || !snapshot.providers.find(item => item.id === tool.provider)?.enabled; });
    card.append(top, element("p", skill.description, "description"), element("span", skill.tools.length ? `${skill.tools.length} 个关联 Tool` : "知识与方法 Skill", "badge"));
    if (unavailable.length) card.append(element("p", `部分关联工具未启用：${unavailable.join("、")}`, "hint"));
    const service = snapshot.services?.find(service => service.capability === skill.id);
    if (service) card.append(button("查看服务配置", () => showService(service.id), "text-button"));
    return card;
  });
}
function renderTools(container) {
  container.append(element("p", "内置工具按用途分组；新增 MCP 的工具在对应连接下管理。", "hint"));
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
  tab = value;
  document.querySelectorAll("[data-tab]").forEach(node => { node.classList.toggle("active", node.dataset.tab === tab); node.setAttribute("aria-pressed", String(node.dataset.tab === tab)); });
  $("#state").value = "all"; $("#category").value = "all"; $("#search").value = "";
  notice("");
  render();
}
function showCredentials(id) { setTab("credentials"); $("#search").value = id; render(); $("#toolbar").scrollIntoView({ block: "start" }); }
function showService(id) { setTab("services"); $("#search").value = id; render(); $("#toolbar").scrollIntoView({ block: "start" }); }
function serviceState(service) {
  if (!service.supported) return service.id === "pasqal_cloud" ? "通过 SDK 配置" : "尚未接入 Codex";
  if (service.configuration === "unavailable") return "凭据库不可用";
  if (service.configuration === "incomplete") return `待配置 · 缺 ${service.missing.length} 项`;
  return service.fields.some(field => field.configured) ? "配置已保存 · 认证未验证" : "凭据按需配置";
}
function renderServices(container) {
  const steps = element("ol", undefined, "setup-steps");
  for (const [title, note] of [["选择服务", "查看它能完成什么"], ["配置账户", "安全填写 Token 或账号"], ["启用工具", "选择允许使用的功能"]]) {
    const step = element("li"); step.append(element("strong", title), element("span", note)); steps.append(step);
  }
  container.append(steps, element("p", "配置保存在本机。保存后不会自动验证账户或提交任务；无需账户的本地功能可以直接启用。", "hint"));
  const renderService = service => {
    const card = element("article", undefined, "card service"), top = element("div", undefined, "card-top");
    top.append(element("h2", service.title));
    if (service.supported) top.append(switchFor(service.enabled, `${service.title} 服务启用`, { action: "provider.set", id: service.id }));
    card.append(top, element("p", service.description, "description"), element("span", serviceState(service), `badge ${service.configuration === "configured" ? "" : "warning"}`));
    if (service.availabilityNote) card.append(element("p", service.availabilityNote, "hint"));
    const fields = element("dl", undefined, "credential-fields");
    for (const field of service.fields) {
      const name = element("dt", field.title);
      const status = !service.supported ? (field.required ? "需要配置" : "按需提供") : service.configuration === "unavailable" ? "未读取" : field.configured ? "已保存" : field.required || service.missing.includes(field.name) ? "未配置" : "可选";
      fields.append(name, element("dd", status, field.configured ? "saved" : ""));
    }
    card.append(fields);
    const actions = element("div", undefined, "actions");
    if (service.supported) actions.append(button("配置服务密钥", () => showCredentials(service.id), "primary"));
    const docs = element("a", "如何获取凭据 ↗", "credential-link"); docs.href = service.documentationUrl; docs.target = "_blank"; docs.rel = "noopener noreferrer";
    docs.onclick = async event => { if (!preview) { event.preventDefault(); try { await openHostLink(app, docs.href); } catch { notice(`未能打开文档，请访问：${docs.href}`, true); } } };
    actions.append(docs); card.append(actions);
    if (service.supported) {
      const details = element("details");
      const key = `service-tools-${service.id}`;
      details.open = expandedGroups.get(key) ?? false;
      details.ontoggle = () => { if (details.isConnected) expandedGroups.set(key, details.open); };
      details.append(element("summary", `选择要启用的工具 · ${service.tools.filter(tool => tool.enabled).length}/${service.tools.length} 已开启`));
      details.append(element("p", "先打开服务开关，再选择所需功能。依赖环境未准备时，工具会提示安装步骤。", "hint"));
      for (const tool of service.tools) {
        const row = element("div", undefined, "tool-row"), info = element("div");
        info.append(element("strong", tool.title));
        const explanation = element("details");
        explanation.append(element("summary", "查看工具说明"), element("p", tool.description, "hint"));
        info.append(explanation);
        row.append(info, switchFor(tool.enabled, `${tool.title} 启用`, { action: "tool.set", id: tool.id })); details.append(row);
      }
      card.append(details);
    }
    const technical = element("details", undefined, "technical-details");
    technical.append(element("summary", "查看配置变量"));
    for (const field of service.fields) {
      const row = element("p", field.title + "：", "hint"); row.append(element("code", field.name)); technical.append(row);
    }
    card.append(technical);
    return card;
  };
  for (const [supported, title, note] of [[true, "可在这里配置", "账户配置、服务开关和工具选择都在对应卡片中。"], [false, "需要单独配置", "以下服务使用外部连接或 SDK 认证，本页说明所需配置和当前支持范围。"]]) {
    const services = (snapshot.services ?? []).filter(service => service.supported === supported && matches(service));
    if (!services.length) continue;
    container.append(element("h2", title, "section-title"), element("p", note, "hint"));
    const grid = element("div", undefined, "grid services-grid");
    services.forEach(service => grid.append(renderService(service))); container.append(grid);
  }
}
function renderConnections(container) {
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
  const add = element("details", undefined, "add-connection"); add.append(element("summary", "添加 MCP 连接"), form);
  add.open = Object.values(connectionDraft).some(Boolean);
  container.append(add);
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
  if (snapshot.providers.some(provider => matches(provider))) container.append(element("h2", "内置工具服务", "section-title"));
  categoryGroups(container, snapshot.providers, provider => {
    const row = element("article", undefined, "card provider");
    const info = element("div", provider.title);
    if (provider.service) info.append(button("配置服务与凭据", () => showService(provider.service), "text-button"));
    row.append(info, switchFor(provider.enabled, `${provider.title} 启用`, { action: "provider.set", id: provider.id }));
    return row;
  }, "providers");
}
function render() {
  if (!snapshot) return;
  const descriptions = {
    credentials: ["服务密钥", "管理工具服务需要的 API Key 或 Token。已有密钥不会显示；语言模型的密钥由 Codex 管理。"],
    services: ["服务概览", "查看各项服务还缺哪些配置，并选择允许使用的研究工具。"],
    connections: ["MCP 连接", "管理内置服务和自行添加的 MCP 连接。启用连接后，选择需要开放的工具。"],
    skills: ["Skills", "按研究用途选择知识与工作流。关联工具需要在服务或 Tools 中启用。"],
    tools: ["Tools", "选择允许 OpenQuantum 调用的工具，并查看各项操作的用途。"],
  };
  $("#page-title").textContent = descriptions[tab][0];
  $("#page-description").textContent = descriptions[tab][1];
  const items = tab === "credentials" ? credentialEntries(snapshot.services ?? []) : tab === "services" ? snapshot.services ?? [] : tab === "skills" ? snapshot.skills : tab === "tools" ? snapshot.tools : [...snapshot.connections, ...snapshot.providers];
  const states = [["all", "全部状态"], ["enabled", "配置启用"], ["disabled", "配置关闭"]];
  if (tab === "services") states.splice(1, 0, ["incomplete", "待配置"], ["configured", "配置已齐"], ["optional", "可选凭据"], ["unavailable", "凭据库不可用"], ["unsupported", "需要单独配置"]);
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
    const option = element("option", `${category.title}（${total}）`); option.value = category.id; $("#category").append(option);
  }
  $("#category").value = selected;
  $("#count").textContent = `显示 ${items.filter(item => matches(item)).length} / ${items.length} 项`;
  const services = snapshot.services ?? [];
  $("#overview").hidden = tab !== "services";
  $("#overview").replaceChildren(...[
    ["服务目录", services.length, "all"],
    ["待配置", services.filter(item => item.configuration === "incomplete").length, "incomplete"],
    ["配置已齐", services.filter(item => item.configuration === "configured").length, "configured"],
    ["需单独配置", services.filter(item => !item.supported).length, "unsupported"],
  ].map(([label, count, state]) => {
    const node = button("", () => { setTab("services"); $("#state").value = state; render(); }, "summary-card");
    node.append(element("strong", String(count)), element("span", label)); return node;
  }));
  const content = $("#content"); content.replaceChildren();
  if (tab === "credentials") {
    renderCredentialCards(content, items.filter(matches), {
      request, notice, refresh: async () => { try { await updateSnapshot({ action: "snapshot" }); } finally { render(); } },
      openLink: async url => { try { if (preview) window.open(url, "_blank", "noopener,noreferrer"); else await openHostLink(app, url); } catch { notice(`未能打开文档：${url}`, true); } },
      fallback: (id, card) => openCredential(id, card, true),
    });
  } else if (tab === "services") renderServices(content); else if (tab === "skills") renderSkills(content); else if (tab === "tools") renderTools(content); else renderConnections(content);
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
