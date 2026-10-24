import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDocument, stringify } from "yaml";

// These rows are product entry points. Keep Cordis, MCP and Tool registration intact.
export const HIDDEN_UPSTREAM_UI = Object.freeze([
  "ui-settings-account", "account-controller", "ui-plugin-manager",
  "ui-settings-plugin-inventory", "ui-settings-plugins",
]);

export const HIDDEN_DESKTOP_UI = Object.freeze([
  ...HIDDEN_UPSTREAM_UI, "ui-cordis", "ui-agent-preset", "ui-schedule", "ui-settings-general",
]);

export function productUiPatch(source, { desktop = false } = {}) {
  const document = parseDocument(source);
  if (document.errors.length) throw new Error("Cannot inspect the pinned Harness UI profile");
  const ids = new Set();
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (typeof value.id === "string") ids.add(value.id);
    for (const child of Object.values(value)) visit(child);
  }
  visit(document.toJS());
  // Different pinned DSH releases have different rows; never create a patch for
  // an absent row. Adding a future upstream entry requires explicit review here.
  return (desktop ? HIDDEN_DESKTOP_UI : HIDDEN_UPSTREAM_UI).filter(id => ids.has(id)).map(id => ({ id, disabled: true }));
}

export async function productUiOverlay(projectRoot, options) {
  const source = await readFile(path.join(projectRoot, "node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml"), "utf8");
  return stringify(productUiPatch(source, options));
}
