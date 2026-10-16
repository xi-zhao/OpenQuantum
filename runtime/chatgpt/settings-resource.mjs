import { createHash } from "node:crypto";

export const OPENER = "open_openquantum_settings";
export const SETTINGS_TOOL = "openquantum_settings";
// Discovery and app resources can use different MCP processes. Identify the
// bundle, never its process-local credential port; each read binds its own CSP.
export function settingsResourceUri(html) {
  const bundle = html.replace(/<meta name="openquantum-credential-origin" content="http:\/\/127\.0\.0\.1:\d+">/, "<!-- CREDENTIAL_ORIGIN -->");
  return `ui://openquantum/settings/${createHash("sha256").update(bundle).digest("hex")}.html`;
}
export function prepareSettingsDocument(html, origin) {
  if (!origin) return html;
  const url = new URL(origin);
  if (url.origin !== origin || url.protocol !== "http:" || url.hostname !== "127.0.0.1") throw new Error("Invalid credential origin");
  return html.replace("<!-- CREDENTIAL_ORIGIN -->", `<meta name="openquantum-credential-origin" content="${url.origin}">`);
}
