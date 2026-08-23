import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";
import { loadProjectEnv } from "./lib/load-project-env.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const harnessBin = path.join(
  projectRoot,
  "node_modules",
  "@deepseek-ai",
  "dsh",
  "lib",
  "bin.js",
);
const harnessHome = path.join(projectRoot, ".openquantum", "dsh");
loadProjectEnv(projectRoot);
await prepareOpenQuantumHarnessHome({ harnessHome, projectRoot });

const child = spawn(
  process.execPath,
  [harnessBin, "web", ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      DSH_HOME: harnessHome,
      DSH_TELEMETRY_DISABLED: process.env.DSH_TELEMETRY_DISABLED ?? "1",
    },
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(`Failed to start DeepSeek Harness: ${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
