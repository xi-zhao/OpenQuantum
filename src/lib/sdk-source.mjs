import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
export function sourceCommand(command, args, cwd, { capture = false } = {}) {
  const result = spawnSync(command, args, { cwd, stdio: capture ? "pipe" : "inherit", encoding: "utf8", timeout: 1_800_000 });
  if (result.error || result.status !== 0) throw new Error(`SDK setup failed: ${path.basename(command)} (${result.error?.message ?? result.status})`);
  return result.stdout?.trim();
}

export async function trackedSourceFiles(directory) {
  const realDirectory = await fs.realpath(directory);
  const names = sourceCommand("git", ["ls-files", "--recurse-submodules", "-z"], directory, { capture: true }).split("\0").filter(Boolean);
  const files = {};
  const symlinks = {};
  for (const name of names) {
    const file = path.resolve(directory, name);
    if (!file.startsWith(directory + path.sep)) throw new Error("Source path escapes its checkout");
    if ((await fs.lstat(file)).isSymbolicLink()) {
      const target = await fs.readlink(file);
      if (!path.resolve(path.dirname(file), target).startsWith(directory + path.sep)) throw new Error(`SDK source link escapes its checkout: ${name}`);
      symlinks[name] = target;
      continue;
    }
    const resolved = await fs.realpath(file);
    if (!resolved.startsWith(realDirectory + path.sep) || !(await fs.stat(file)).isFile()) throw new Error(`SDK source contains an escaping or nonordinary file: ${name}`);
    files[name] = hash(await fs.readFile(file));
  }
  if (!names.length) throw new Error("Empty SDK source checkout");
  return { files, symlinks };
}

// Installs only reviewed immutable sources. Existing changes are never reset.
export async function prepareSdkSource(directory, { repository, revision }) {
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(repository) || !/^[0-9a-f]{40}$/.test(revision)) throw new Error("SDK sources require a GitHub HTTPS repository and full commit");
  await fs.mkdir(path.dirname(directory), { recursive: true });
  const exists = await fs.access(directory).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; });
  if (!exists) {
    const pending = await fs.mkdtemp(`${directory}.pending-`);
    try {
      sourceCommand("git", ["init", pending], path.dirname(directory));
      sourceCommand("git", ["remote", "add", "origin", repository], pending);
      let failure;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          sourceCommand("git", ["-c", "http.version=HTTP/1.1", "fetch", "--depth=1", "origin", revision], pending);
          failure = null;
          break;
        } catch (error) { failure = error; }
      }
      if (failure) throw failure;
      sourceCommand("git", ["checkout", "--detach", revision], pending);
      await fs.rename(pending, directory);
    } catch (error) {
      await fs.rm(pending, { recursive: true, force: true });
      throw error;
    }
  }
  if (sourceCommand("git", ["remote", "get-url", "origin"], directory, { capture: true }) !== repository || sourceCommand("git", ["rev-parse", "HEAD"], directory, { capture: true }) !== revision) throw new Error("Unexpected SDK source checkout; preserve it and prepare the reviewed revision separately");
  if (sourceCommand("git", ["status", "--porcelain", "--untracked-files=no"], directory, { capture: true })) throw new Error("Modified SDK source; refusing to attest it");
  const modules = await fs.access(path.join(directory, ".gitmodules")).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; });
  if (modules) sourceCommand("git", ["-c", "http.version=HTTP/1.1", "submodule", "update", "--init", "--recursive", "--depth", "1"], directory);
  const submodulePaths = modules ? sourceCommand("git", ["submodule", "status", "--recursive"], directory, { capture: true }).split("\n").filter(Boolean).map(line => {
    const match = line.match(/^[ +\-U]?([0-9a-f]{40}) (.+?)(?: \(.+\))?$/);
    if (!match || !path.resolve(directory, match[2]).startsWith(directory + path.sep)) throw new Error("Invalid submodule path");
    return match[2];
  }) : [];
  for (const relative of ["", ...submodulePaths]) {
    const checkout = path.join(directory, relative);
    const extras = sourceCommand("git", ["status", "--porcelain", "--untracked-files=all", "--ignored=matching", "-z"], checkout, { capture: true }).split("\0").filter(Boolean);
    if (extras.some(item => item.slice(3) !== "openquantum-source.json" || relative)) throw new Error("Unrecorded or modified SDK source inputs; preserve them and prepare a pristine checkout separately");
  }
  const record = { repository, revision, submodulePaths, ...await trackedSourceFiles(directory) };
  const marker = path.join(directory, "openquantum-source.json");
  const pending = `${marker}.${process.pid}.tmp`;
  await fs.writeFile(pending, JSON.stringify(record, null, 2) + "\n");
  await fs.rename(pending, marker);
  return record;
}
