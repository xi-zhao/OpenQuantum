import fs from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { pythonEnvironmentRoot } from "./prepared-python.mjs";

export const ALGORITHM_GROUPS = ["gradients", "pennylane", "tensor", "chemistry"];
const GROUP_MODULES = { gradients: "qiskit_algorithms", pennylane: "pennylane", tensor: "quimb", chemistry: "pyscf" };
export function algorithmGroupArgs(groups = []) {
  if (!Array.isArray(groups) || groups.length > ALGORITHM_GROUPS.length || groups.some(group => !ALGORITHM_GROUPS.includes(group))) throw new Error("Invalid algorithm dependency groups");
  return algorithmSelection(groups.flatMap(group => ["--group", group])).flatMap(group => ["--group", group]);
}
export function algorithmModules(groups) {
  algorithmGroupArgs(groups);
  return ["numpy", "scipy", "qiskit", ...groups.map(group => GROUP_MODULES[group])];
}
const OWNER = /^[1-9]\d*-[a-f0-9-]{36}$/;

export function algorithmSelection(args = []) {
  const groups = new Set();
  let all = false, minimal = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--all") all = true;
    else if (args[i] === "--minimal") minimal = true;
    else if (args[i] === "--group" && ALGORITHM_GROUPS.includes(args[i + 1])) groups.add(args[++i]);
    else throw new Error("Use --minimal, --group gradients|pennylane|tensor|chemistry, or --all");
  }
  if ((all && (minimal || groups.size)) || (minimal && groups.size)) throw new Error("Choose one dependency selection: minimal, groups, or all");
  if (all) for (const group of ALGORITHM_GROUPS) groups.add(group);
  if (groups.has("chemistry")) groups.add("tensor");
  return ALGORITHM_GROUPS.filter(group => groups.has(group));
}

export function algorithmEnvironmentRoot(root, environment = process.env) {
  return environment.OPENQUANTUM_PYTHON_ENV_ROOT ? pythonEnvironmentRoot(root, "quantum-algorithms", environment)
    : path.join(root, "examples/quantum-algorithms/.venv");
}

export async function acquireAlgorithmSetup(directory) {
  const lock = `${directory}.openquantum-setup-lock`;
  const owner = `${process.pid}-${randomUUID()}`;
  const pending = `${lock}.${owner}.pending`;
  await fs.mkdir(path.dirname(lock), { recursive: true });
  // Publish only a populated directory. rename is atomic and cannot replace
  // another populated lock, so a crash before publication never blocks setup.
  await fs.mkdir(pending);
  try {
    await fs.writeFile(path.join(pending, owner), "", { flag: "wx" });
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await fs.rename(pending, lock); }
      catch (error) {
        if (!["EEXIST", "ENOTEMPTY", "EPERM"].includes(error.code)) throw error;
        const owners = await fs.readdir(lock).catch(error => { if (error.code === "ENOENT") return null; throw error; });
        if (owners === null) continue;
        if (!owners.length) {
          // Also recover an empty directory left by an older installer. rmdir
          // refuses a new owner that might have published in the meantime.
          await fs.rmdir(lock).catch(error => { if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error; });
          continue;
        }
        if (owners.length !== 1 || !OWNER.test(owners[0])) throw new Error(`Unrecognized SDK setup lock: ${lock}; inspect it before retrying`);
        const pid = Number(owners[0].split("-")[0]);
        try { process.kill(pid, 0); }
        catch (error) {
          if (error.code !== "ESRCH") throw error;
          // Remove only this dead owner's unique file. A competing recovery must
          // not remove a newly acquired lock, even when it reuses the directory.
          try { await fs.unlink(path.join(lock, owners[0])); }
          catch (error) { if (error.code === "ENOENT") continue; throw error; }
          await fs.rmdir(lock).catch(error => { if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error; });
          continue;
        }
        throw new Error("Another algorithm SDK setup is running; retry after it finishes");
      }
      return async () => {
        await fs.unlink(path.join(lock, owner));
        await fs.rmdir(lock).catch(error => { if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error; });
      };
    }
    throw new Error("Algorithm SDK setup is busy; retry after it finishes");
  } finally { await fs.rm(pending, { recursive: true, force: true }); }
}

export async function algorithmPreparation(directory, lockSha256, groups = [], { duringSetup = false } = {}) {
  if (!duringSetup) {
    const lock = `${directory}.openquantum-setup-lock`;
    const owners = await fs.readdir(lock).catch(error => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (owners !== null) {
      if (owners.length > 1 || (owners.length === 1 && !OWNER.test(owners[0]))) throw new Error(`Unrecognized SDK setup lock: ${lock}; inspect it before retrying`);
      let preparing = owners.length === 1;
      if (preparing) {
        try { process.kill(Number(owners[0].split("-")[0]), 0); }
        catch (error) { if (error.code === "ESRCH") preparing = false; else if (error.code !== "EPERM") throw error; }
      }
      // A dead owner requires setup recovery; reporting "preparing" would tell
      // the next agent to wait indefinitely for a process that no longer exists.
      return { state: preparing ? "preparing" : "not_prepared", availableGroups: [], interpreter: path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python") };
    }
  }
  const read = file => fs.readFile(path.join(directory, file), "utf8").catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const selected = await read("openquantum-groups.json");
  let availableGroups = [], state = "not_prepared";
  if (selected !== null) {
    let record;
    try { record = JSON.parse(selected); } catch { /* A partial marker is never ready. */ }
    if (record?.schemaVersion === 1 && record.lockSha256 === lockSha256 && Array.isArray(record.groups)
      && new Set(record.groups).size === record.groups.length && record.groups.every(group => ALGORITHM_GROUPS.includes(group))
      && (!record.groups.includes("chemistry") || record.groups.includes("tensor"))) {
      availableGroups = record.groups;
      state = groups.every(group => availableGroups.includes(group)) ? "prepared" : "missing_groups";
    } else state = "stale";
  } else {
    // Pre-on-demand installations used one marker for the complete environment.
    const legacy = await read("openquantum-lock.sha256");
    if (legacy !== null) {
      state = legacy.trim() === lockSha256 ? "prepared" : "stale";
      if (state === "prepared") availableGroups = [...ALGORITHM_GROUPS];
    }
  }
  const interpreter = path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  try { await fs.access(interpreter, process.platform === "win32" ? constants.F_OK : constants.X_OK); }
  catch (error) {
    if (!["ENOENT", "EACCES"].includes(error.code)) throw error;
    state = "not_prepared";
    availableGroups = [];
  }
  return { state, availableGroups, interpreter };
}
