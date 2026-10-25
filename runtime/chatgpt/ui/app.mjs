import { App, applyHostStyleVariables, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import { openHostLink } from "./open-link.mjs";
import { credentialEntries, renderCredentialCards, clearCredentialDrafts } from "./credential-cards.mjs";
import { environmentLabel, environmentPanel } from "./environment-cards.mjs";
import { SETTINGS_TABS, skillPresentation, shortDescription, toolState, skillPreparation, skillIssue, environmentState, providerState, connectionState } from "./settings-model.mjs";
import "./style.css";

const desktop = document.querySelector('meta[name="openquantum-host"]')?.content === "Desktop";
const hostName = desktop ? "Desktop" : "Codex";
const $ = selector => document.querySelector(selector);
const filterToolbar = $("#toolbar");
let snapshot, tab = "runtime", busy = false, app;
let expandedEntry;
let preparationFocus = desktop && location.hash.startsWith("#skill=") ? { skillId: decodeURIComponent(location.hash.slice(7)) } : undefined;
let defaultState;
let stateRequests = Promise.resolve();
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
    if (busy || document.hidden || document.activeElement?.matches("input, textarea")) { schedulePoll(); return; }
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
function notice(message, error = false) { $("#notice").textContent = message; $("#notice").className = error ? "error" : ""; }
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
  pendingFocusKey = document.activeElement?.dataset?.focusKey;
  pendingEnvironmentNotice = null;
  notice(input.action === "connection.test" ? "正在连接 MCP 并读取工具清单…" : "正在更新设置…");
  document.querySelectorAll("button,input,select,textarea").forEach(node => node.disabled = true);
  try {
    await updateSnapshot(input);
    if (["connection.add", "connection.update"].includes(input.action)) {
      connectionDrafts.delete(input.id ? `edit:${input.id}` : "add");
      expandedGroups.set(input.id ? `connection-edit:${input.id}` : "connection-add", false);
    }
    if (input.action === "environment.configure") environmentDrafts.delete(input.id);
    const messages = { "connection.update": "连接已保存并关闭，请测试连接后重新启用 MCP 和 Tool。", "environment.install": "安装已开始。完成后 Agent 可直接调用。", "environment.check": "正在检查现有依赖与配置。", "environment.cancel": "已请求取消，正在等待安装进程退出。", "environment.configure": "配置已保存。" };
    notice(messages[input.action] ?? (input.action === "snapshot" ? "" : input.action === "skill.set" ? "选择已保存，新的准备和调用立即遵循此选择。" : "设置已保存。"));
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
  finally { busy = false; document.querySelectorAll("button,input,select,textarea").forEach(node => node.disabled = false); render(); schedulePoll(); }
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
  const stateMatches = state === "all" || (state === "recent" ? recent : state === "attention" ? Boolean(skillIssue(item, snapshot))
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
// The summary and settings belong to the same entry. Build forms only when
// expanded; keep one entry open so shared credential fields never compete.
function catalogItem(item, state, scope, renderBody) {
  const key = scope === "connection" ? `${scope}:${item.id}:${item.instance}` : `${scope}:${item.id}`;
  const card = element("article", undefined, "catalog-item");
  card.dataset.entryId = item.id; card.dataset.entryKey = key;
  card.dataset.expanded = String(expandedEntry === key);
  const details = element("details", undefined, "catalog-disclosure");
  details.name = "catalog-entry";
  details.open = expandedEntry === key;
  const summary = element("summary"), text = element("span", undefined, "catalog-summary");
  const top = element("div", undefined, "catalog-card-top");
  const icon = element("span", undefined, "catalog-icon");
  icon.setAttribute("aria-hidden", "true");
  const drawing = scope === "skill" ? '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>'
    : item.id.startsWith("native:") ? '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>'
      : '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M10 6h5a3 3 0 0 1 3 3v5M14 18H9a3 3 0 0 1-3-3v-5"/>';
  icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${drawing}</svg>`;
  const action = { action: scope === "skill" ? "skill.set" : scope === "connection" ? "connection.set" : "provider.set", id: item.id };
  top.append(icon, item.supported === false ? element("span", "当前不支持", "hint") : switchFor(item.enabled !== false, `允许使用 ${item.title ?? item.id}`, action,
    { text: item.enabled === false ? "已关闭" : "允许使用" }));
  text.append(element("strong", item.title ?? item.id), element("span", shortDescription(item.description), "hint"));
  const footer = element("span", undefined, "catalog-card-footer");
  const status = element("span", state.key === "disabled" ? "关闭不删除配置" : state.label, `catalog-status${state.key === "prepared" ? " prepared" : ""}`);
  status.dataset.state = state.key;
  const affordance = element("span", undefined, "catalog-affordance");
  affordance.append(element("span", item.supported === false ? "查看说明" : scope === "skill" ? "用法与配置" : item.id.startsWith("native:") ? "权限与配置" : "连接与配置", "catalog-collapsed-label"),
    element("span", "收起配置", "catalog-expanded-label"));
  footer.append(status, affordance);
  summary.append(text, footer);
  summary.dataset.focusKey = key;
  const body = element("div", undefined, "catalog-settings");
  let mounted = false;
  const mount = () => {
    if (mounted) return;
    renderBody(body); mounted = true;
    if (busy) body.querySelectorAll("button,input,select,textarea").forEach(node => { node.disabled = true; });
  };
  if (details.open) mount();
  details.ontoggle = () => {
    if (!details.isConnected) return;
    card.dataset.expanded = String(details.open);
    if (details.open) {
      if (expandedEntry !== key) clearCredentialDrafts();
      expandedEntry = key; mount();
    }
    else {
      if (expandedEntry === key) expandedEntry = undefined;
      clearCredentialDrafts(); body.replaceChildren(); mounted = false;
    }
  };
  details.append(summary, body);
  card.append(top, details);
  return card;
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
function showSkill(id) { setTab("skills"); $("#state").value = "all"; $("#search").value = id; expandedEntry = `skill:${id}`;
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
function relatedCredentials(container, ids, scope) {
  const entries = credentialEntries(snapshot.services ?? []).filter(entry => entry.serverNames.some(id => ids.includes(id)));
  if (entries.length) renderCredentialCards(container, entries, { ...credentialOptions(scope), expandMatches: entries.length === 1 });
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
  const environment = snapshot.environments?.find(item => item.id === environmentId);
  const needed = preparationFocus?.skillId === skill.id && preparationFocus.serviceId
    ? preparationFocus.serviceId : snapshot.recentSkills?.find(item => item.id === skill.id)?.serviceId;
  if (needed) relatedCredentials(details, [needed], `skill-${skill.id}`);
  if (environment) details.append(environmentPanel(environment, { element, button, run, drafts: environmentDrafts, expanded: expandedGroups }));
  else if (environmentId) details.append(element("p", "环境状态未读取，请刷新后重试。", "hint"));
  const remainingServices = relations.credentialServiceIds.filter(id => id !== needed);
  if (remainingServices.length) {
    const accounts = disclosure(`accounts:${skill.id}`, "账户配置（使用云端时填写）");
    relatedCredentials(accounts, remainingServices, `skill-${skill.id}`); details.append(accounts);
  }
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
  categoryGroups(container, unlinkedServices(), serviceCard);
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
  if (value !== tab) clearCredentialDrafts();
  if (!SETTINGS_TABS.some(([id]) => id === value)) return;
  tab = value;
  document.querySelectorAll("[data-tab]").forEach(node => { node.classList.toggle("active", node.dataset.tab === tab); node.setAttribute("aria-selected", String(node.dataset.tab === tab)); node.tabIndex = node.dataset.tab === tab ? 0 : -1; });
  $("#state").value = "all"; $("#category").value = "all"; $("#search").value = "";
  defaultState = "all";
  expandedEntry = undefined;
  $("#content").setAttribute("aria-labelledby", `tab-${tab}`);
  notice("");
  render();
}
function renderRuntime(container) {
  const introduction = element("section", undefined, "overview-introduction");
  introduction.append(element("p", `OpenQuantum 为 ${hostName} 提供量子研究 Skills、计算工具和服务连接。从电路检查到量子模拟，在熟悉的对话里推进研究。`, "overview-description"));
  const links = element("div", undefined, "actions");
  links.append(button("浏览 Skills", () => setTab("skills"), "primary"), button("浏览 MCP", () => setTab("mcp")));
  introduction.append(links); container.append(introduction);
  container.append(element("p", `直接在 ${hostName} 对话里描述研究问题。需要安装环境或填写账户时，在对应 Skill 或 MCP 中展开配置。`, "hint home-guide"));
}
function connectionForm(connection) {
  const id = connection?.id ?? "new";
  const key = connection ? `edit:${id}` : "add";
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
    event.preventDefault(); const value = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value.trim()]));
    run({ action: connection ? "connection.update" : "connection.add", ...(connection ? { id, resetCredential: reset } : {}),
      connection: { id: value.id, transport: value.transport, authentication: value.authentication,
        ...(value.transport === "http" ? { url: value.target } : { command: value.target, args: value.args ? value.args.split("\n").filter(Boolean) : [], ...(value.authentication === "token" ? { tokenEnv: value.tokenEnv } : {}) }) } });
  };
  return form;
}
function serviceCard(server) {
  const state = providerState(server, snapshot);
  return catalogItem(server, state, "provider", body => {
    if (server.supported !== false) {
      const environment = environmentFor(server);
      if (environment) body.append(environmentPanel(environment, { element, button, run, drafts: environmentDrafts, expanded: expandedGroups }));
      relatedCredentials(body, [server.service ?? server.id], `mcp-${server.id}`);
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
  const add = disclosure("connection-add", "添加 MCP", "add-connection"); add.append(connectionForm());
  if (connectionDrafts.has("add")) add.open = true;
  categoryGroups(container, mcpEntries(), serviceCard);
  if (desktop) return;
  if (snapshot.connections.some(connection => matches(connection))) container.append(element("h2", "我的 MCP 连接", "section-title"));
  if (!snapshot.connections.length && !$("#search").value.trim() && $("#category").value === "all" && $("#state").value === "all") container.append(element("p", "还没有自定义连接。内置能力由 Agent 按任务准备。", "hint"));
  categoryGroups(container, snapshot.connections, connection => {
    const card = element("article", undefined, "card connection"); const top = element("div", undefined, "card-top");
    const state = connectionState(connection);
    top.append(element("h2", connection.id), element("span", state.label, state.key === "prepared" ? "badge" : "badge warning"));
    const choice = disclosure(`connection-choice:${connection.id}`, "MCP 开关", "saved-choice");
    choice.append(switchFor(connection.enabled, `${connection.id} 启用`, { action: "connection.set", id: connection.id }, { text: "允许使用此 MCP" }));
    card.append(top, element("p", connection.url || connection.command, "description"), element("p", connection.status.message, "hint"));
    if (connection.authentication === "token") card.append(element("span", connection.credential.unavailable ? "凭据库不可用" : connection.credential.configured ? "Token 已配置" : "需要 Token", "badge"));
    const actions = element("div", undefined, "actions");
    actions.append(button("测试连接", () => run({ action: "connection.test", id: connection.id })));
    if (connection.authentication === "token") actions.append(button("配置 Token", () => openCredential(connection.id, actions)));
    actions.append(button("移除连接", () => run({ action: "connection.remove", id: connection.id }), "danger")); card.append(actions);
    const toolList = element("details"); toolList.append(element("summary", `Tool（${connection.tools.length}）`));
    toolList.open = Boolean($("#search").value.trim());
    for (const tool of connection.tools) {
      const row = element("div", undefined, "tool-row"); const info = element("div"); info.append(element("strong", tool.title || tool.name), element("p", tool.description, "hint"));
      row.append(info, switchFor(tool.enabled, `${connection.id} ${tool.name} 启用`, { action: "connection.tool.set", id: connection.id, tool: tool.name })); toolList.append(row);
    }
    if (connection.tools.length) card.append(toolList);
    const edit = disclosure(`connection-edit:${connection.id}`, "编辑连接"); edit.append(connectionForm(connection));
    card.append(choice, edit);
    return card;
  });
  container.append(add);
}
function render() {
  $("#refresh").hidden = false;
  if (!snapshot) return;
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
    runtime: ["让量子想法运行起来。", ""],
    skills: ["Skills", "研究方法与工作流程。展开卡片查看用法、准备环境和配置账户。"],
    mcp: ["MCP", "连接工具服务。展开卡片配置账户和管理 Tools；远端可用性以实际调用为准。"],
  }[tab];
  $("#page-title").textContent = intro[0]; $("#page-description").textContent = intro[1];
  $("#page-description").hidden = !intro[1];
  $("#settings-scope").hidden = tab === "runtime" || !snapshot.scope;
  $("#settings-scope").textContent = snapshot.scope ? `生效范围：${snapshot.scope}。已保存的设置在关闭面板后仍会保留。` : "";
  filterToolbar.hidden = tab === "runtime";
  $("#search").placeholder = "搜索名称或用途";
  $("#search").setAttribute("aria-label", tab === "mcp" ? "搜索 MCP" : "搜索 Skills");
  const items = tab === "skills" ? [...skillEntries(), ...unlinkedServices()] : tab === "runtime" ? [] : [...snapshot.connections, ...mcpEntries()];
  const states = [["all", "全部"], ["enabled", "允许使用"], ["disabled", "已关闭"], ["unsupported", "当前插件不支持"]];
  if (tab === "skills") states.push(["recent", "最近选择"], ["attention", "需要处理"]);
  if (tab === "mcp") states.push(["prepared", "已准备"], ["needs_setup", "待准备"]);
  const selectedState = defaultState ?? $("#state").value;
  defaultState = null;
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
  const applied = [$("#category"), $("#state")].filter(select => select.value !== "all").map(select => select.selectedOptions[0]?.textContent);
  $("#filters summary").textContent = applied.length ? `筛选 · ${applied.join(" · ")}` : "筛选";
  $("#clear-filters").hidden = !applied.length && !$("#search").value;
  $("#count").textContent = `${t("显示 {p0} / {p1} 项", { p0: items.filter(item => matches(item)).length, p1: items.length })}`;
  const content = $("#content"); content.replaceChildren();
  if (tab === "runtime") renderRuntime(content); else if (tab === "skills") renderSkills(content); else renderMcp(content);
  if (tab !== "runtime" && !items.some(item => matches(item))) {
    const empty = element("div", undefined, "empty");
    const initial = ["recent", "relevant"].includes($("#state").value) && !$("#search").value;
    empty.append(element("p", initial ? tab === "skills" ? "在聊天中描述任务即可。Agent 选择的 Skill 会出现在这里。" : "目前没有需要填写的账户。用到云端能力时，再配置对应凭据。" : "没有匹配的项目"), button(initial ? tab === "skills" ? "浏览全部 Skill" : "查看全部账户" : "清除筛选", () => { $("#search").value = ""; $("#category").value = "all"; $("#state").value = "all"; render(); }));
    content.append(empty);
  }
  const restored = focusedFilter?.isConnected ? focusedFilter : focusedDraft ? [...document.querySelectorAll("[data-focus-key]")].find(input => input.dataset.focusKey === focusedDraft) : null;
  if (restored) { restored.focus({ preventScroll: true }); if (selection && restored.setSelectionRange) restored.setSelectionRange(...selection); }
}
document.querySelectorAll("[data-tab]").forEach(node => { node.textContent = SETTINGS_TABS.find(([id]) => id === node.dataset.tab)?.[1]; });
document.querySelectorAll("[data-tab]").forEach(node => {
  node.tabIndex = node.dataset.tab === tab ? 0 : -1;
  node.onclick = () => setTab(node.dataset.tab);
  node.onkeydown = event => {
    const tabs = [...document.querySelectorAll("[data-tab]")].filter(item => !item.hidden), index = tabs.indexOf(node);
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next !== null) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
  };
});
const filterChanged = () => { notice(""); render(); };
$("#search").oninput = event => { if (!event.isComposing) { if (["recent", "relevant"].includes($("#state").value)) $("#state").value = "all"; filterChanged(); } };
$("#search").addEventListener("compositionend", filterChanged);
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
      if (result._meta?.openquantumSettings) snapshot = result._meta.openquantumSettings;
      if (snapshot && preparationFocus?.skillId) showSkill(preparationFocus.skillId);
    };
    await app.connect(); theme(app.getHostContext());
  }
  await run({ action: "snapshot" });
  if (preparationFocus?.skillId) showSkill(preparationFocus.skillId);
} catch (error) { notice(error.message, true); }
