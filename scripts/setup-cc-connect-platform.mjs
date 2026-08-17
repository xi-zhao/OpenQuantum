import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildCcConnectPlatformSetupArgs,
  ensureCcConnectConfig,
  resolveCcConnectPaths,
} from "../src/channels/cc-connect.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const platform = process.argv[2];

await ensureCcConnectConfig(projectRoot);
const paths = resolveCcConnectPaths(projectRoot);
const child = spawn(paths.ccConnectBin, buildCcConnectPlatformSetupArgs(
  projectRoot,
  platform,
  process.argv.slice(3),
), {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(`${platform} 配置启动失败：${error.message}`);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 1;
});
