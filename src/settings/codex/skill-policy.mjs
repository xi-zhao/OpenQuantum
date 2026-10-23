import path from "node:path";
import { parse, stringify } from "smol-toml";
import { atomicWrite } from "./storage.mjs";

function selects(entry, id, skillRoot) {
  if (entry.name === `openquantum:${id}`) return true;
  if (typeof entry.path !== "string") return false;
  const selected = path.resolve(entry.path);
  if (selected === path.join(skillRoot, id, "SKILL.md")) return true;
  const pluginCache = path.dirname(path.dirname(skillRoot));
  return path.basename(pluginCache) === "openquantum" && path.basename(path.dirname(path.dirname(pluginCache))) === "cache"
    && path.dirname(path.dirname(path.dirname(path.dirname(selected)))) === pluginCache
    && path.basename(path.dirname(path.dirname(selected))) === "skills"
    && path.basename(path.dirname(selected)) === id && path.basename(selected) === "SKILL.md";
}

export const skillEnabled = (state, id, skillRoot) => state.skills?.config?.findLast(value => selects(value, id, skillRoot))?.enabled !== false;

// Host policy is the only part of the shared settings application that reads
// or writes Codex configuration. Desktop supplies its own policy adapter.
export function codexSkillPolicy(codexHome, skillRoot) {
  const file = path.join(codexHome, "config.toml");
  return {
    file, host: "Codex",
    parse(raw) { try { return raw ? parse(raw) : {}; } catch { throw new Error("Codex 配置无法解析，请修复用户配置后重试"); } },
    enabled: (state, id) => skillEnabled(state, id, skillRoot),
    async set(state, id, enabled, raw) {
      const entries = (state.skills?.config ?? []).filter(value => !selects(value, id, skillRoot));
      entries.push({ name: `openquantum:${id}`, enabled });
      state.skills = { ...state.skills, config: entries };
      await atomicWrite(`${file}.openquantum-backup`, raw);
      await atomicWrite(file, stringify(state), { expected: raw });
    },
  };
}
