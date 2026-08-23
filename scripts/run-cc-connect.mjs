import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  ensureCcConnectConfig,
  readCcConnectStatus,
  resolveCcConnectPaths,
} from "../src/channels/cc-connect.mjs";
import { loadProjectEnv } from "./lib/load-project-env.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
loadProjectEnv(projectRoot);
const mode = process.argv[2] ?? "start";
const extraArgs = process.argv.slice(3);
if (!new Set(["start", "web"]).has(mode)) {
  throw new TypeError(`未知 CC Connect 启动模式：${mode}`);
}

await ensureCcConnectConfig(projectRoot);
const paths = resolveCcConnectPaths(projectRoot);
const status = await readCcConnectStatus(projectRoot);
if (status.platformTypes.length === 0) {
  console.error("CC Connect 还没有消息平台，暂时不能启动服务或管理后台。");
  console.error("先运行 npm run cc-connect:feishu，或按 docs/integrations/CC_CONNECT.md 添加其他平台。");
  process.exit(2);
}
const commandArgs = mode === "start"
  ? ["--config", paths.configPath, ...extraArgs]
  : ["web", ...extraArgs];
const cwd = mode === "web" ? paths.stateRoot : projectRoot;
const child = spawn(paths.ccConnectBin, commandArgs, {
  cwd,
  env: {
    ...process.env,
    DSH_HOME: process.env.DSH_HOME ?? `${projectRoot}/.openquantum/dsh`,
    DSH_TELEMETRY_DISABLED: process.env.DSH_TELEMETRY_DISABLED ?? "1",
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(`CC Connect 启动失败：${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 1;
});
