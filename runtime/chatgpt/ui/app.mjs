import { App, applyHostStyleVariables, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import { openHostLink } from "./open-link.mjs";
import { credentialEntries, renderCredentialCards } from "./credential-cards.mjs";
import { environmentLabel, environmentPanel } from "./environment-cards.mjs";
import { SETTINGS_TABS, skillPresentation, shortDescription, toolState, skillPreparation, skillEnvironment, skillIssue, environmentState, providerState, connectionState } from "./settings-model.mjs";
import { accountState } from "./credential-groups.mjs";
import { SettingsSession, sameConnectionDestination } from "./settings-recovery.mjs";
import "./style.css";

const desktop = document.querySelector('meta[name="openquantum-host"]')?.content === "Desktop";
const hostName = desktop ? "Desktop" : "Codex";
const $ = selector => document.querySelector(selector);
const filterToolbar = $("#toolbar");
let snapshot, tab = "runtime", busy = false, app;
let selectedEntry, detailPane, showDetail = false;
let catalogScroll = 0;
let preparationFocus = desktop && location.hash.startsWith("#skill=") ? { skillId: decodeURIComponent(location.hash.slice(7)) } : undefined;
let defaultState;
const settingsSession = new SettingsSession(request);
const connectionDrafts = new Map();
const environmentDrafts = new Map();
let pollTimer;
let pendingEnvironmentNotice;
let pendingFocusKey;
function environmentFor(item) { return snapshot.environments?.find(value => value.id === item.environmentId); }
function reportEnvironmentCompletion() {
  if (!pendingEnvironmentNotice) return;
  const environment = snapshot.environments?.find(item => item.id === pendingEnvironmentNotice.id);
  if (!environment || environment.job?.id !== pendingEnvironmentNotice.jobId) { pendingEnvironmentNotice = null; return; }
  if (["preparing", "cancelling"].includes(environment.state)) return;
  notice(environment.ready ? "环境已准备，Agent 可直接使用。" : `${environmentLabel(environment)}${environmentState(environment).actionLabel ? `，请${environmentState(environment).actionLabel}。` : "。"}`, ["failed", "interrupted"].includes(environment.state));
  pendingEnvironmentNotice = null;
}
function schedulePoll() {
  clearTimeout(pollTimer);
  if (!snapshot?.environments?.some(item => ["preparing", "cancelling"].includes(item.state))) return;
  pollTimer = setTimeout(async () => {
    if (busy || settingsSession.pending || document.hidden || document.activeElement?.matches("input, textarea")) { schedulePoll(); return; }
    try { await updateSnapshot({ action: "snapshot" }); reportEnvironmentCompletion(); render(); }
    catch { notice("暂时无法读取安装进度，请刷新重试。安装操作会在本机继续。", true); }
    finally { schedulePoll(); }
  }, 1500);
}
const expandedGroups = new Map();
const selectedEnvironments = new Map();
function t(key, params) {
  let value = snapshot?.components?.copy?.[key] ?? key;
  for (const [name, replacement] of Object.entries(params ?? {})) value = value.replaceAll(`{${name}}`, replacement);
  return value;
}
function skillEntries() {
  return (snapshot.components?.skills ?? snapshot.skills).map(skill => skillPresentation({ ...skill,
    description: /\p{Script=Han}/u.test(skill.description ?? "") ? skill.description : snapshot.tools.find(tool => skill.relations?.toolIds.includes(tool.id))?.summary ?? skill.description }));
}
function allServices() {
  const entries = snapshot.components?.mcpServers ?? snapshot.providers;
  return [...entries, ...snapshot.providers.filter(item => !entries.some(entry => entry.id === item.id))];
}
function mcpEntries() { return allServices().filter(item => !item.id.startsWith("native:")); }
function unlinkedServices() {
  return allServices().filter(item => item.id.startsWith("native:") && !skillEntries().some(skill => skill.relations?.providerIds.includes(item.id)));
}
const preview = window.parent === window && ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) && location.hash.startsWith("#preview=");
const previewToken = preview ? location.hash.slice(9) : null;
if (preview || desktop) history.replaceState(null, "", location.pathname);
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function notice(message, error = false, tone = "info") {
  const node = $("#notice");
  node.textContent = message; node.className = error ? "error" : "";
  node.dataset.tone = error ? "error" : tone;
}
async function request(input) {
  if (preview || desktop) {
    const response = await fetch(desktop ? "/openquantum/api/preparation" : "/settings", { method: "POST", headers: { "Content-Type": "application/json", ...(preview ? { Authorization: `Bearer ${previewToken}` } : {}) }, body: JSON.stringify(input) });
    const value = await response.json(); if (!response.ok) throw new Error(value.error); return value;
  }
  const result = await app.callServerTool({ name: "openquantum_settings", arguments: input });
  if (result.isError) throw new Error(result.content?.find(item => item.type === "text")?.text || "操作失败");
  const value = result._meta?.openquantumSettings;
  if (!value) throw new Error("宿主未返回设置数据，请检查插件版本");
  return value;
}
async function updateSnapshot(input) {
  const result = await settingsSession.update(input);
  snapshot = result.snapshot;
  if (result.save) {
    if (!result.confirmed) throw new Error(result.error || "已读取最新设置，但无法确认上次保存。请核对当前内容；编辑草稿已保留。");
    if (["connection.add", "connection.update"].includes(result.save.action)) {
      const key = result.save.id ? `edit:${result.save.id}:${result.save.connectionInstance}` : "add";
      connectionDrafts.delete(key);
      const saved = snapshot.connections.find(item => item.id === (result.save.id ?? result.save.connection.id));
      if (saved) { selectedEntry = entryKey(saved, "connection"); showDetail = true; }
      expandedGroups.set(result.save.id ? `connection-edit:${result.save.id}` : "connection-add", false);
    }
    if (result.recovered) notice("已重新读取并核对当前设置，没有重复提交。");
  }
  return result;
}
async function run(input) {
  if (busy) return;
  busy = true;
  pendingFocusKey = document.activeElement?.dataset?.focusKey;
  pendingEnvironmentNotice = null;
  notice(input.action === "snapshot" ? "正在读取设置…" : input.action === "connection.test" ? "正在连接 MCP 并读取工具清单…" : "正在更新设置…", false, "working");
  $("#content").setAttribute("aria-busy", "true");
  document.querySelectorAll("button,input,select,textarea").forEach(node => node.disabled = true);
  try {
    const result = await updateSnapshot(input);
    if (input.action === "environment.configure") environmentDrafts.delete(input.id);
    const messages = { "connection.update": "连接已保存并关闭，请测试连接后重新启用 MCP 和 Tool。", "environment.install": "安装已开始。完成后 Agent 可直接调用。", "environment.check": "正在检查现有依赖与配置。", "environment.cancel": "已请求取消，正在等待安装进程退出。", "environment.configure": "配置已保存。" };
    notice(result.recovered ? "已重新读取并核对当前设置，没有重复提交。" : messages[input.action] ?? (input.action === "snapshot" ? "" : input.action === "skill.set" ? "选择已保存，新的准备和调用立即遵循此选择。" : "设置已保存。"));
    if (["environment.install", "environment.check", "environment.cancel"].includes(input.action)) {
      pendingEnvironmentNotice = { id: input.id, jobId: snapshot.environments?.find(item => item.id === input.id)?.job?.id };
      reportEnvironmentCompletion();
    }
  }
  catch (error) {
    if (input.action === "connection.test") {
      // Failed probes record connection status but return an error, not a snapshot.
      try { await updateSnapshot({ action: "snapshot" }); } catch { /* Keep the original failure visible. */ }
    }
    notice(error.message, true);
  }
  finally {
    busy = false;
    $("#content").setAttribute("aria-busy", "false");
    document.querySelectorAll("button,input,select,textarea").forEach(node => node.disabled = false);
    render(); schedulePoll();
  }
}
function switchFor(checked, label, action, { disabled = false, text } = {}) {
  const node = element("label", undefined, "switch");
  const input = element("input"); input.type = "checkbox"; input.checked = checked; input.setAttribute("aria-label", label);
  input.disabled = busy || disabled; input.dataset.focusKey = `${action.action}:${action.id}:${action.tool ?? ""}`;
  input.onchange = () => run({ ...action, enabled: input.checked }); node.append(input, element("span", text ?? (checked ? "已启用" : "未启用"))); return node;
}
function button(text, action, className) { const node = element("button", text, className); node.type = "button"; node.onclick = action; return node; }
function categories() { return snapshot.categories ?? [{ id: "other", title: "其他与自定义" }]; }
function categoryOf(item) { return categories().some(category => category.id === item.category) ? item.category : "other"; }
function searchText(item) {
  return [item.title, t(item.title ?? ""), item.id, item.summary, item.description, t(item.description ?? ""), item.note, item.provider, item.url, item.command,
    ...(item.serverNames ?? []),
    ...(item.fields ?? []).flatMap(field => [field.name, field.title, field.displayName, field.description]),
    ...(item.tools ?? []).flatMap(tool => typeof tool === "string" ? [tool] : [tool.name, tool.title, tool.description]),
    categories().find(value => value.id === categoryOf(item))?.title].filter(Boolean).join(" ").normalize("NFKC").toLowerCase();
}
function matches(item) {
  const query = $("#search").value.trim().normalize("NFKC").toLowerCase();
  const state = $("#state").value;
  const supported = item.supported !== false && item.configuration !== "unsupported";
  const prepared = () => (snapshot.connections.includes(item) ? connectionState(item) : providerState(item, snapshot)).key === "prepared";
  const recent = (snapshot.recentSkills ?? []).some(value => value.id === item.id);
  const account = accountState(item, snapshot.services ?? []);
  const stateMatches = state === "all" || (state === "recent" ? recent : state === "attention" ? Boolean(skillIssue(item, snapshot))
    : state === "accounts" ? account.key !== "none" : state === "configured" ? account.key === "configured"
    : state === "unsupported" ? !supported : ["prepared", "needs_setup"].includes(state)
      ? supported && prepared() === (state === "prepared") : supported && item.enabled === (state === "enabled"));
  return query.split(/\s+/).every(word => searchText(item).includes(word)) && stateMatches
    && ($("#category").value === "all" || categoryOf(item) === $("#category").value);
}
function categoryGroups(container, items, renderItem) {
  const filtered = items.filter(item => matches(item));
  for (const category of categories()) {
    const entries = filtered.filter(item => categoryOf(item) === category.id);
    if (!entries.length) continue;
    const group = element("section", undefined, "catalog-group");
    const heading = element("h2", t(category.title));
    heading.append(element("span", `${entries.length}`, "hint"));
    const grid = element("div", undefined, "catalog-grid");
    for (const item of entries) grid.append(renderItem(item));
    group.append(heading, grid);
    container.append(group);
  }
  return filtered.length;
}
function entryKey(item, scope) {
  return scope === "connection" ? `${scope}:${item.id}:${item.instance}` : `${scope}:${item.id}`;
}
function catalogItem(item, state, scope, renderBody) {
  const key = entryKey(item, scope), selected = selectedEntry === key;
  const account = accountState(item, snapshot.services ?? []);
  const row = button("", () => {
    if (busy) return;
    selectedEntry = key; showDetail = true; render();
    if (matchMedia("(max-width: 720px)").matches) $("#detail-title")?.focus();
  }, "catalog-item");
  row.dataset.entryId = item.id; row.dataset.entryKey = key; row.dataset.focusKey = key;
  if (selected) row.setAttribute("aria-current", "true");
  row.setAttribute("aria-controls", "catalog-detail");
  row.append(element("strong", item.title ?? item.id, "catalog-title"),
    element("span", shortDescription(item.description ?? item.url ?? item.command), "catalog-summary"),
    element("span", account.label, `catalog-account${["missing", "unavailable"].includes(account.key) ? " attention" : ""}`),
    element("span", item.supported === false ? "当前不支持" : item.enabled === false ? "已关闭" : "允许使用", "catalog-permission"));
  if (selected) {
    const back = button("返回列表", () => {
      showDetail = false; render();
      [...document.querySelectorAll(".catalog-item")].find(node => node.dataset.entryKey === key)?.focus({ preventScroll: true });
    }, "back-to-list quiet");
    const header = element("div", undefined, "detail-heading");
    const title = element("h2", item.title ?? item.id); title.id = "detail-title"; title.tabIndex = -1;
    const action = { action: scope === "skill" ? "skill.set" : scope === "connection" ? "connection.set" : "provider.set", id: item.id,
      ...(scope === "connection" ? { connectionInstance: item.instance } : {}) };
    header.append(title);
    if (item.supported !== false) header.append(switchFor(item.enabled !== false, `允许使用 ${item.title ?? item.id}`, action,
      { text: item.enabled === false ? "已关闭" : "允许使用" }));
    detailPane.append(back, header, element("p", item.description ?? item.url ?? item.command, "description"),
      element("p", state.label, "hint"));
    const body = element("div", undefined, "catalog-settings"); renderBody(body); detailPane.append(body);
  }
  return row;
}
function disclosure(key, title, className = "setup-details") {
  const details = element("details", undefined, className);
  details.open = expandedGroups.get(key) ?? false;
  details.ontoggle = () => { if (details.isConnected) expandedGroups.set(key, details.open); };
  details.append(element("summary", title));
  return details;
}
function credentialOptions(scope) {
  return { scope, request, notice,
    refresh: async () => { try { await updateSnapshot({ action: "snapshot" }); } finally { render(); } },
    openLink: async url => { try { if (preview || desktop) window.open(url, "_blank", "noopener,noreferrer"); else await openHostLink(app, url); } catch { notice(`未能打开文档：${url}`, true); } },
    fallback: (id, card) => openCredential(id, card, true) };
}
function showSkill(id) { setTab("skills"); $("#state").value = "all"; $("#search").value = id; selectedEntry = `skill:${id}`; showDetail = true;
  const selection = snapshot.recentSkills?.find(item => item.id === id)?.selection;
  if (selection?.sdkId) selectedEnvironments.set(id, selection.sdkId);
  render(); }
function toolRow(tool, compact = false) {
  const row = element("div", undefined, "tool-row"), info = element("div");
  const state = toolState(tool, snapshot);
  const action = tool.connectionId ? { action: "connection.tool.set", id: tool.connectionId, tool: tool.name } : { action: "tool.set", id: tool.id };
  info.append(element("strong", tool.title), element("p", state.label, `hint ${state.key === "prepared" ? "prepared" : ""}`));
  if (!compact) row.append(info);
  row.append(switchFor(tool.enabled, `${tool.title} Tool`, action, { text: tool.enabled ? "允许按需使用" : "已禁止" }));
  if (!tool.operationOverrides?.length) return row;
  const group = element("div"); group.append(row);
  const details = disclosure(`tool-overrides:${tool.id}`, `关联 Tool 使用限制（${tool.operationOverrides.length}）`);
  details.append(element("p", "保留原有的单独选择。关联 Skill、Tool 和 MCP 的禁用仍然有效。", "hint"));
  for (const operation of tool.operationOverrides) {
    const control = element("div", undefined, "tool-row"), description = element("div");
    description.append(element("code", operation.id), element("p", shortDescription(operation.description), "hint"));
    if (operation.affectedProviders.length > 1) description.append(element("p", `同名 Tool 共用此选择：${operation.affectedProviders.join("、")}`, "hint"));
    control.append(description, switchFor(operation.enabled, `${operation.id} 关联 Tool`,
      { action: "tool.operation.set", id: tool.id, tool: operation.id }, { text: operation.enabled ? "允许按需使用" : "已禁止" }));
    details.append(control);
  }
  group.append(details);
  return group;
}
function providerControl(id) {
  const provider = snapshot.providers.find(item => item.id === id);
  if (!provider) return element("p", "此 MCP 当前插件不支持。", "hint");
  const native = id.startsWith("native:");
  const row = element("div", undefined, "provider-control");
  row.append(element("span", native ? "内置 Tool" : `${provider.title} MCP`), switchFor(provider.enabled, `${provider.title} ${native ? "Tool" : "MCP"}`, { action: "provider.set", id },
    { text: provider.enabled ? "允许按需使用" : "已禁止" }));
  return row;
}
function relatedCredentials(container, ids, scope, preferredFields = []) {
  const entries = credentialEntries(snapshot.services ?? []).filter(entry => entry.serverNames.some(id => ids.includes(id)));
  if (entries.length) renderCredentialCards(container, entries, { ...credentialOptions(scope), expandMatches: true, preferredFields });
}
function skillSetup(skill) {
  const relations = skill.relations ?? { toolIds: [], providerIds: [], environmentIds: [], credentialServiceIds: [] };
  const details = element("div", undefined, "preparation-focus");
  details.append(element("p", "Agent 会在执行需要时准备。这里可提前配置或处理安装问题。", "hint"));
  let environmentId = relations.environmentIds[0];
  if (relations.environmentIds.length > 1) {
    const label = element("label", "选择本次需要的运行环境", "environment-choice");
    const select = element("select"); select.setAttribute("aria-label", `${skill.title} 运行环境`);
    select.dataset.focusKey = `environment-choice:${skill.id}`;
    const empty = element("option", "选择环境…"); empty.value = ""; select.append(empty);
    for (const id of relations.environmentIds) {
      const environment = snapshot.environments?.find(item => item.id === id);
      const option = element("option", `${environment?.title ?? id}${environment?.ready ? " · 已准备" : ""}`); option.value = id; select.append(option);
    }
    environmentId = selectedEnvironments.get(skill.id);
    select.value = environmentId ?? "";
    select.onchange = () => { selectedEnvironments.set(skill.id, select.value); render(); };
    label.append(select); details.append(label);
  }
  const environment = skillEnvironment(skill, snapshot, environmentId);
  const needed = preparationFocus?.skillId === skill.id && preparationFocus.serviceId
    ? preparationFocus.serviceId : snapshot.recentSkills?.find(item => item.id === skill.id)?.serviceId;
  const preferredFields = preparationFocus?.skillId === skill.id && preparationFocus.fields?.length
    ? preparationFocus.fields : [snapshot.recentSkills?.find(item => item.id === skill.id)?.selection?.credentialField].filter(Boolean);
  relatedCredentials(details, [...new Set([needed, ...relations.credentialServiceIds].filter(Boolean))], `skill-${skill.id}`, preferredFields);
  if (environment) details.append(environmentPanel(environment, { element, button, run, drafts: environmentDrafts, expanded: expandedGroups }));
  else if (environmentId) details.append(element("p", "环境状态未读取，请刷新后重试。", "hint"));
  const controls = disclosure(`advanced-skill:${skill.id}`, "Tool 与 MCP 使用限制");
  for (const id of relations.providerIds) controls.append(providerControl(id));
  const tools = relations.toolIds.map(id => snapshot.tools.find(tool => tool.id === id)).filter(Boolean);
  if (tools.length) {
    const pending = environmentId && !environment?.ready;
    const list = pending ? disclosure(`skill-tools:${skill.id}`, `关联 Tool（${tools.length}）`) : element("div");
    if (!pending) list.append(element("h4", "关联 Tool"));
    for (const tool of tools) list.append(toolRow(tool));
    controls.append(list);
  } else if (relations.usesHostTools) details.append(element("p", `通过 ${hostName} Tool 运行；调用权限由宿主管理。`, "hint"));
  if (relations.providerIds.length || tools.length) details.append(controls);
  return details;
}
function renderSkills(container) {
  categoryGroups(container, skillEntries(), skill => catalogItem(skill, {
    key: skill.enabled === false ? "disabled" : "allowed",
    label: skill.supported === false ? "当前插件不支持" : skillPreparation(skill, snapshot),
  }, "skill", body => {
    if (skill.supported !== false) body.append(skillSetup(skill));
    else body.append(element("p", skill.availabilityNote, "hint"));
    const info = disclosure(`skill-info:${skill.id}`, "方法与适用范围", "technical-details");
    info.append(element("code", skill.id), element("p", skill.description, "hint"));
    body.append(info);
  }));
  if (unlinkedServices().some(matches)) {
    container.append(element("h2", "内置 Tools", "section-title"));
    categoryGroups(container, unlinkedServices(), serviceCard);
  }
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
    link.onclick = async event => { if (!preview && !desktop) { event.preventDefault(); await open(); } };
    if (!preview && !desktop) await open();
    else {
      window.open(url, "_blank", "noopener,noreferrer");
      notice("请在本机凭据窗口保存；若没有弹出，请复制卡片中的地址到浏览器。");
    }
  } catch (error) { notice(error.message, true); }
  finally { busy = false; }
}
function setTab(value) {
  if (!snapshot || busy) return;
  if (!SETTINGS_TABS.some(([id]) => id === value)) return;
  tab = value;
  document.querySelectorAll("button[data-tab]").forEach(node => { node.classList.toggle("active", node.dataset.tab === tab); node.setAttribute("aria-selected", String(node.dataset.tab === tab)); node.tabIndex = node.dataset.tab === tab ? 0 : -1; });
  $("#state").value = "all"; $("#category").value = "all"; $("#search").value = "";
  defaultState = "all";
  selectedEntry = undefined; showDetail = false; catalogScroll = 0;
  $("#content").setAttribute("aria-labelledby", `tab-${tab}`);
  notice("");
  render();
}
function renderRuntime(container) {
  const introduction = element("section", undefined, "overview-introduction");
  introduction.append(element("p", "OpenQuantum 是开源开放的量子科研 AI 平台，连接开源社区的优秀软件、算法与公开研究成果，让 AI 围绕你的研究问题开展分析、选择方法、执行计算并核对结果，把专业积累转化为实际的科研能力。", "overview-description"));
  const links = element("div", undefined, "home-paths");
  const skills = button("浏览 Skills", () => setTab("skills"));
  skills.append(element("span", `${skillEntries().length} 个研究方法与工作流程`, "hint"));
  const mcp = button("管理 MCP", () => setTab("mcp"));
  mcp.append(element("span", `${mcpEntries().length} 个服务，账户与环境集中配置`, "hint"));
  links.append(skills, mcp); introduction.append(links); container.append(introduction);
}
function connectionForm(connection) {
  const id = connection?.id ?? "new";
  const key = connection ? `edit:${id}:${connection.instance}` : "add";
  const draft = connectionDrafts.get(key) ?? (connection ? { id, transport: connection.transport, target: connection.url ?? connection.command,
    authentication: connection.authentication, tokenEnv: connection.tokenEnv ?? "", args: (connection.args ?? []).join("\n") } : {});
  const form = element("form", undefined, "card");
  form.setAttribute("aria-label", connection ? `${id} 编辑连接` : "添加 MCP 连接");
  const fields = element("div", undefined, "form-grid"), inputs = {};
  const field = (name, title, kind, options) => {
    const label = element("label", title), input = element(kind || "input"); input.name = name;
    input.dataset.focusKey = `connection:${key}:${name}`;
    if (options) for (const [value, title] of options) { const option = element("option", title); option.value = value; input.append(option); }
    if (name === "args") label.className = "wide";
    if (draft[name] !== undefined) input.value = draft[name];
    input.addEventListener("input", () => { draft[name] = input.value; connectionDrafts.set(key, draft); });
    label.append(input); fields.append(label); inputs[name] = input; return input;
  };
  field("id", "连接名称（英文字母、数字或下划线）").readOnly = Boolean(connection);
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
  const reset = Boolean(connection?.credential?.configured);
  const submit = element("button", connection ? reset ? "保存修改并清除 Token" : "保存修改" : "添加连接", "primary"); submit.type = "submit";
  form.append(fields, element("p", connection
    ? `修改后会关闭 MCP 并清空 Tool 列表，请重新测试连接。${reset ? "原 Token 将移除，请为修改后的连接重新配置。" : ""}`
    : "添加后默认关闭。Token 在添加后通过系统凭据库保存。", "hint"), submit);
  if (connection) form.append(button("取消编辑", () => { connectionDrafts.delete(key); expandedGroups.set(`connection-edit:${id}`, false); render(); }));
  form.onsubmit = event => {
    event.preventDefault();
    const value = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
    const next = { id: value.id.trim(), transport: value.transport, authentication: value.authentication,
      ...(value.transport === "http" ? { url: value.target.trim() } : {
        command: connection?.transport === "stdio" && value.target === connection.command ? connection.command : value.target.trim(),
        args: connection?.transport === "stdio" && value.args === (connection.args ?? []).join("\n") ? connection.args : value.args ? value.args.split("\n") : [],
        ...(value.authentication === "token" ? { tokenEnv: value.tokenEnv.trim() } : {}) }) };
    if (connection && sameConnectionDestination(connection, next)) { notice("连接内容没有变化，无需保存。"); return; }
    run({ action: connection ? "connection.update" : "connection.add", ...(connection ? { id, connectionInstance: connection.instance, resetCredential: reset } : {}), connection: next });
  };
  return form;
}
function serviceCard(server) {
  const state = providerState(server, snapshot);
  return catalogItem(server, state, "provider", body => {
    if (server.supported !== false) {
      relatedCredentials(body, [server.service ?? server.id], `mcp-${server.id}`);
      if (accountState(server, snapshot.services ?? []).key === "none") body.append(element("p", "此服务无需填写账户。", "hint"));
      const environment = environmentFor(server);
      if (environment) body.append(environmentPanel(environment, { element, button, run, drafts: environmentDrafts, expanded: expandedGroups }));
      const tools = snapshot.tools.filter(tool => tool.provider === server.id);
      if (tools.length) {
        const controls = disclosure(`provider-tools:${server.id}`, `Tools（${tools.length}）`);
        for (const tool of tools) controls.append(toolRow(tool));
        body.append(controls);
      }
      for (const skill of skillEntries().filter(item => item.relations?.providerIds.includes(server.id))) body.append(button(`关联 Skill · ${skill.title}`, () => showSkill(skill.id)));
    } else body.append(element("p", server.availabilityNote, "hint"));
    const info = disclosure(`provider-info:${server.id}`, "详情", "technical-details");
    info.append(element("code", server.id), element("p", server.transport ? `${server.transport} · ${server.target ?? server.id}` : "连接由当前宿主管理", "hint"));
    if (server.sourceUrl) {
      const link = element("a", "源码"); link.href = server.sourceUrl; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.onclick = event => { if (!preview && !desktop) { event.preventDefault(); void openHostLink(app, link.href).catch(() => notice(`未能打开源码：${link.href}`, true)); } };
      info.append(link);
    }
    body.append(info);
  });
}
function renderMcp(container) {
  categoryGroups(container, mcpEntries(), serviceCard);
  if (desktop) return;
  for (const [key, draft] of connectionDrafts) {
    if (!key.startsWith("edit:") || snapshot.connections.some(item => key === `edit:${item.id}:${item.instance}`)) continue;
    const retained = element("details", undefined, "card");
    retained.append(element("summary", `${draft.id} · 原连接的编辑草稿`),
      element("p", "连接已被替换或移除。这份草稿仅供核对，不会应用到新连接。", "hint"));
    for (const name of ["target", "args", "authentication", "tokenEnv"]) {
      const value = element("textarea"); value.value = draft[name] ?? ""; value.readOnly = true;
      value.setAttribute("aria-label", `${draft.id} 原草稿 ${name}`); retained.append(value);
    }
    retained.append(button("丢弃此草稿", () => { connectionDrafts.delete(key); render(); })); container.append(retained);
  }
  if (snapshot.connections.some(connection => matches(connection))) container.append(element("h2", "我的 MCP 连接", "section-title"));
  if (!snapshot.connections.length && !$("#search").value.trim() && $("#category").value === "all" && $("#state").value === "all") container.append(element("p", "还没有自定义连接。内置能力由 Agent 按任务准备。", "hint"));
  categoryGroups(container, snapshot.connections, connection => {
    return catalogItem(connection, connectionState(connection), "connection", card => {
      card.append(element("p", connection.status.message, "hint"));
      if (connection.authentication === "token") card.append(element("span", connection.credential.unavailable ? "凭据库不可用" : connection.credential.configured ? "Token 已配置" : "需要 Token", "badge"));
      const actions = element("div", undefined, "actions");
      actions.append(button("测试连接", () => run({ action: "connection.test", id: connection.id, connectionInstance: connection.instance })));
      if (connection.authentication === "token") actions.append(button("配置 Token", () => openCredential(connection.id, actions)));
      const removal = element("div", undefined, "actions"); removal.hidden = true;
      removal.append(element("span", `确认移除 ${connection.id}？请先关闭连接并移除 Token。`),
        button("确认移除", () => run({ action: "connection.remove", id: connection.id, connectionInstance: connection.instance }), "danger"),
        button("取消", () => { removal.hidden = true; }));
      actions.append(button("移除连接", () => { removal.hidden = false; }, "danger")); card.append(actions, removal);
      const toolList = element("details"); toolList.append(element("summary", `Tool（${connection.tools.length}）`));
      toolList.open = Boolean($("#search").value.trim());
      for (const tool of connection.tools) {
        const row = element("div", undefined, "tool-row"); const info = element("div"); info.append(element("strong", tool.title || tool.name), element("p", tool.description, "hint"));
        row.append(info, switchFor(tool.enabled, `${connection.id} ${tool.name} 启用`, { action: "connection.tool.set", id: connection.id, connectionInstance: connection.instance, tool: tool.name })); toolList.append(row);
      }
      if (connection.tools.length) card.append(toolList);
      const edit = disclosure(`connection-edit:${connection.id}`, "编辑连接"); edit.append(connectionForm(connection));
      card.append(edit);
    });
  });
}
function render() {
  $("#refresh").hidden = false;
  if (!snapshot) {
    const empty = element("div", undefined, "empty");
    empty.append(element("h2", "暂时无法读取设置"), element("p", "请检查插件连接后刷新。已有配置不会因此改变。", "hint"), button("重新读取", () => run({ action: "snapshot" }), "primary"));
    $("#content").replaceChildren(empty); return;
  }
  const oldList = $(".catalog-list"), oldDetail = $(".detail-pane");
  if (oldList && oldList.dataset.tab === tab && oldList.getClientRects().length) catalogScroll = oldList.scrollTop;
  const detailScroll = oldDetail && oldDetail.dataset.entryKey === selectedEntry ? oldDetail.scrollTop : 0;
  const active = document.activeElement;
  const focusedFilter = filterToolbar.contains(active) ? active : null;
  const focusedDraft = pendingFocusKey ?? active?.dataset?.focusKey;
  pendingFocusKey = null;
  const focusTarget = focusedFilter || (focusedDraft ? active : null);
  const selection = focusTarget && typeof focusTarget.selectionStart === "number"
    ? [focusTarget.selectionStart, focusTarget.selectionEnd, focusTarget.selectionDirection] : null;
  // Preserve the filter controls and their event handlers across views.
  $("#notice").before(filterToolbar);
  const intro = {
    runtime: ["共建可信的量子科研智能。", ""],
    skills: ["Skills", "研究方法与工作流程。选择条目查看用法、账户与运行环境。"],
    mcp: ["MCP", "选择服务配置账户与环境。允许使用、凭据保存和连接状态分别管理。"],
  }[tab];
  $("#page-title").textContent = intro[0]; $("#page-description").textContent = intro[1];
  $("#page-description").hidden = !intro[1];
  $("#settings-scope").hidden = tab === "runtime" || !snapshot.scope;
  $("#settings-scope").textContent = snapshot.scope ? `生效范围：${snapshot.scope}。已保存的设置在关闭面板后仍会保留。` : "";
  filterToolbar.hidden = tab === "runtime";
  $("#search").placeholder = "搜索名称或用途";
  $("#search").setAttribute("aria-label", tab === "mcp" ? "搜索 MCP" : "搜索 Skills");
  const items = tab === "skills" ? skillEntries() : tab === "runtime" ? [] : [...(desktop ? [] : snapshot.connections), ...mcpEntries()];
  const extraTools = tab === "skills" ? unlinkedServices() : [];
  const states = [["all", "全部"], ["enabled", "允许使用"], ["disabled", "已关闭"], ["unsupported", "当前插件不支持"]];
  if (tab === "skills") states.push(["recent", "最近选择"], ["attention", "需要处理"]);
  states.push(["accounts", "有账户配置"], ["configured", "凭据已保存"]);
  if (tab === "mcp") states.push(["prepared", "已准备"], ["needs_setup", "待准备"]);
  const selectedState = defaultState ?? $("#state").value;
  defaultState = null;
  $("#state").replaceChildren(...states.map(([value, label]) => { const option = element("option", label); option.value = value; return option; }));
  $("#state").value = states.some(([value]) => value === selectedState) ? selectedState : "all";
  const selected = $("#category").value || "all";
  const all = element("option", "全部用途"); all.value = "all";
  $("#category").replaceChildren(all);
  for (const category of categories()) {
    const total = [...items, ...extraTools].filter(item => categoryOf(item) === category.id).length;
    if (!total && selected !== category.id) continue;
    const option = element("option", `${t(category.title)} (${total})`); option.value = category.id; $("#category").append(option);
  }
  $("#category").value = selected;
  const applied = [$("#category"), $("#state")].filter(select => select.value !== "all");
  $("#clear-filters").hidden = !applied.length && !$("#search").value;
  $("#count").textContent = `显示 ${items.filter(matches).length} / ${items.length} ${tab === "skills" ? "个 Skills" : "项"}${extraTools.length ? `，另有 ${extraTools.filter(matches).length} 个内置 Tool` : ""}`;
  const content = $("#content"); content.replaceChildren();
  $("#app").dataset.tab = tab;
  if (tab === "runtime") renderRuntime(content);
  else {
    const entries = [...items, ...extraTools].filter(matches);
    const scopeFor = item => snapshot.connections.includes(item) ? "connection" : tab === "skills" && !item.id.startsWith("native:") ? "skill" : "provider";
    if (selectedEntry !== "connection:new" && !entries.some(item => entryKey(item, scopeFor(item)) === selectedEntry)) {
      selectedEntry = entries.length ? entryKey(entries[0], scopeFor(entries[0])) : undefined;
      showDetail = false;
    }
    const layout = element("div", undefined, "catalog-layout"); layout.dataset.detail = String(showDetail);
    const pane = element("aside", undefined, "catalog-pane"); pane.setAttribute("aria-label", "能力目录");
    pane.append(filterToolbar);
    if (tab === "mcp" && !desktop) pane.append(button("添加 MCP 连接", () => {
      selectedEntry = "connection:new"; showDetail = true; render();
      detailPane.querySelector("input")?.focus();
    }, "add-connection"));
    const list = element("div", undefined, "catalog-list"); list.dataset.tab = tab; pane.append(list);
    detailPane = element("section", undefined, "detail-pane"); detailPane.id = "catalog-detail";
    detailPane.dataset.entryKey = selectedEntry ?? ""; detailPane.setAttribute("aria-label", "配置详情");
    layout.append(pane, detailPane); content.append(layout);
    if (tab === "skills") renderSkills(list); else renderMcp(list);
    if (selectedEntry === "connection:new") {
      const back = button("返回列表", () => { selectedEntry = undefined; showDetail = false; render(); }, "quiet");
      const heading = element("h2", "添加 MCP 连接"); heading.id = "detail-title"; heading.tabIndex = -1;
      detailPane.append(back, heading, connectionForm());
    }
    if (!entries.length) {
      const empty = element("div", undefined, "empty");
      empty.append(element("p", "没有匹配的项目"), button("清除筛选", () => {
        $("#search").value = ""; $("#category").value = "all"; $("#state").value = "all"; render();
      })); list.append(empty);
      if (!selectedEntry) detailPane.append(element("p", "调整搜索或筛选，选择需要配置的项目。", "hint"));
    }
    list.scrollTop = catalogScroll; detailPane.scrollTop = detailScroll;
  }
  const restored = focusedFilter?.isConnected ? focusedFilter : focusedDraft ? [...document.querySelectorAll("[data-focus-key]")].find(input => input.dataset.focusKey === focusedDraft) : null;
  if (restored) { restored.focus({ preventScroll: true }); if (selection && restored.setSelectionRange) restored.setSelectionRange(...selection); }
}
document.querySelectorAll("button[data-tab]").forEach(node => { node.textContent = SETTINGS_TABS.find(([id]) => id === node.dataset.tab)?.[1]; });
document.querySelectorAll("button[data-tab]").forEach(node => {
  node.tabIndex = node.dataset.tab === tab ? 0 : -1;
  node.onclick = () => setTab(node.dataset.tab);
  node.onkeydown = event => {
    const tabs = [...document.querySelectorAll("button[data-tab]")].filter(item => !item.hidden), index = tabs.indexOf(node);
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next !== null) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
  };
});
const filterChanged = () => { catalogScroll = 0; const list = $(".catalog-list"); if (list) list.scrollTop = 0; notice(""); render(); };
const searchChanged = event => {
  if (event.isComposing) return;
  if (["recent", "relevant"].includes($("#state").value)) $("#state").value = "all";
  filterChanged();
};
$("#search").oninput = searchChanged;
$("#search").addEventListener("compositionend", searchChanged);
$("#search").onkeydown = event => {
  if (event.key === "Escape" && !event.isComposing && $("#search").value) { event.preventDefault(); $("#search").value = ""; filterChanged(); }
};
$("#category").onchange = filterChanged;
$("#state").onchange = filterChanged;
$("#refresh").onclick = () => run({ action: "snapshot" });
$("#clear-filters").onclick = () => { $("#search").value = ""; $("#category").value = "all"; $("#state").value = "all"; filterChanged(); };
const githubLink = $("#github-link");
githubLink.onclick = async event => {
  if (preview || desktop) return;
  event.preventDefault();
  try {
    await openHostLink(app, githubLink.href);
  } catch {
    notice(`未能打开 GitHub，请在浏览器访问：${githubLink.href}`, true);
  }
};
try {
  if (!preview && !desktop) {
    app = new App({ name: "OpenQuantum Settings", version: "__RELEASE_VERSION__" });
    const theme = context => { if (context?.theme) applyDocumentTheme(context.theme); if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables); };
    app.onhostcontextchanged = theme;
    app.ontoolresult = result => {
      if (result._meta?.openquantumFocus) preparationFocus = result._meta.openquantumFocus;
      // Host notifications can arrive late; use a queued fresh read instead of
      // replacing the UI with an older embedded snapshot.
      if (result._meta?.openquantumSettings) void updateSnapshot({ action: "snapshot" }).then(() => {
        if (preparationFocus?.skillId) showSkill(preparationFocus.skillId); else render();
      }).catch(error => notice(error.message, true));
    };
    await app.connect(); theme(app.getHostContext());
  }
  await run({ action: "snapshot" });
  if (preparationFocus?.skillId) showSkill(preparationFocus.skillId);
} catch (error) { notice(error.message, true); }
