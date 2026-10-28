import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { constants } from "node:fs";

export const LEAN_PROJECT_FILES = ["lean-toolchain", "lakefile.toml", "lake-manifest.json", "OpenQuantumProofs.lean"];
export const leanSdkRoot = (root, id, environment = process.env) => path.join(path.resolve(root, environment.OPENQUANTUM_LEAN_ENV_ROOT || ".openquantum/sdk-lean"), id);
export const leanHash = bytes => createHash("sha256").update(bytes).digest("hex");
export async function leanProjectHashes(directory) {
  return Object.fromEntries(await Promise.all(LEAN_PROJECT_FILES.map(async name => [name, leanHash(await fs.readFile(path.join(directory, name)))])));
}

// Discovery reads evidence only: never invokes Lean, Lake or Git.
export async function leanPreparation(project, directory) {
  try {
    const record = JSON.parse(await fs.readFile(path.join(directory, "openquantum-lean.json"), "utf8"));
    if (!record || typeof record !== "object" || Array.isArray(record)) return { state: "stale" };
    const current = await leanProjectHashes(project), prepared = await leanProjectHashes(directory);
    const valid = record.schemaVersion === 1 && record.platform === process.platform && record.arch === process.arch
      && LEAN_PROJECT_FILES.every(name => record.files?.[name] === current[name] && prepared[name] === current[name])
      && typeof record.lean === "string" && path.isAbsolute(record.lean) && typeof record.leanPath === "string" && record.leanPath.length > 0
      && record.leanPath.split(path.delimiter).every(item => path.isAbsolute(item))
      && leanHash(await fs.readFile(record.lean)) === record.leanSha256
      && leanHash(await fs.readFile(path.join(directory, ".lake/build/lib/lean/OpenQuantumProofs.olean"))) === record.proofSha256;
    if (!valid) return { state: "stale" };
    await fs.access(record.lean, process.platform === "win32" ? constants.F_OK : constants.X_OK);
    return { state: "prepared", command: record.lean, environment: { LEAN_PATH: record.leanPath }, toolchain: record.version };
  } catch (error) {
    if (["ENOENT", "EACCES"].includes(error.code)) return { state: "not_prepared" };
    if (error instanceof SyntaxError) return { state: "stale" };
    throw error;
  }
}
