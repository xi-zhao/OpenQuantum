import { credentialCardCss } from "../../../src/settings/credential-card.mjs";
import { credentialField } from "../../../src/settings/credential-field.mjs";
import { sealCredentialField } from "../../../src/settings/credential-seal.mjs";
export { credentialEntries } from "./credential-groups.mjs";

const style = document.createElement("style"); style.textContent = credentialCardCss; document.head.append(style);
const drafts = new Map();
const pending = new Set();
const failures = new Set();
const expanded = new Map();
const fieldSelections = new Map();
export const clearCredentialDrafts = () => drafts.clear();
window.addEventListener("pagehide", clearCredentialDrafts);

export function h(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || name === "key") continue;
    if (name.startsWith("on")) node.addEventListener(name === "onChange" ? "input" : name.slice(2).toLowerCase(), value);
    else if (name.startsWith("aria-") || name.startsWith("data-")) node.setAttribute(name, value);
    else node[{ autoComplete: "autocomplete", spellCheck: "spellcheck" }[name] ?? name] = value;
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}

export function renderCredentialCards(container, entries, { request, refresh, notice, openLink, fallback, expandMatches = false, scope = "credentials" }) {
  const grid = h("div", { className: "oq-cap-credential-grid oq-service-grid" });
  container.append(grid);
  for (const entry of entries) {
    const card = h("article", { className: "oq-cap-credential oq-service-credential", "aria-label": entry.title });
    const key = `${scope}:${entry.id}`;
    const details = h("details", { className: "oq-service-fields", open: expanded.get(key) ?? expandMatches, onToggle: event => {
      if (event.currentTarget.isConnected) expanded.set(key, event.currentTarget.open);
    } }, h("summary", { className: "oq-credential-heading" },
      h("span", { className: "oq-cap-card-head" }, h("strong", null, entry.title),
        h("span", { className: "oq-cap-badge", "data-tone": entry.configuration === "configured" ? "ready" : "off" }, entry.stateLabel)),
      h("span", { className: "oq-cap-desc" }, entry.description),
      h("span", { className: "oq-credential-affordance" }, entry.supported ? "配置凭据" : "查看配置要求")));
    if (entry.note) details.append(h("p", { className: "oq-cap-meta" }, entry.note));
    const fields = h("fieldset", null, h("legend", { className: "oq-visually-hidden" }, `${entry.title} 凭据`));
    if (entry.supported) fields.append(h("p", { className: "oq-cap-secret-help" }, "已有值不回显；留空保留。逐项保存到本机凭据库，保存不代表账户认证通过。"));
    else fields.append(h("p", { className: "oq-cap-secret-help" }, entry.services[0].availabilityNote ?? "请在宿主 Tool 使用的环境中配置认证，具体要求见官方说明。"));
    const selection = entry.id === "fieldqkit" ? {
      title: "选择平台", choices: entry.fields.map(field => [field.name, field.title]),
      initial: entry.fields.find(field => field.configured)?.name ?? entry.fields[0].name,
      includes: (field, value) => field.name === value,
    } : entry.id === "pasqal_cloud" ? {
      title: "认证方式", choices: [["token", "Access Token"], ["password", "用户名与密码"]],
      initial: entry.fields.some(field => field.name === "PASQAL_AUTH_TOKEN" && field.configured) || !entry.saved ? "token" : "password",
      includes: (field, value) => value === "token" ? field.name === "PASQAL_AUTH_TOKEN" : field.name !== "PASQAL_AUTH_TOKEN",
    } : null;
    if (selection) {
      const value = fieldSelections.get(key) ?? selection.initial;
      const select = h("select", { "aria-label": selection.title, "data-focus-key": `${key}:selection` },
        selection.choices.map(([id, title]) => h("option", { value: id }, title)));
      select.value = value;
      const rows = entry.fields.map(field => { const row = renderField(field); row.hidden = !selection.includes(field, value); return row; });
      select.onchange = () => {
        fieldSelections.set(key, select.value);
        rows.forEach((row, index) => { row.hidden = !selection.includes(entry.fields[index], select.value); });
      };
      fields.append(h("label", { className: "credential-selection" }, selection.title, select), ...rows);
    } else for (const field of entry.fields) fields.append(renderField(field));
    const help = h("details", { className: "technical-details" }, h("summary", null, "配置说明与变量"));
    const documents = new Map();
    for (const field of entry.fields) if (field.documentationUrl) documents.set(field.documentationUrl, [...(documents.get(field.documentationUrl) ?? []), field]);
    for (const [url, fields] of documents) help.append(h("a", {
      className: "oq-cap-link", href: url, target: "_blank", rel: "noreferrer", onClick: event => { event.preventDefault(); void openLink(url); },
    }, `${documents.size === 1 || fields.length > 1 ? entry.title : fields[0].title}配置说明`));
    for (const field of entry.fields) help.append(h("p", { className: "oq-cap-secret-help" }, `${field.title}：`, h("code", null, field.name)));
    fields.append(help);
    details.append(fields); card.append(details); grid.append(card);
  }

  function renderField(field) {
    const service = field.services.find(item => item.supported);
    const title = field.name === "OQC_API_ENDPOINT" ? "服务 HTTPS 地址" : field.title;
    const unavailable = field.unavailable ?? service?.configuration === "unavailable";
    // A failed read can be repaired by replacing a conflicting saved value.
    const disabled = !service || field.writable === false || pending.has(field.name);
    let row, confirmRemoval = false;
    const write = async operation => {
      if (disabled || pending.has(field.name)) return;
      const input = row.querySelector("input");
      if (operation === "set" && !input.value.trim()) return;
      if (operation === "remove" && !confirmRemoval) {
        confirmRemoval = true;
        const remove = row.querySelector('[data-danger="true"]');
        remove.textContent = "确认移除";
        const cancel = h("button", { type: "button", className: "oq-cap-button", onClick: () => {
          confirmRemoval = false; remove.textContent = "移除"; cancel.remove();
        } }, "取消");
        remove.after(cancel);
        return;
      }
      pending.add(field.name);
      row.querySelectorAll("input,button").forEach(node => node.disabled = true);
      let attempted = false, failed = false, offerFallback = true, message;
      try {
        const permission = await request({ action: "credential.field.prepare", id: service.id, field: field.name, operation });
        const ciphertext = await sealCredentialField(permission, operation === "set" ? { value: input.value } : {});
        input.value = ""; drafts.delete(field.name);
        attempted = true;
        const result = await request({ action: "credential.field.commit", nonce: permission.nonce, ciphertext });
        if (result.status !== 200) { attempted = result.status >= 500; offerFallback = ![400, 409].includes(result.status); throw new Error(result.message); }
        message = result.message;
        failures.delete(field.name);
      } catch (error) {
        failed = true;
        if (offerFallback) failures.add(field.name); else failures.delete(field.name);
        message = attempted ? "保存结果尚未确认，请先查看刷新后的状态；本次不会自动重试。也可使用独立凭据窗口。" : error.message;
      } finally {
        input.value = ""; drafts.delete(field.name); pending.delete(field.name);
        // A network error may arrive after the write. Read state, never retry it.
        try { await refresh(); } catch { failed = true; message += " 状态刷新失败，请稍后刷新。"; }
        notice(message, failed);
      }
    };
    const required = field.services.some(item => item.supported && item.fields.some(value => value.name === field.name && value.required));
    const status = !service ? "云端未接入" : unavailable ? "未读取" : field.configured ? "已保存" : required ? "云端必填" : service.missing?.includes(field.name) ? "待补全" : "选填";
    row = h("div", { className: "oq-service-field" },
      h("div", { className: "oq-service-field-heading" },
        h("span", null, title), h("span", { className: "oq-cap-badge", "data-tone": field.configured ? "ready" : "off" }, status)));
    if (service) row.append(credentialField(h, { id: `${scope}-credential-${field.name}`, title,
      configured: field.configured, value: drafts.get(field.name) ?? "", disabled, secret: field.secret, maxLength: 4096,
      description: service.id === "pasqal_cloud" ? undefined : field.description,
      help: field.writable === false ? "由宿主环境提供，请在对应认证来源修改。" : unavailable ? "已有配置暂时无法读取。可重新保存以统一配置；如保存失败，请检查本机凭据库权限。" : undefined,
      onChange: event => { drafts.set(field.name, event.currentTarget.value); row.querySelector('[data-primary="true"]').disabled = disabled || !event.currentTarget.value.trim(); },
      actions: h("div", { className: "oq-cap-actions" },
        h("button", { type: "button", className: "oq-cap-button", "data-primary": "true", disabled: disabled || !(drafts.get(field.name) ?? "").trim(), onClick: () => void write("set") }, "保存"),
        field.configured ? h("button", { type: "button", className: "oq-cap-button", "data-danger": "true", disabled, onClick: () => void write("remove") }, "移除") : null),
    }));
    else row.append(h("p", { className: "oq-cap-secret-help" }, field.description), h("code", { className: "oq-cap-code" }, field.name));
    if (service) {
      const input = row.querySelector("input");
      input.dataset.focusKey = `${scope}-credential-${field.name}`;
      if (!field.configured) {
        if (field.name.endsWith("_PASSWORD")) input.placeholder = "输入密码";
        else if (field.name.endsWith("_USERNAME")) input.placeholder = "输入用户名";
        else if (["QCPORTAL_ADDRESS", "OQC_API_ENDPOINT"].includes(field.name)) input.placeholder = "输入 HTTPS 地址";
      }
    }
    if (field.configured) row.append(h("p", { className: "oq-cap-secret-help" }, "移除只影响后续调用，不会更改使用限制。"));
    if (service && failures.has(field.name)) row.append(h("button", { type: "button", className: "oq-cap-button", onClick: () => fallback(service.id, row) }, "使用独立凭据窗口"));
    return row;
  }
}
