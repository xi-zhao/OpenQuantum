// The Desktop credential form's presentation is shared with the Codex window.
// Hosts supply rendering, translation, events and storage; this module does no IO.
export const credentialFieldCss = `
.oq-cap-field{display:flex;flex-direction:column;gap:5px}
.oq-cap-field label,.oq-cap-field>span{color:var(--dsw-alias-label-secondary,#526473);font-size:12px}
.oq-cap-input{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2,#dce5eb);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#14314a);font:inherit;font-size:13px;padding:10px 12px;outline:none}
.oq-cap-input:focus{border-color:var(--dsw-alias-state-business-primary,#11756f)}
.oq-cap-secret-help{color:var(--dsw-alias-label-tertiary,#65788b);font-size:11px;line-height:18px;margin:5px 0 0}
.oq-cap-credential-details{margin:8px 0}.oq-cap-credential-details summary{cursor:pointer;font-size:11px;color:var(--dsw-alias-label-tertiary,#65788b)}
.oq-cap-credential-details code{overflow-wrap:anywhere;font-size:11px}
.oq-cap-credential-link{color:var(--dsw-alias-state-business-primary,#11756f);font-size:12px}
`;

export function credentialField(h, options) {
  const { id, title, secret = true, configured, value, disabled, onChange,
    description, documentationUrl, reference, help, actions, maxLength = 8192,
    t = key => key } = options;
  return h("div", { className: "oq-cap-field" },
    h("label", { htmlFor: id }, title),
    description ? h("p", { className: "oq-cap-secret-help" }, description) : null,
    h("input", { id, name: reference, className: "oq-cap-input", type: secret ? "password" : "text",
      autoComplete: "off", spellCheck: false, value, disabled, maxLength,
      "aria-label": title, placeholder: configured ? t("输入新值以替换") : secret ? t("粘贴 API Key / Token") : t("输入新值"),
      onChange }),
    help ? h("p", { className: "oq-cap-secret-help" }, help) : null,
    documentationUrl ? h("a", { className: "oq-cap-credential-link", href: documentationUrl, target: "_blank", rel: "noreferrer" }, t("获取凭据")) : null,
    reference ? h("details", { className: "oq-cap-credential-details" },
      h("summary", null, t("查看配置变量")), h("code", null, reference)) : null,
    actions,
  );
}
