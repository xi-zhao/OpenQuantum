import { credentialCard, credentialCardCss } from "../../../src/settings/credential-card.mjs";
import { sealCredentialField } from "../../../src/settings/credential-seal.mjs";

const style = document.createElement("style"); style.textContent = credentialCardCss; document.head.append(style);
const drafts = new Map();
const pending = new Set();
const failures = new Set();
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

export function credentialEntries(services) {
  const entries = new Map();
  // Match the Desktop service-key page: platforms first, one card per variable.
  const ordered = [...services.filter(service => service.id === "fieldqkit"), ...services.filter(service => service.id !== "fieldqkit")];
  for (const service of ordered) for (const field of service.fields) {
    const entry = entries.get(field.name);
    if (entry) { entry.services.push(service); entry.serverNames.push(service.id); continue; }
    entries.set(field.name, { id: field.name, title: field.displayName ?? field.title, description: field.description,
      category: service.category, field, services: [service], serverNames: [service.id],
      configuration: !service.supported ? "unsupported" : service.configuration === "unavailable" ? "unavailable" : field.configured ? "configured" : "incomplete" });
  }
  return [...entries.values()];
}

export function renderCredentialCards(container, entries, { request, refresh, notice, openLink, fallback }) {
  const grid = h("div", { className: "oq-cap-credential-grid" });
  container.append(grid);
  for (const entry of entries) {
    const { field } = entry, service = entry.services.find(item => item.supported);
    const unavailable = service?.configuration === "unavailable";
    const disabled = !service || unavailable || pending.has(field.name);
    let card, confirmRemoval = false;
    const write = async operation => {
      if (disabled || pending.has(field.name)) return;
      const input = card.querySelector("input");
      if (operation === "set" && !input.value.trim()) return;
      if (operation === "remove" && !confirmRemoval) {
        confirmRemoval = true;
        const remove = card.querySelector('[data-danger="true"]');
        remove.textContent = "确认移除";
        const cancel = h("button", { type: "button", className: "oq-cap-button", onClick: () => {
          confirmRemoval = false; remove.textContent = "移除"; cancel.remove();
        } }, "取消");
        remove.after(cancel);
        return;
      }
      pending.add(field.name);
      card.querySelectorAll("input,button").forEach(node => node.disabled = true);
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
    const availability = !service ? entry.services[0].availabilityNote ?? "当前通过 SDK 环境配置，本页尚未接入保存。" :
      unavailable ? "系统凭据库暂时不可用，请检查系统权限后刷新。" :
        service.pairs?.some(pair => pair.includes(field.name)) ? "用户名和密码需要成对配置。可逐项保存，配齐后才能使用账户认证。" : undefined;
    card = credentialCard(h, { credential: { ref: field.name, displayName: entry.title, description: entry.description, serverNames: entry.serverNames, documentationUrl: field.documentationUrl },
      configured: field.configured, value: drafts.get(field.name) ?? "", disabled, secret: field.secret, maxLength: 4096,
      removeBlocked: service?.enabled, removalNote: "此服务已启用；请先关闭对应服务，再移除凭据。",
      stateLabel: !service ? "需单独配置" : unavailable ? "未读取" : undefined, availabilityNote: availability,
      help: !service ? "本页仅展示配置要求，请按上方说明配置。" : "密钥保存在本机凭据库；已有值不会显示，也不会写入项目配置文件。",
      onChange: event => { drafts.set(field.name, event.currentTarget.value); card.querySelector('[data-primary="true"]').disabled = disabled || !event.currentTarget.value.trim(); },
      onSave: () => void write("set"), onRemove: () => void write("remove"),
      onDocumentation: event => { event.preventDefault(); void openLink(field.documentationUrl); },
    });
    if (service && failures.has(field.name)) card.append(h("button", { type: "button", className: "oq-cap-button", onClick: () => fallback(service.id, card) }, "使用独立凭据窗口"));
    grid.append(card);
  }
}
