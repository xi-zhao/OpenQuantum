import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseDocument } from "yaml";
import { composeEntries, loadOptionalPatches } from "@deepseek-ai/dsh-app-boot";
import { Context } from "@deepseek-ai/cordis";
import { LocalCredentialProvider } from "@deepseek-ai/dsh-credentials-local";
import { FileSettingsProvider } from "@deepseek-ai/dsh-settings-file";
import { AgentDefaultModelConfig } from "@deepseek-ai/dsh-agent-default-model";
import { createLaunchEnvironmentSnapshot } from "@deepseek-ai/dsh-launch-environment";
import { projectEnvironment } from "./desktop-environment.mjs";

// Semantic fingerprints of the shipped 0.8.1 example providers. Comparing the
// whole object preserves partial user edits to models, names or credential refs.
const exampleProviders = {
  "openquantum-public": "42760897e703d1aa589547f33fc5281fc89903f12b4408e8f07657a7b6fa7d3f",
  "openquantum-private": "89308667a070e6254b016bd3afb31a52ef6fe608abb13fcd0a2786488582a21b",
};
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function document(source) {
  const result = parseDocument(source, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
  if (result.errors.length) throw new Error("Invalid Desktop model configuration");
  return result;
}

// Only drop untouched example endpoints. User routes, native settings and
// credential references remain owned by the user, including incomplete edits.
export async function desktopModelRoutes(source, projectRoot, harnessHome, inherited = process.env) {
  const routes = document(source);
  const rowIndex = routes.contents.items.findIndex(row => row.get("id") === "openquantum-llm-pi-ai");
  if (rowIndex < 0) return { content: source, removed: [] };
  const settings = await readFile(path.join(harnessHome, "settings.yaml"), "utf8").then(text => document(text).toJS() ?? {}).catch(error => { if (error.code === "ENOENT") return {}; throw error; });
  const environments = [projectEnvironment(harnessHome), projectEnvironment(projectRoot), inherited];
  const context = new Context();
  context.provide("launchEnvironment", createLaunchEnvironmentSnapshot([{ source: "process", values: {} }]));
  const credentials = await context.plugin(LocalCredentialProvider, { dshHome: harnessHome, watch: false });
  const removed = [];
  try {
    for (const [id, baseVariable, fallback] of [
      ["openquantum-public", "OPENQUANTUM_PUBLIC_BASE_URL", "https://api.example.invalid/v1"],
      ["openquantum-private", "OPENQUANTUM_PRIVATE_BASE_URL", "https://private-api.example.invalid/v1"],
    ]) {
      const keys = [rowIndex, "config", "providers", id];
      const route = routes.getIn(keys)?.toJSON();
      if (!route || routes.getIn([...keys, "baseURL"], true)?.tag !== "tag:yaml.org,2002:js" || createHash("sha256").update(JSON.stringify(canonical(route))).digest("hex") !== exampleProviders[id]) continue;
      if (environments.some(env => env[baseVariable] && env[baseVariable] !== fallback) || Object.hasOwn(settings["llm-pi-ai"]?.providers ?? {}, id)) continue;
      if (route.apiKeyEnv && (environments.some(env => env[route.apiKeyEnv]) || (await context.credentials.describe(route.apiKeyEnv)).configured)) continue;
      routes.deleteIn(keys);
      removed.push(id);
    }
  } finally { await credentials.dispose(); }
  return { content: routes.toString({ lineWidth: 0 }), removed };
}

function providers(source) {
  return document(source).toJS()?.find(row => row.id === "openquantum-llm-pi-ai")?.config?.providers ?? {};
}

export function desktopModelDefault(source, activeRoutes, removed) {
  const patch = document(source);
  const active = providers(activeRoutes);
  for (const row of patch.contents.items) {
    if (row.get("id") !== "agent-default-model") continue;
    const provider = row.getIn(["config", "provider"]);
    if (!removed.includes(provider) || Object.hasOwn(active, provider)) continue;
    row.setIn(["config", "provider"], "");
    row.setIn(["config", "model"], "");
  }
  return patch.toString({ lineWidth: 0 });
}

export async function clearRemovedDesktopModelSelection(harnessHome, removed) {
  if (!removed.length) return;
  const active = providers(await readFile(path.join(harnessHome, "profiles/model-routes.cordis.yml"), "utf8"));
  const homePatch = path.join(harnessHome, "cordis.patch.yml");
  const homeSource = await readFile(homePatch, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
  // DSH Desktop 2.0.7 treats an empty machine patch as no layer, and applies
  // that layer after the Profile. Keep both its ordering and identity checks.
  const entries = composeEntries([
    [{ insert: [{ id: "agent-default-model", name: "@deepseek-ai/dsh-agent-default-model", config: { provider: "", model: "" } }] }],
    loadOptionalPatches("OpenQuantum", path.join(harnessHome, "profiles/desktop/cordis.patch.yml")) ?? [],
    document(homeSource).toJS() == null ? [] : loadOptionalPatches("OpenQuantum", homePatch),
  ]);
  const defaults = entries.find(row => row.id === "agent-default-model")?.config;
  const base = removed.includes(defaults?.provider) && typeof defaults?.model === "string" ? defaults : { provider: "", model: "" };
  const context = new Context();
  const settings = await context.plugin(FileSettingsProvider, { dshHome: harnessHome, watch: false });
  const selection = await context.plugin(AgentDefaultModelConfig, base);
  try {
    const current = context.agentDefaultModel.currentSelection();
    if (removed.includes(current.provider) && !Object.hasOwn(active, current.provider)) {
      await context.agentDefaultModel.saveSelection({ provider: "", model: "" });
    }
  } finally { await selection.dispose(); await settings.dispose(); }
}
