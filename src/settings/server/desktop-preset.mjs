import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { desktopPreset } from "../../../scripts/lib/desktop-profile-config.mjs";
import { writeManagedHomeFiles } from "../../../scripts/lib/managed-home-files.mjs";
import { sha256 } from "../../../scripts/lib/desktop-distribution.mjs";

/** The settings application keeps its active Desktop projection current. */
export async function desktopPresetProjection(projectRoot, home = process.env.DSH_HOME) {
  if (!home) return null;
  const read = filename => readFile(path.join(home, filename), "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const marker = await read("openquantum-project.json");
  const state = await read(".openquantum-home.json");
  if (!marker || !state || await realpath(marker.projectRoot) !== await realpath(projectRoot)) return null;
  const relative = ".agent-presets/openquantum/agent.cordis.yml";
  const current = await readFile(path.join(home, relative));
  if (sha256(current) !== state.files[relative]) throw new Error("Desktop Home has an independently edited preset. Reconcile it with the project configuration before changing MCP settings.");
  return async () => {
    const source = await readFile(path.join(projectRoot, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8");
    const preserved = await writeManagedHomeFiles(home, new Map([[relative, desktopPreset(source, projectRoot, marker.nodeExecutable)]]));
    if (preserved.includes(relative)) {
      throw new Error("项目配置已保存，但 Desktop 配置同时被修改，本次设置未应用到 Desktop。请比较 .openquantum-defaults 中的新配置，合并后再重试。");
    }
  };
}
