import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const directory = fileURLToPath(new URL("../examples/quantum-algorithms/", import.meta.url));
const supplied = process.argv.slice(2);
const groups = [];
let minimal = false;
for (let i = 0; i < supplied.length; i++) {
  if (supplied[i] === "--minimal") minimal = true;
  else if (supplied[i] === "--group" && ["gradients", "pennylane", "tensor", "chemistry"].includes(supplied[i + 1])) groups.push(supplied[++i]);
  else throw new Error("Use --minimal or --group gradients|pennylane|tensor|chemistry; no arguments installs all workflows");
}
// Selecting one workflow adds its requirements without removing existing groups.
const selection = minimal || groups.length ? ["--no-default-groups", "--inexact", ...groups.flatMap(group => ["--group", group])] : [];
const result = spawnSync("uv", ["sync", "--locked", "--no-dev", "--python", "3.12", ...selection], {
  cwd: directory,
  env: { ...process.env, UV_PROJECT_ENVIRONMENT: path.join(directory, ".venv") },
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
