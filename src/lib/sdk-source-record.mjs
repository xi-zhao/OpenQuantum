import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

// File-only discovery. No Git command, import, download or source execution.
export async function verifySdkSourceSnapshot(directory, record) {
  const files = record.files ?? {}, symlinks = record.symlinks ?? {};
  const expected = new Set([...Object.keys(files), ...Object.keys(symlinks)]);
  if (!expected.size || [...expected].some(name => !path.resolve(directory, name).startsWith(directory + path.sep))) return false;
  const realDirectory = await fs.realpath(directory);
  const gitPaths = new Set([".git", ...(record.submodulePaths ?? []).map(name => `${name}/.git`)]);
  let found = 0;
  async function walk(relative = "") {
    for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (gitPaths.has(name) || name === "openquantum-source.json") continue;
      const file = path.join(directory, name);
      if (entry.isDirectory()) {
        if (![...expected].some(item => item.startsWith(name + "/")) || !await walk(name)) return false;
      } else if (entry.isSymbolicLink()) {
        if (!Object.hasOwn(symlinks, name) || await fs.readlink(file) !== symlinks[name] || !path.resolve(path.dirname(file), symlinks[name]).startsWith(directory + path.sep)) return false;
        found++;
      } else if (entry.isFile()) {
        if (!Object.hasOwn(files, name) || !(await fs.realpath(file)).startsWith(realDirectory + path.sep)) return false;
        if (createHash("sha256").update(await fs.readFile(file)).digest("hex") !== files[name]) return false;
        found++;
      } else return false;
    }
    return true;
  }
  try { return await walk() && found === expected.size; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}
