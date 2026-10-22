import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { isMap, isSeq, parseDocument } from "yaml";
import { composeEntries, loadOptionalPatches } from "@deepseek-ai/dsh-app-boot";
import { Context } from "@deepseek-ai/cordis";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { LocalCredentialProvider } from "@deepseek-ai/dsh-credentials-local";
import { createLaunchEnvironmentSnapshot } from "@deepseek-ai/dsh-launch-environment";
import { projectEnvironment } from "./desktop-environment.mjs";
import { DESKTOP_MODEL_ROUTES, DESKTOP_PROFILE_DEFAULTS, DESKTOP_PROFILE_PATCH } from "./desktop-profile-bundle.mjs";

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
  const rowIndex = routes.contents.items.findIndex(row => row.get("id") === "llm-pi-ai");
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
  return document(source).toJS()?.find(row => row.id === "llm-pi-ai")?.config?.providers ?? {};
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

const SELECTION_ID = "agent-default-model";

async function optionalText(filename) {
  return readFile(filename, "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
}

/** Clear a saved default that still names a removed example route.
 * DSH 0.2 saves Settings into the profile patch; an unimported legacy
 * settings.yaml section is still honored before the official importer runs.
 * Home-level patches are user-owned and outrank this, so they are never edited.
 */
export async function clearRemovedDesktopModelSelection(harnessHome, removed) {
  if (!removed.length) return;
  const active = providers(await readFile(path.join(harnessHome, DESKTOP_MODEL_ROUTES), "utf8"));
  const homePatch = path.join(harnessHome, "cordis.patch.yml");
  const homeSource = await optionalText(homePatch) ?? "";
  const profilePatch = path.join(harnessHome, "profiles/desktop/cordis.patch.yml");
  const legacyPath = path.join(harnessHome, "settings.yaml");
  const legacySource = await optionalText(legacyPath);
  const legacy = legacySource == null ? null : document(legacySource);
  const layers = [
    [{ insert: [{ id: SELECTION_ID, name: "@deepseek-ai/dsh-agent-default-model", config: { provider: "", model: "" } }] }],
    loadOptionalPatches("OpenQuantum", path.join(harnessHome, DESKTOP_PROFILE_DEFAULTS)) ?? [],
    loadOptionalPatches("OpenQuantum", path.join(harnessHome, DESKTOP_PROFILE_PATCH)) ?? [],
    loadOptionalPatches("OpenQuantum", profilePatch) ?? [],
  ];
  const legacySelection = legacy?.toJS()?.[SELECTION_ID];
  if (legacySelection && typeof legacySelection === "object") layers.push([{ id: SELECTION_ID, config: legacySelection }]);
  if (document(homeSource).toJS() != null) layers.push(loadOptionalPatches("OpenQuantum", homePatch));
  const current = composeEntries(layers).find(row => row.id === SELECTION_ID)?.config ?? {};
  if (!removed.includes(current.provider) || Object.hasOwn(active, current.provider)) return;
  const homeRows = document(homeSource).toJS();
  if (Array.isArray(homeRows) && homeRows.some(row => row?.id === SELECTION_ID && row.config)) return;
  const cleared = { provider: "", model: "" };
  if (legacySelection && typeof legacySelection === "object") {
    legacy.set(SELECTION_ID, legacy.createNode(cleared));
    await writeFileAtomic(legacyPath, legacy.toString({ lineWidth: 0 }), { mode: 0o600 });
    return;
  }
  const profileSource = await optionalText(profilePatch);
  const profile = document(profileSource ?? "[]\n");
  if (!isSeq(profile.contents)) throw new Error("Desktop profile patch must be a YAML sequence");
  profile.contents.flow = false;
  const index = profile.contents.items.findLastIndex(row => isMap(row) && row.get("id") === SELECTION_ID && !row.has("insert"));
  if (index < 0) profile.add(profile.createNode({ id: SELECTION_ID, config: cleared }));
  else profile.setIn([index, "config"], profile.createNode(cleared));
  await mkdir(path.dirname(profilePatch), { recursive: true });
  await writeFileAtomic(profilePatch, profile.toString({ lineWidth: 0 }), { mode: 0o600 });
}
