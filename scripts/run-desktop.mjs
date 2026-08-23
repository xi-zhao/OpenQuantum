import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const desktopBin = path.join(
  projectRoot,
  "node_modules",
  "dsh-plugin-desktop",
  "lib",
  "bin.js",
);
const harnessHome = path.join(projectRoot, ".openquantum", "dsh");
await prepareOpenQuantumHarnessHome({ harnessHome, projectRoot });

const child = spawn(
  process.execPath,
  [desktopBin, ...process.argv.slice(2)],
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
  console.error(`Failed to start OpenQuantum Desktop: ${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
