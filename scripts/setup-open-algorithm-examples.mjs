import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { assertInstalledPythonFiles } from "../src/lib/installed-python.mjs";
import { pythonEnvironmentRoot } from "../src/lib/prepared-python.mjs";

const directory = fileURLToPath(new URL("../examples/quantum-algorithms/", import.meta.url));
const environmentDirectory = process.env.OPENQUANTUM_PYTHON_ENV_ROOT
  ? pythonEnvironmentRoot(path.resolve(directory, "../.."), "quantum-algorithms") : path.join(directory, ".venv");
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
const lock = path.join(directory, "uv.lock");
const digest = () => createHash("sha256").update(readFileSync(lock)).digest("hex");
const before = digest();
const marker = path.join(environmentDirectory, "openquantum-lock.sha256");
// A subset environment must not advertise all SDK groups as prepared.
rmSync(marker, { force: true });
const result = spawnSync("uv", ["sync", "--locked", "--no-dev", "--python", "3.12", ...selection], {
  cwd: directory,
  env: { ...process.env, UV_PROJECT_ENVIRONMENT: environmentDirectory },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status === 0) {
  if (before !== digest()) throw new Error("Algorithm dependency lock changed during setup");
  assertInstalledPythonFiles(path.join(environmentDirectory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python"), { cwd: directory });
  if (!selection.length) {
    const pending = `${marker}.${process.pid}.tmp`;
    writeFileSync(pending, `${before}\n`);
    renameSync(pending, marker);
  }
}
process.exitCode = result.status ?? 1;
