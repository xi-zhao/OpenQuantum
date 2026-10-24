import { readFile } from "node:fs/promises";
import path from "node:path";
import { readComponentDirectory } from "../../src/settings/component-directory.mjs";
import { SETTINGS_TABS } from "../../runtime/chatgpt/ui/settings-model.mjs";

export function componentNavigation(copy = {}) {
  const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  return SETTINGS_TABS.map(([id, label]) => `<button data-tab="${id}"${["tools", "mcp"].includes(id) ? ' data-advanced hidden' : ""} role="tab" aria-selected="${id === "runtime"}"${id === "runtime" ? ' class="active"' : ""}>${escape(copy[label] ?? label)}</button>`).join("\n");
}

// Build from shared declarations, never from a user's Desktop settings or Home.
export async function componentDirectory(projectRoot) {
  const directory = await readComponentDirectory(projectRoot);
  const source = JSON.parse(await readFile(path.join(projectRoot, "src/settings/locales/openquantum-source.json"), "utf8"));
  return { schemaVersion: 1, copy: source["settings.openquantumCapabilities"].zh, ...directory };
}
