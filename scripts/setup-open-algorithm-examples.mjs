import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const directory = fileURLToPath(new URL("../examples/quantum-algorithms/", import.meta.url));
const result = spawnSync("uv", ["sync", "--locked", "--no-dev", "--python", "3.12"], {
  cwd: directory,
  env: { ...process.env, UV_PROJECT_ENVIRONMENT: path.join(directory, ".venv") },
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
