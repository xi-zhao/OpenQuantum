import { credentialField, credentialFieldCss } from "./credential-field.mjs";

// The complete Desktop service-key card. Hosts supply events and credential IO.
export const credentialCardCss = credentialFieldCss + `
.oq-cap-credential-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.oq-cap-credential{display:flex;flex-direction:column;justify-content:space-between;gap:16px;min-width:0;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:18px;background:var(--dsw-alias-bg-layer-1)}
.oq-cap-credential .oq-cap-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.oq-cap-credential .oq-cap-title{min-width:0}.oq-cap-credential h3{font-size:16px;line-height:24px;margin:0;overflow-wrap:anywhere}
.oq-cap-credential .oq-cap-code{display:block;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,monospace);font-size:12px;line-height:20px;overflow-wrap:anywhere;white-space:normal}
.oq-cap-credential .oq-cap-badge{border-radius:8px;padding:3px 8px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap}
.oq-cap-credential .oq-cap-badge[data-tone=ready]{color:var(--dsw-alias-state-success-primary)}
.oq-cap-credential .oq-cap-desc{font-size:13px;line-height:22px;margin:14px 0;color:var(--dsw-alias-label-secondary)}
.oq-cap-credential .oq-cap-meta{font-size:12px;line-height:20px;margin:4px 0;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.oq-cap-credential .oq-cap-link{font-size:12px;color:var(--dsw-alias-state-business-primary);text-decoration:none}.oq-cap-credential .oq-cap-link:hover{text-decoration:underline}
.oq-cap-credential .oq-cap-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.oq-cap-credential .oq-cap-button{font:inherit;font-size:13px;padding:8px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer}
.oq-cap-credential .oq-cap-button[data-primary=true]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);border-color:transparent}
.oq-cap-credential .oq-cap-button[data-danger=true]{color:var(--dsw-alias-state-error-primary)}
.oq-cap-credential .oq-cap-button:disabled,.oq-cap-credential input:disabled{opacity:.48;cursor:not-allowed}
.oq-cap-credential .oq-cap-field{margin-top:auto}.oq-cap-credential .oq-cap-input{min-height:42px}
@media(max-width:700px){.oq-cap-credential-grid{grid-template-columns:1fr}}
`;

export function credentialCard(h, options) {
  const { credential, configured, value = "", disabled = false, removeBlocked = false,
    onChange, onSave, onRemove, help, removalNote, availabilityNote, stateLabel, onDocumentation,
    secret = true, maxLength = 8192, t = (key, params) => params ? key.replace("{p0}", params.p0) : key } = options;
  return h("article", { className: "oq-cap-card oq-cap-credential", "aria-label": t(credential.displayName) },
    h("div", null,
      h("div", { className: "oq-cap-card-head" },
        h("div", { className: "oq-cap-title" }, h("h3", null, t(credential.displayName)), h("code", { className: "oq-cap-code" }, credential.ref)),
        h("span", { className: "oq-cap-badge", "data-tone": configured ? "ready" : "off" }, stateLabel ?? (configured ? t("已配置") : t("未配置")))),
      h("p", { className: "oq-cap-desc" }, t(credential.description)),
      h("p", { className: "oq-cap-meta" }, t("用于：{p0}", { p0: credential.serverNames.join(", ") || "自定义 MCP" })),
      credential.documentationUrl ? h("a", { className: "oq-cap-link", href: credential.documentationUrl, target: "_blank", rel: "noreferrer", onClick: onDocumentation }, t("获取凭据")) : null,
      availabilityNote ? h("p", { className: "oq-cap-meta" }, availabilityNote) : null),
    credentialField(h, { id: `credential-${credential.ref}`, title: t("输入新值"), configured, value, disabled, onChange, secret, maxLength, t, help,
      actions: [
        removeBlocked && removalNote ? h("p", { className: "oq-cap-secret-help" }, removalNote) : null,
        h("div", { className: "oq-cap-actions" },
          h("button", { type: "button", className: "oq-cap-button", "data-primary": "true", disabled: disabled || value.trim() === "", onClick: onSave }, t("保存")),
          configured ? h("button", { type: "button", className: "oq-cap-button", "data-danger": "true", disabled: disabled || removeBlocked, onClick: onRemove }, t("移除")) : null),
      ] }),
  );
}
