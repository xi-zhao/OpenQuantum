import fs from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";
import { atomicWrite, readOptional, withLock, digest } from "../../src/settings/codex/storage.mjs";
import { profiles } from "../../runtime/openquantum/agent-presets/openquantum/optional-tool-profiles.mjs";
import { desktopPreset, desktopYamlOptions, nativeProviderNames, migrateDesktopPresetSchema } from "./desktop-profile-config.mjs";
import { projectEnvironment } from "./desktop-environment.mjs";
import { readManagedHomeState } from "./managed-home-files.mjs";

const rows = raw => {
  const doc = parseDocument(raw, desktopYamlOptions);
  if (doc.errors.length || !Array.isArray(doc.toJSON())) throw new Error("Desktop 原有配置无法解析，未迁移");
  return doc.toJSON();
};

const profileVariables = {
  qiskit_gym: "OPENQUANTUM_GYM_TOOL_PROFILE",
  quantum_hardware: "OPENQUANTUM_HARDWARE_TOOL_PROFILE",
  flagquantum: "OPENQUANTUM_FLAGQUANTUM_TOOL_PROFILE",
};

function legacyProfile(value, server, environment) {
  if (typeof value !== "string") return value;
  // Recognize only expressions emitted by the old preset builder; never evaluate configuration.
  const direct = value.match(/^process\.env\.([A-Z_]+)\s*\|\|\s*['"]full['"]$/);
  const embedded = value.match(/^\(process\.env\.([A-Z_]+)\s*\?\?\s*("(?:[^"\\]|\\.)*")\)\s*\|\|\s*['"]full['"]$/);
  const expression = direct ?? embedded;
  if (!expression || expression[1] !== profileVariables[server]) return value;
  return (environment[expression[1]] ?? (embedded ? JSON.parse(embedded[2]) : undefined)) || "full";
}

function legacyQiskitBan(value, environment) {
  if (typeof value !== "string" || !value.includes("process.env.OPENQUANTUM_DISABLE_QISKIT_MCP")) return false;
  const direct = /^process\.env\.OPENQUANTUM_DISABLE_QISKIT_MCP\s*===\s*['"]1['"]$/.test(value);
  const embedded = value.match(/^\(process\.env\.OPENQUANTUM_DISABLE_QISKIT_MCP\s*\?\?\s*("(?:[^"\\]|\\.)*")\)\s*===\s*['"]1['"]$/);
  if (!direct && !embedded) throw new Error("Desktop 原有 Qiskit 禁用条件无法迁移，未改变配置");
  return (environment.OPENQUANTUM_DISABLE_QISKIT_MCP ?? (embedded ? JSON.parse(embedded[1]) : undefined)) === "1";
}

// Planning is read-only: an incompatible preset must fail before the installer
// replaces programs, dependencies, credentials or the distribution receipt.
export async function planDesktopPreparation(root, home, { legacyHomeFiles = {}, sourceRoot = root, presetRoot = sourceRoot } = {}) {
  const directory = path.join(home, ".openquantum/capabilities");
  const marker = path.join(directory, "migration.json");
  const migrated = await readOptional(marker);
  const relative = ".agent-presets/openquantum/agent.cordis.yml";
  const presetFile = path.join(home, relative);
  const raw = await readOptional(presetFile);
  const old = raw ? rows(raw) : [];
  const state = await readManagedHomeState(home, legacyHomeFiles);
  const owned = Boolean(raw && digest(raw) === state.files?.[relative]);
  const writes = [];
  const add = async (file, content) => {
    const expected = await readOptional(file);
    if (content !== expected) writes.push({ file, content, expected });
  };
  let next = raw ? migrateDesktopPresetSchema(raw) : "";
  // A Web → Desktop switch still needs projection even after the one-time
  // policy migration. A reviewed default is replaced by the current template.
  if (owned) {
    const source = await fs.readFile(path.join(presetRoot, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8");
    next = desktopPreset(migrateDesktopPresetSchema(source), sourceRoot, process.execPath, { onDemand: true, projectRoot: root });
  } else if (raw && !old.some(row => row.id === "openquantum-adaptive-capabilities")) {
    next = desktopPreset(next, sourceRoot, process.execPath, { onDemand: true, projectRoot: root });
  }
  if (!migrated) {
    const configFile = path.join(directory, "settings.json");
    const policyFile = path.join(directory, "skill-policy.json");
    const configRaw = await readOptional(configFile), policyRaw = await readOptional(policyFile);
    const config = configRaw ? JSON.parse(configRaw) : { schemaVersion: 1, disabledTools: [], disabledProviders: [], connections: [] };
    const policy = policyRaw ? JSON.parse(policyRaw) : { schemaVersion: 1, disabledSkills: [] };
    const environment = { ...projectEnvironment(root), ...process.env };
    for (const row of old) {
      const conditionalBan = legacyQiskitBan(row.disabled, environment);
      if ((row.disabled === true || conditionalBan) && row.config?.serverName) config.disabledProviders.push(row.config.serverName);
      if ((row.disabled === true || conditionalBan) && nativeProviderNames.has(row.name)) config.disabledProviders.push(`native:${row.name}`);
      if (row.id === "optional-tool-profiles") for (const [server, choices] of Object.entries(profiles)) {
        const selected = legacyProfile(row.config?.[server] ?? "full", server, environment);
        if (selected === "full") continue;
        if (!Object.hasOwn(choices, selected)) throw new Error(`无法迁移 ${server} 的 Tool 选择，请保留配置并检查`);
        config.disabledTools.push(...[...new Set(Object.values(choices).flat())].filter(name => !choices[selected].includes(name)));
      }
    }
    for (const entry of await fs.readdir(path.join(root, ".agents/skills"), { withFileTypes: true }).catch(error => { if (error.code === "ENOENT") return []; throw error; })) {
      if (!entry.isDirectory()) continue;
      const source = await readOptional(path.join(root, ".agents/skills", entry.name, "SKILL.md"));
      // Only BOTH flags meant a user prohibition in the old settings page.
      const front = source?.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (front && /disable-model-invocation:\s*true/.test(front[1]) && /user-invocable:\s*false/.test(front[1])) policy.disabledSkills.push(entry.name);
    }
    config.disabledProviders = [...new Set(config.disabledProviders)]; config.disabledTools = [...new Set(config.disabledTools)];
    policy.disabledSkills = [...new Set(policy.disabledSkills)];
    await add(configFile, JSON.stringify(config, null, 2));
    await add(policyFile, JSON.stringify(policy, null, 2));
  }
  if (next !== raw) {
    if (!await readOptional(path.join(directory, "legacy-preset.yml"))) await add(path.join(directory, "legacy-preset.yml"), raw);
    await add(presetFile, next);
    // Transforming a user edit does not transfer its ownership to the installer.
    if (owned) {
      state.files[relative] = digest(next);
      await add(path.join(home, ".openquantum-home.json"), JSON.stringify(state, null, 2));
    }
  }
  if (!migrated) await add(marker, JSON.stringify({ schemaVersion: 1, migratedAt: new Date().toISOString(), legacyPreset: Boolean(raw) }));
  return { writes, preset: next, owned };
}

export async function migrateDesktopPreparation(root, home, options) {
  const directory = path.join(home, ".openquantum/capabilities");
  return withLock(path.join(directory, "migration.json"), () =>
    withLock(path.join(directory, "settings.json"), () =>
      withLock(path.join(directory, "skill-policy.json"), () =>
        withLock(path.join(home, ".openquantum-home.json"), async () => {
          const plan = await planDesktopPreparation(root, home, options);
          for (const { file, expected } of plan.writes) {
            if (await readOptional(file) !== expected) throw new Error("Desktop 配置在迁移期间改变，未应用迁移");
          }
          for (const { file, content, expected } of plan.writes) await atomicWrite(file, content, { expected });
          return plan;
        }))));
}
