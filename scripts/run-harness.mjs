import { spawn } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const harnessBin = path.join(
  projectRoot,
  "node_modules",
  "@deepseek-ai",
  "dsh",
  "lib",
  "bin.js",
);
const patchFile = path.join(
  projectRoot,
  "runtime",
  "openquantum",
  "cordis.patch.yml",
);
const harnessHome = path.join(projectRoot, ".openquantum", "dsh");
const presetSource = path.join(
  projectRoot,
  "runtime",
  "openquantum",
  "agent-presets",
  "openquantum",
);
const presetTarget = path.join(
  harnessHome,
  ".agent-presets",
  "openquantum",
);

mkdirSync(path.dirname(presetTarget), { recursive: true });
cpSync(presetSource, presetTarget, { recursive: true, force: true });

const child = spawn(
  process.execPath,
  [harnessBin, "web", "--patch", patchFile, ...process.argv.slice(2)],
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
