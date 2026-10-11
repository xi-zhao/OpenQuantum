import { App } from "@modelcontextprotocol/ext-apps";
import { openHostLink } from "./open-link.mjs";
import "./style.css";

const $ = selector => document.querySelector(selector);
let snapshot, tab = "skills", busy = false, app;
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
async function run(input) {
  if (busy) return;
  busy = true;
  notice(input.action === "connection.test" ? "正在连接 MCP 并读取工具清单…" : "正在更新设置…");
  document.querySelectorAll("button,input,select,textarea").forEach(node => node.disabled = true);
  try { snapshot = await request({ ...input, ...(snapshot && input.action !== "snapshot" ? { revision: snapshot.revision } : {}) }); notice(snapshot.notice); }
  catch (error) { notice(error.message, true); }
  finally { busy = false; document.querySelectorAll("button,input,select,textarea").forEach(node => node.disabled = false); render(); }
}
function switchFor(checked, label, action) {
  const node = element("label", undefined, "switch");
  const input = element("input"); input.type = "checkbox"; input.checked = checked; input.setAttribute("aria-label", label);
  input.onchange = () => run({ ...action, enabled: input.checked }); node.append(input, element("span", checked ? "已启用" : "已关闭")); return node;
}
function button(text, action, className) { const node = element("button", text, className); node.type = "button"; node.onclick = action; return node; }
function matches(item) { return `${item.title || ""} ${item.id} ${item.description || ""}`.toLowerCase().includes($("#search").value.toLowerCase()); }
function renderSkills(container) {
  const grid = element("div", undefined, "grid");
  for (const skill of snapshot.skills.filter(matches)) {
    const card = element("article", undefined, "card"); const top = element("div", undefined, "card-top");
    top.append(element("h2", skill.title), switchFor(skill.enabled, `${skill.title} 启用`, { action: "skill.set", id: skill.id }));
    const unavailable = skill.tools.filter(name => { const tool = snapshot.tools.find(item => item.id === name); return !tool?.enabled || !snapshot.providers.find(item => item.id === tool.provider)?.enabled; });
    card.append(top, element("p", skill.description, "description"), element("span", skill.tools.length ? `${skill.tools.length} 个关联 Tool` : "知识与方法 Skill", "badge"));
    if (unavailable.length) card.append(element("p", `部分关联工具未启用：${unavailable.join("、")}`, "hint"));
    grid.append(card);
  }
  container.append(grid); $("#count").textContent = `${snapshot.skills.filter(skill => skill.enabled).length} / ${snapshot.skills.length} 项启用`;
}
function renderTools(container) {
  const grid = element("div", undefined, "grid");
  for (const tool of snapshot.tools.filter(matches)) {
    const card = element("article", undefined, "card"); const top = element("div", undefined, "card-top");
    top.append(element("h2", tool.title), switchFor(tool.enabled, `${tool.title} 启用`, { action: "tool.set", id: tool.id }));
    const provider = snapshot.providers.find(item => item.id === tool.provider);
    card.append(top, element("p", tool.description, "description"), element("span", provider?.enabled ? (tool.readOnly ? "只读计算或查询" : "可能产生写入") : "所属连接已关闭", `badge ${provider?.enabled ? "" : "warning"}`));
    grid.append(card);
  }
  container.append(element("p", "内置工具在此勾选；新增 MCP 的工具在对应连接下勾选。关闭 Tool 会阻止新的调用。", "hint"), grid);
  $("#count").textContent = `${snapshot.tools.filter(tool => tool.enabled).length} / ${snapshot.tools.length} 项配置启用`;
}
async function openCredential(id, container) {
  try {
    const { url } = await request({ action: "credentials.open", id });
    container.querySelector(".credential-window")?.remove();
    const panel = element("div", undefined, "credential-window");
    const link = element("a", "打开本机凭据窗口", "credential-link"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
    const label = element("label", "窗口未打开时，复制本机地址到浏览器：");
    const address = element("input"); address.type = "text"; address.readOnly = true; address.value = url;
    address.setAttribute("aria-label", "本机凭据窗口地址"); address.onclick = () => address.select(); label.append(address);
    panel.append(link, label, element("p", "地址短时有效，请勿发送到聊天中。保存后返回这里刷新状态或测试连接。", "hint"));
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
}
function renderConnections(container) {
  const form = element("form", undefined, "card"); form.append(element("h2", "添加 MCP 连接"));
  const fields = element("div", undefined, "form-grid"); const inputs = {};
  const field = (name, title, kind, options) => {
    const label = element("label", title); const input = element(kind || "input"); input.name = name;
    if (options) for (const [value, title] of options) { const option = element("option", title); option.value = value; input.append(option); }
    if (name === "args") label.className = "wide";
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
  container.append(form, element("h2", "我的 MCP 连接", "section-title"));
  if (!snapshot.connections.length) container.append(element("p", "还没有自定义连接。内置量子工具可直接使用。", "hint"));
  for (const connection of snapshot.connections.filter(matches)) {
    const card = element("article", undefined, "card connection"); const top = element("div", undefined, "card-top");
    top.append(element("h2", connection.id), switchFor(connection.enabled, `${connection.id} 启用`, { action: "connection.set", id: connection.id }));
    card.append(top, element("p", connection.url || connection.command, "description"), element("p", connection.status.message, "hint"));
    if (connection.authentication === "token") card.append(element("span", connection.credential.configured ? "Token 已配置" : "需要 Token", "badge"));
    const actions = element("div", undefined, "actions");
    actions.append(button("测试连接", () => run({ action: "connection.test", id: connection.id })));
    if (connection.authentication === "token") actions.append(button("配置 Token", () => openCredential(connection.id, actions)));
    actions.append(button("移除连接", () => run({ action: "connection.remove", id: connection.id }), "danger")); card.append(actions);
    for (const tool of connection.tools) {
      const row = element("div", undefined, "tool-row"); const info = element("div"); info.append(element("strong", tool.title || tool.name), element("p", tool.description, "hint"));
      row.append(info, switchFor(tool.enabled, `${connection.id} ${tool.name} 启用`, { action: "connection.tool.set", id: connection.id, tool: tool.name })); card.append(row);
    }
    container.append(card);
  }
  const builtins = element("details"); builtins.append(element("summary", `内置工具连接（${snapshot.providers.length}）`));
  for (const provider of snapshot.providers) {
    const row = element("div", undefined, "tool-row"); row.append(element("div", provider.title), switchFor(provider.enabled, `${provider.title} 启用`, { action: "provider.set", id: provider.id })); builtins.append(row);
  }
  container.append(builtins); $("#count").textContent = `${snapshot.connections.length} 个自定义连接`;
}
function render() {
  if (!snapshot) return;
  const content = $("#content"); content.replaceChildren();
  if (tab === "skills") renderSkills(content); else if (tab === "tools") renderTools(content); else renderConnections(content);
  if (!content.querySelector(".card")) content.append(element("p", "没有匹配的能力", "empty"));
}
document.querySelectorAll("[data-tab]").forEach(node => node.onclick = () => { tab = node.dataset.tab; $("#search").value = ""; document.querySelectorAll("[data-tab]").forEach(button => button.classList.toggle("active", button === node)); render(); });
$("#search").oninput = render;
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
  if (!preview) { app = new App({ name: "OpenQuantum Settings", version: "__RELEASE_VERSION__" }); await app.connect(); }
  await run({ action: "snapshot" });
} catch (error) { notice(error.message, true); }
