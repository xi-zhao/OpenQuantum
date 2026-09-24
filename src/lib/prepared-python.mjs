import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

export function pythonEnvironmentRoot(projectRoot, id, environment = process.env) {
  const root = environment.OPENQUANTUM_PYTHON_ENV_ROOT || path.join(projectRoot, ".openquantum/python-envs");
  return path.join(path.resolve(root), id);
}

// Environment preparation is an explicit installer action, never a Tool fallback.
export async function preparedPythonLaunch({ skillRoot, id = path.basename(skillRoot), args = [path.join(skillRoot, "mcp/bridge.py")], environment = process.env, dependencyLockSha256 }) {
  const projectRoot = path.resolve(skillRoot, "../../..");
  const directory = pythonEnvironmentRoot(projectRoot, id, environment);
  const command = path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const instruction = `run node scripts/setup-paper-tools.mjs ${id}`;
  const lock = createHash("sha256").update(await readFile(path.join(skillRoot, "uv.lock"))).digest("hex");
  if (dependencyLockSha256 !== undefined && dependencyLockSha256 !== lock) throw new Error(`Dependency lock changed while MCP was running; ${instruction}, then restart the connection`);
  const marker = await readFile(path.join(directory, "openquantum-lock.sha256"), "utf8").catch(() => "");
  if (marker.trim() !== lock) throw new Error(`Prepared environment missing or stale; ${instruction}`);
  await access(command, process.platform === "win32" ? constants.F_OK : constants.X_OK).catch(() => { throw new Error(`Prepared Python missing or not executable; ${instruction}`); });
  return { command, args: ["-B", ...args], notFoundMessage: `Prepared Python missing; ${instruction}` };
}
