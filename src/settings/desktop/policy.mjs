import path from "node:path";
import { atomicWrite } from "../codex/storage.mjs";

export function desktopSkillPolicy(directory) {
  const file = path.join(directory, "skill-policy.json");
  return {
    file, host: "Desktop",
    parse(raw) {
      const state = raw ? JSON.parse(raw) : { schemaVersion: 1, disabledSkills: [] };
      if (state.schemaVersion !== 1 || !Array.isArray(state.disabledSkills) || state.disabledSkills.some(id => typeof id !== "string")) throw new Error("Desktop Skill 设置无法读取，请保留配置并检查");
      return state;
    },
    enabled: (state, id) => !state.disabledSkills.includes(id),
    async set(state, id, enabled, raw) {
      state.disabledSkills = enabled ? state.disabledSkills.filter(value => value !== id) : [...new Set([...state.disabledSkills, id])];
      await atomicWrite(file, JSON.stringify(state, null, 2) + "\n", { expected: raw });
    },
  };
}
