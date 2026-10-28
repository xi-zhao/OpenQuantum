import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sdkInventory } from "../src/lib/sdk-access.mjs";
import { LEAN_PROJECT_FILES, leanSdkRoot, leanHash, leanProjectHashes } from "../src/lib/sdk-lean.mjs";
import { runSetupCommand } from "../src/lib/setup-process.mjs";

// Only the explicit SDK preparation entry calls this. User proofs run with the
// prepared Lean executable and LEAN_PATH, never through an installing launcher.
export async function prepareLeanSdk(root, id, environment = process.env) {
  const entry = (await sdkInventory(root)).libraries.find(item => item.id === id && item.language === "lean");
  if (!entry) throw new Error("Provide one reviewed Lean SDK id");
  if (!path.isAbsolute(environment.OPENQUANTUM_LEAN_BIN ?? "")) throw new Error(`Set OPENQUANTUM_LEAN_BIN to the absolute ${entry.toolchain.value} lean executable; global toolchains are not installed or changed`);
  const project = path.join(root, entry.project), directory = leanSdkRoot(root, id, environment);
  const files = await leanProjectHashes(project);
  for (const name of LEAN_PROJECT_FILES) {
    const bytes = await fs.readFile(path.join(directory, name)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    if (bytes && leanHash(bytes) !== files[name]) throw new Error(`Preserve existing Lean project changes in ${directory}; select a fresh OPENQUANTUM_LEAN_ENV_ROOT`);
  }
  const lean = await fs.realpath(environment.OPENQUANTUM_LEAN_BIN);
  const lake = path.join(path.dirname(lean), process.platform === "win32" ? "lake.exe" : "lake");
  const env = { ...environment, PATH: `${path.dirname(lean)}${path.delimiter}${environment.PATH || ""}`,
    MATHLIB_CACHE_DIR: path.join(directory, ".cache/mathlib"), LAKE_CACHE_DIR: path.join(directory, ".cache/lake"),
    MATHLIB_NO_CACHE_ON_UPDATE: "1" };
  const run = (command, args, cwd = directory, capture = false) => runSetupCommand(command, args, { cwd, env, capture });
  const version = await run(lean, ["--version"], root, true);
  if (!version.startsWith(`Lean (version ${entry.toolchain.value.split(":v")[1]},`)) throw new Error(`Lean toolchain mismatch: expected ${entry.toolchain.value}, got ${version}`);
  await fs.access(lake);
  await fs.mkdir(directory, { recursive: true });
  const guard = path.join(directory, ".openquantum-preparing");
  await fs.mkdir(guard).catch(error => { if (error.code === "EEXIST") throw new Error("Lean preparation already active or interrupted; inspect its owned process before removing the preparation guard"); throw error; });
  try {
    await fs.rm(path.join(directory, "openquantum-lean.json"), { force: true });
    for (const name of LEAN_PROJECT_FILES) {
      // Exclusive creation also protects files created after the preflight.
      try { await fs.copyFile(path.join(project, name), path.join(directory, name), fs.constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    const copied = await leanProjectHashes(directory);
    if (LEAN_PROJECT_FILES.some(name => copied[name] !== files[name])) throw new Error("Preserve Lean project changes made during preparation; retry in a fresh environment root");
    const lock = JSON.parse(await fs.readFile(path.join(directory, "lake-manifest.json"), "utf8"));
    await fs.mkdir(path.join(directory, ".lake/packages"), { recursive: true });
    for (const dependency of lock.packages) {
      const checkout = path.join(directory, ".lake/packages", dependency.name);
      const exists = await fs.access(checkout).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; });
      if (!exists) {
        const pending = await fs.mkdtemp(`${checkout}.pending-`);
        await run("git", ["init", pending]);
        await run("git", ["remote", "add", "origin", dependency.url], pending);
        await run("git", ["fetch", "--depth=1", "origin", dependency.rev], pending);
        await run("git", ["checkout", "--detach", dependency.rev], pending);
        await fs.rename(pending, checkout);
      }
      if ((await fs.lstat(checkout)).isSymbolicLink()) throw new Error(`Preserve linked Lean dependency ${dependency.name}; use a fresh environment root`);
      const revision = await run("git", ["rev-parse", "HEAD"], checkout, true);
      const remote = await run("git", ["remote", "get-url", "origin"], checkout, true);
      const changes = await run("git", ["status", "--porcelain", "--untracked-files=all"], checkout, true);
      if (revision !== dependency.rev || remote !== dependency.url || changes) throw new Error(`Preserve changed Lean dependency ${dependency.name}; use a fresh environment root`);
    }
    // Cache roots belong to the capability: a downstream root file is not in
    // mathlib's cache graph and would silently fall back to a large source build.
    if (entry.leanCacheModules) await run(lake, ["exe", "cache", "get", ...entry.leanCacheModules]);
    await run(lake, ["--no-cache", "build", "OpenQuantumProofs"]);
    const leanPath = await run(lake, ["env", process.execPath, "-e", "process.stdout.write(process.env.LEAN_PATH || '')"], directory, true);
    if (!leanPath || leanPath.split(path.delimiter).some(item => !path.isAbsolute(item))) throw new Error("Lake did not provide absolute Lean import paths");
    const current = await leanProjectHashes(project), prepared = await leanProjectHashes(directory);
    if (LEAN_PROJECT_FILES.some(name => files[name] !== current[name] || files[name] !== prepared[name])) throw new Error("Lean project or dependency lock changed during preparation");
    const record = { schemaVersion: 1, files, lean, leanSha256: leanHash(await fs.readFile(lean)), version, leanPath,
      platform: process.platform, arch: process.arch,
      proofSha256: leanHash(await fs.readFile(path.join(directory, ".lake/build/lib/lean/OpenQuantumProofs.olean"))) };
    const pending = path.join(directory, `openquantum-lean.${process.pid}.tmp`);
    await fs.writeFile(pending, JSON.stringify(record, null, 2) + "\n");
    await fs.rename(pending, path.join(directory, "openquantum-lean.json"));
    return record;
  } finally { await fs.rmdir(guard); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [id, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error("Provide one reviewed Lean SDK id");
  await prepareLeanSdk(fileURLToPath(new URL("../", import.meta.url)), id);
  console.log(`Prepared ${id}; proof checking and scientific acceptance remain separate`);
}
