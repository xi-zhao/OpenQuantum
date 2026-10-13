import { readFile } from "node:fs/promises";
import path from "node:path";
import { readProjectSettings } from "../../src/settings/server/project-settings.mjs";
import { COMPONENT_TABS } from "../../src/settings/component-view.mjs";

export function componentNavigation(copy = {}) {
  const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  return COMPONENT_TABS.map(([id, label]) => `<button data-tab="${id}" role="tab" aria-selected="${id === "runtime"}"${id === "runtime" ? ' class="active"' : ""}>${escape(copy[label] ?? label)}</button>`).join("\n");
}

// Package the same directory Desktop reads, without its settings writers,
// runtime, credential values, Skill bodies or per-user configuration.
export async function componentDirectory(projectRoot) {
  const snapshot = await readProjectSettings(projectRoot);
  const source = JSON.parse(await readFile(path.join(projectRoot, "runtime/openquantum/web-locales/openquantum-source.json"), "utf8"));
  const pick = (item, keys) => Object.fromEntries(keys.map(key => [key, item[key]]));
  return {
    schemaVersion: 1,
    copy: source["settings.openquantumCapabilities"].zh,
    skills: snapshot.skills.map(item => pick(item, ["name", "displayName", "description", "version", "maturity", "category"])),
    mcpServers: snapshot.mcpServers.map(item => pick(item, ["serverName", "displayName", "description", "provider", "sourceUrl", "packageName", "packageVersion", "category", "transport", "target", "credentialRefs", "requiredCredentialRefs"])),
  };
}
