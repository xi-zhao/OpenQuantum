import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { desktopPreset } from "../../../scripts/lib/desktop-profile-config.mjs";
import { writeManagedHomeFiles } from "../../../scripts/lib/managed-home-files.mjs";
import { sha256 } from "../../../scripts/lib/desktop-distribution.mjs";

export class DesktopPresetConflictError extends Error {
  constructor(projectSaved = false) {
    super(projectSaved
      ? "项目配置已保存，但 Desktop 配置同时被修改，本次设置未应用到 Desktop。请比较 .openquantum-defaults 中的新配置，合并后再重试。"
      : "Desktop 配置已被手动修改，本次设置尚未保存。请先与项目配置合并，再重试。");
    this.name = "DesktopPresetConflictError";
    this.projectSaved = projectSaved;
  }
}

/** The settings application keeps its active Desktop projection current. */
export async function desktopPresetProjection(projectRoot, home = process.env.DSH_HOME) {
  if (!home) return null;
  const read = filename => readFile(path.join(home, filename), "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const marker = await read("openquantum-project.json");
  const state = await read(".openquantum-home.json");
  if (!marker || !state || await realpath(marker.projectRoot) !== await realpath(projectRoot)) return null;
  const relative = ".agent-presets/openquantum/agent.cordis.yml";
  const current = await readFile(path.join(home, relative));
  if (current.toString().includes("id: openquantum-adaptive-capabilities")) throw new Error("请在新版 OpenQuantum 设置修改使用策略；旧启动清单不再控制能力准备");
  if (sha256(current) !== state.files[relative]) throw new DesktopPresetConflictError();
  return async () => {
    const source = await readFile(path.join(projectRoot, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8");
    const preserved = await writeManagedHomeFiles(home, new Map([[relative, desktopPreset(source, projectRoot, marker.nodeExecutable)]]));
    if (preserved.includes(relative)) {
      throw new DesktopPresetConflictError(true);
    }
  };
}
