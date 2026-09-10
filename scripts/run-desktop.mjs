import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";
import { requireDesktopBuild } from "./lib/desktop-source.mjs";
import { loadProjectEnv } from "./lib/load-project-env.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const desktopBin = path.join(await requireDesktopBuild(projectRoot), "lib/bin.js");
loadProjectEnv(projectRoot);
const harnessHome = process.env.DSH_HOME ?? path.join(projectRoot, ".openquantum", "dsh");
await prepareOpenQuantumHarnessHome({ harnessHome, projectRoot, profileName: "desktop" });

const child = spawn(
  process.execPath,
  [desktopBin, ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      DSH_HOME: harnessHome,
      // Desktop may host plugins inside Electron's Node context. Application
      // workers must use the real Node executable from this launcher.
      OPENQUANTUM_NODE_EXECUTABLE: process.execPath,
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
