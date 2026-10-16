import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { externalMcp, externalProject } from "./catalog.mjs";
import { pythonEnvironmentRoot } from "../../../src/lib/prepared-python.mjs";
import { runSetupCommand } from "../../../src/lib/setup-process.mjs";
import { digest } from "../../../src/settings/codex/storage.mjs";

export function externalPaths(root, id, environment = process.env) {
  const entry = externalMcp(id), project = externalProject(root, id);
  const directory = pythonEnvironmentRoot(root, entry.environmentId, environment);
  return { entry, project, directory, python: path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python"), marker: path.join(directory, "openquantum-lock.sha256") };
}
export async function setupExternal(root, id, { environment = process.env, signal, onOutput } = {}) {
  const paths = externalPaths(root, id, environment);
  const lock = await fs.readFile(path.join(paths.project, "uv.lock"));
  await runSetupCommand("uv", ["sync", "--frozen", "--no-dev", "--python", "3.12", "--project", paths.project], {
    cwd: root, env: { ...environment, UV_PROJECT_ENVIRONMENT: paths.directory, UV_INDEX_URL: "https://pypi.org/simple" }, signal, onOutput, capture: true,
  });
  if (paths.entry.id === "quantum_hardware") await runSetupCommand(paths.python, ["-B", path.join(root, "runtime/chatgpt/external/fetch-source.py"), path.join(paths.project, "source.json"), path.join(paths.directory, "source")], { cwd: root, env: environment, signal, onOutput, capture: true });
  await fs.writeFile(paths.marker, digest(lock) + "\n", { mode: 0o600 });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  await setupExternal(root, process.argv[2]);
}
