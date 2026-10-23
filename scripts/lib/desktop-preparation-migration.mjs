import fs from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";
import { atomicWrite, readOptional, withLock, digest } from "../../src/settings/codex/storage.mjs";
import { profiles } from "../../runtime/openquantum/agent-presets/openquantum/optional-tool-profiles.mjs";
import { desktopPreset, desktopYamlOptions, nativeProviderNames } from "./desktop-profile-config.mjs";
import { projectEnvironment } from "./desktop-environment.mjs";

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
  // Recognize only the two expressions emitted by our old preset builder.
  // Configuration is data: never evaluate arbitrary JavaScript during migration.
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

// Migrate only the overlap in the existing active Desktop preset. Preserve all
// unrelated rows and back up exact bytes before replacing a user-edited preset.
// Defaults in a NEW installation are not evidence of a user prohibition.
export async function migrateDesktopPreparation(root, home) {
  const directory = path.join(home, ".openquantum/capabilities");
  const marker = path.join(directory, "migration.json");
  return withLock(marker, async () => {
    if (await readOptional(marker)) return;
    const relative = ".agent-presets/openquantum/agent.cordis.yml";
    const presetFile = path.join(home, relative);
    const raw = await readOptional(presetFile);
    const old = raw ? rows(raw) : [];
    // Complete compatibility checks before writing any settings or migration marker.
    const next = raw && !old.some(row => row.id === "openquantum-adaptive-capabilities")
      ? desktopPreset(raw, root, process.execPath, { onDemand: true }) : null;
    const configFile = path.join(directory, "settings.json");
    const policyFile = path.join(directory, "skill-policy.json");
    await withLock(configFile, () => withLock(policyFile, async () => {
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
      for (const entry of await fs.readdir(path.join(root, ".agents/skills"), { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const source = await readOptional(path.join(root, ".agents/skills", entry.name, "SKILL.md"));
        // The old settings page wrote BOTH flags. Index Skills with only
        // disable-model-invocation are routing design, not an explicit ban.
        const front = source?.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (front && /disable-model-invocation:\s*true/.test(front[1]) && /user-invocable:\s*false/.test(front[1])) policy.disabledSkills.push(entry.name);
      }
      config.disabledProviders = [...new Set(config.disabledProviders)]; config.disabledTools = [...new Set(config.disabledTools)];
      policy.disabledSkills = [...new Set(policy.disabledSkills)];
      await atomicWrite(configFile, JSON.stringify(config, null, 2), { expected: configRaw });
      await atomicWrite(policyFile, JSON.stringify(policy, null, 2), { expected: policyRaw });
    }));
    if (next) {
      await atomicWrite(path.join(directory, "legacy-preset.yml"), raw);
      const stateFile = path.join(home, ".openquantum-home.json");
      await withLock(stateFile, async () => {
        const stateRaw = await readOptional(stateFile);
        const state = stateRaw ? JSON.parse(stateRaw) : { schemaVersion: 1, files: {} };
        await atomicWrite(presetFile, next, { expected: raw });
        state.files[relative] = digest(next);
        await atomicWrite(stateFile, JSON.stringify(state, null, 2), { expected: stateRaw });
      });
    }
    await atomicWrite(marker, JSON.stringify({ schemaVersion: 1, migratedAt: new Date().toISOString(), legacyPreset: Boolean(raw) }));
  });
}
