import { credentialField, credentialFieldCss } from "../credential-field.mjs";

export const credentialHtml = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OpenQuantum · 安全凭据</title><link rel="stylesheet" href="/credential.css"><main><p>OPENQUANTUM · 本机配置</p><h1>安全凭据</h1><p id="connection"></p><p>直接保存到本机系统凭据库。已有值不会回显；留空保留已有值。</p><form><div id="fields"></div><button type="submit" disabled>保存配置</button><button type="button" id="remove" disabled>移除全部凭据</button></form><p id="status" role="status" aria-live="polite">正在读取配置状态…</p></main><script src="/credential.js"></script></html>`;
export const credentialCss = credentialFieldCss + `body{font:15px/1.6 system-ui;background:#f5f8fc;color:#102c44;margin:0}main{max-width:560px;margin:5vh auto;padding:28px;background:white;border:1px solid #dce5eb;border-radius:16px}h1{font-size:24px}#fields{display:grid;gap:18px}.oq-cap-field{border-top:1px solid #dce5eb;padding-top:18px}.oq-cap-field label{margin:0}p{line-height:1.7}label{display:block;margin:18px 0}input:not([type=checkbox]){box-sizing:border-box;display:block;margin-top:8px;width:100%;padding:12px;border:1px solid #b9cbd7;border-radius:8px;font:inherit}small{display:block;color:#65788b;overflow-wrap:anywhere}.remove-field{font-size:12px;margin:6px 0}button{padding:11px 18px;margin:10px 8px 0 0;border:0;border-radius:8px;background:#0a706f;color:white;cursor:pointer}button:disabled{opacity:.5;cursor:default}#remove{background:#e5ecf2;color:#243e54}#status{min-height:50px}@media(max-width:600px){main{margin:12px;padding:20px}}`;

function credentialPage(renderField) {
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props ?? {})) {
      if (value === undefined || value === null) continue;
      if (name === "onChange") node.addEventListener("input", value);
      else if (name.startsWith("aria-")) node.setAttribute(name, value);
      else node[{ autoComplete: "autocomplete", spellCheck: "spellcheck" }[name] ?? name] = value;
    }
    for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child);
    return node;
  }
  const nonce = location.hash.slice(1);
  history.replaceState(null, "", location.pathname);
  const status = document.querySelector("#status"), form = document.querySelector("form");
  const inputs = new Map(), removals = new Map();
  let service = false, ready = false, submitting = false;
  async function post(route, input) {
    const response = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nonce, ...input }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  }
  async function send(action) {
    if (!ready || submitting) return;
    submitting = true;
    form.querySelectorAll("button").forEach(button => button.disabled = true);
    status.textContent = "正在保存到系统凭据库…";
    try {
      const values = Object.fromEntries([...inputs].filter(([, input]) => input.value).map(([name, input]) => [name, input.value]));
      const remove = [...removals].filter(([, input]) => input.checked).map(([name]) => name);
      if (action === "set" && !Object.keys(values).length && !remove.length) {
        status.textContent = "没有修改配置。填写新值或勾选移除后再保存。";
        form.querySelectorAll("button").forEach(button => button.disabled = false);
        return;
      }
      const data = await post("/credential", { action, ...(service ? { values, remove } : { value: values.token }) });
      status.textContent = data.message;
      ready = false;
    } catch (error) {
      status.textContent = error.message + " 请从设置页重新打开此窗口。";
      ready = false;
    } finally {
      inputs.forEach(input => input.value = "");
      submitting = false;
    }
  }
  form.onsubmit = event => { event.preventDefault(); void send("set"); };
  document.querySelector("#remove").onclick = () => {
    if (confirm("移除这个服务保存的全部凭据？此操作只影响本机配置。")) void send("remove");
  };
  post("/credential-info", {}).then(data => {
    document.querySelector("#connection").textContent = data.connection;
    service = data.service === true;
    for (const field of data.fields ?? [{ name: "token", title: "Token", secret: true }]) {
      const card = renderField(h, { id: "credential-" + field.name, title: field.title, reference: field.name,
        configured: field.configured, secret: field.secret, description: field.description, documentationUrl: field.documentationUrl,
        maxLength: service ? 4096 : 8192,
        help: (field.required ? "远程操作必填" : "可选") + (field.configured ? " · 已保存；留空保持" : " · 尚未配置") });
      const input = card.querySelector("input");
      document.querySelector("#fields").append(card); inputs.set(field.name, input);
      if (service && field.configured) {
        const clearLabel = document.createElement("label"); clearLabel.className = "remove-field";
        const clear = document.createElement("input"); clear.type = "checkbox"; clear.setAttribute("aria-label", "移除 " + field.title);
        clear.disabled = data.canRemove === false;
        clear.onchange = () => { input.disabled = clear.checked; if (clear.checked) input.value = ""; };
        clearLabel.append(clear, document.createTextNode("移除此项")); card.append(clearLabel); removals.set(field.name, clear);
      }
    }
    ready = true;
    form.querySelectorAll("button").forEach(button => button.disabled = false);
    document.querySelector("#remove").disabled = data.canRemove === false;
    status.textContent = data.canRemove === false ? "服务已启用。可更新凭据；请先关闭服务，再移除凭据。" : "保存只更新配置，不验证账户、不提交任务。";
  }).catch(error => status.textContent = error.message);
}
export const credentialJs = `(${credentialPage.toString()})(${credentialField.toString()});`;
