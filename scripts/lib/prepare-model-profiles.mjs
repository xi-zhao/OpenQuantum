import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { initProfile, loadOptionalPatches, PROFILE_TEMPLATES } from "@deepseek-ai/dsh-app-boot";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { isMap, isSeq, parse, parseDocument, Scalar, stringify, visit } from "yaml";

export const MODEL_ROUTES_BUNDLE = "@openquantum/harness-model-routes";

/** Write one bundle package whose patch layer sits below the profile's native settings. */
export async function writeModelRoutesBundle(directory, files) {
  await mkdir(directory, { recursive: true });
  for (const [name, content] of files) await writeFile(path.join(directory, name), content, { mode: 0o600 });
  await writeFile(path.join(directory, "package.json"), JSON.stringify({
    name: MODEL_ROUTES_BUNDLE, version: "0.1.0", private: true,
    dsh: { bundle: { patch: files.map(([name]) => `./${name}`) } },
  }, null, 2) + "\n");
}

/** Append a bundle once, after the upstream surface bundle and before user bundles. */
export async function enableProfileBundle(profileDirectory, template, bundleName) {
  initProfile(profileDirectory, PROFILE_TEMPLATES[template].bundles);
  const manifestPath = path.join(profileDirectory, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const bundles = manifest.dsh?.profile?.bundles;
  if (!Array.isArray(bundles)) throw new Error(`Invalid Harness profile: ${profileDirectory}`);
  if (bundles.includes(bundleName)) return;
  const surface = PROFILE_TEMPLATES[template].bundles.at(-1);
  const index = bundles.indexOf(surface);
  bundles.splice(index < 0 ? bundles.length : index + 1, 0, bundleName);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

/** Web and ACP share route defaults; only Web-surface profiles carry preset defaults. */
export async function prepareModelProfiles({ projectRoot, harnessHome }) {
  const source = (name) => readFile(path.join(projectRoot, "runtime/openquantum", name), "utf8");
  const [routes, defaults] = await Promise.all([source("model-routes.cordis.yml"), source("profile-defaults.cordis.yml")]);
  for (const [profile, template, files] of [
    ["web", "web", [["model-routes.cordis.yml", routes], ["profile-defaults.cordis.yml", defaults]]],
    ["acp", "acp", [["model-routes.cordis.yml", routes]]],
  ]) {
    const directory = path.join(harnessHome, "profiles", profile);
    await writeModelRoutesBundle(path.join(directory, "node_modules", MODEL_ROUTES_BUNDLE), files);
    await enableProfileBundle(directory, template, MODEL_ROUTES_BUNDLE);
  }
}

/** DSH 0.2 registers explicit preset declarations instead of scanning folders. */
export async function presetDeclarations(sourceRoot, presetsRoot, ids) {
  const rows = await Promise.all(ids.map(async (id) => {
    const directory = path.join(presetsRoot, id);
    // Metadata comes from the project source; composition is loaded from the Home copy.
    const metadata = parse(await readFile(path.join(sourceRoot, id, "preset.yml"), "utf8")) ?? {};
    return {
      id: `preset-${id}`,
      name: "@deepseek-ai/dsh-agent-preset",
      config: {
        id,
        ...metadata,
        plugins: [{
          id: `${id}-composition`,
          name: "@deepseek-ai/cordis-plugin-include",
          config: { path: pathToFileURL(path.join(directory, "agent.cordis.yml")).href },
        }],
      },
    };
  }));
  return stringify(rows);
}

const customTags = [{ tag: "tag:yaml.org,2002:js", resolve: (value) => value }];
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const MIGRATED_SECTIONS = ["llm-pi-ai", "agent-default-model"];

function merge(base, override) {
  if (!isRecord(base) || !isRecord(override)) return structuredClone(override);
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(override)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Invalid model configuration key");
    result[key] = merge(result[key], value);
  }
  return result;
}

async function optionalText(filename) {
  return readFile(filename, "utf8").catch((error) => { if (error.code === "ENOENT") return undefined; throw error; });
}

/** Carry model sections of the retired shared settings.yaml into each profile once.
 * A profile row already saved by native Settings wins. The importer in
 * dsh-settings would only update the first profile launched and would replace
 * whole route configs, so the full source is backed up before sections move.
 * @param profiles [name, defaultRows] pairs; defaultRows are that profile's bundle rows.
 */
export async function migrateLegacyModelSettings(harnessHome, profiles) {
  const legacyPath = path.join(harnessHome, "settings.yaml");
  const legacySource = await optionalText(legacyPath);
  if (legacySource === undefined) return [];
  const legacyDocument = parseDocument(legacySource);
  if (legacyDocument.errors.length) throw legacyDocument.errors[0];
  const legacy = legacyDocument.toJS() ?? {};
  if (!isRecord(legacy)) throw new Error("Invalid legacy Harness settings");
  const sections = [...MIGRATED_SECTIONS.filter((id) => isRecord(legacy[id])).map((id) => ({ id, source: id, value: legacy[id] }))];
  if (typeof legacy["agent-presets"]?.default === "string" && legacy["agent-presets"].default) {
    sections.push({ id: "agent-preset-registry", source: "agent-presets", value: { selectedDefault: legacy["agent-presets"].default } });
  }
  if (!sections.length) return [];
  for (const [name, defaults] of profiles) {
    const patchPath = path.join(harnessHome, "profiles", name, "cordis.patch.yml");
    const document = parseDocument(await optionalText(patchPath) ?? "[]\n", { customTags });
    if (document.errors.length) throw document.errors[0];
    if (!isSeq(document.contents)) throw new Error(`Invalid Harness profile patch: ${name}`);
    document.contents.flow = false;
    let changed = false;
    for (const section of sections) {
      const base = defaults.find((row) => row.id === section.id && !row.insert)?.config;
      if (base === undefined) continue;
      if (document.contents.items.some((row) => isMap(row) && row.get("id") === section.id && !row.has("insert"))) continue;
      document.add(document.createNode({ id: section.id, config: merge(base, section.value) }));
      changed = true;
    }
    if (!changed) continue;
    // Re-tag expressions read back from bundle defaults so Loader still evaluates them.
    visit(document, { Map(_key, node) {
      if (node.items.length !== 1 || typeof node.get("__jsExpr") !== "string") return undefined;
      const scalar = new Scalar(node.get("__jsExpr"));
      scalar.tag = "tag:yaml.org,2002:js";
      return scalar;
    } });
    await mkdir(path.dirname(patchPath), { recursive: true });
    await writeFileAtomic(patchPath, String(document), { mode: 0o600 });
  }
  let backupPath = `${legacyPath}.openquantum-v021-backup`;
  const existingBackup = await optionalText(backupPath);
  if (existingBackup !== undefined && existingBackup !== legacySource) {
    backupPath += `.${createHash("sha256").update(legacySource).digest("hex")}`;
  }
  try { await writeFile(backupPath, legacySource, { mode: 0o600, flag: "wx" }); } catch (error) { if (error.code !== "EEXIST") throw error; }
  for (const section of sections) legacyDocument.delete(section.source);
  await writeFileAtomic(legacyPath, String(legacyDocument), { mode: 0o600 });
  return sections.map((section) => section.source);
}

export function bundleRows(...files) {
  return files.flatMap((file) => loadOptionalPatches("OpenQuantum", file) ?? []);
}
