import { execFile } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

async function digest(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

/** Official, version-pinned archives are verified on both download and cache reuse. */
export async function downloadRuntimeArchive({ url, sha256 }, cache) {
  if (!/^[a-f0-9]{64}$/.test(sha256) || new URL(url).protocol !== "https:") throw new Error("Invalid runtime lock entry");
  await mkdir(cache, { recursive: true });
  const archive = path.join(cache, `${sha256}-${path.basename(new URL(url).pathname)}`);
  try {
    if (await digest(archive) === sha256) return archive;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const temporary = `${archive}.download`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(300_000) });
    if (!response.ok) throw new Error(`Runtime download failed (${response.status}): ${url}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
    if (await digest(temporary) !== sha256) throw new Error(`Runtime checksum mismatch: ${url}`);
    await rename(temporary, archive);
  } finally {
    await rm(temporary, { force: true });
  }
  return archive;
}

async function findBinary(root, name) {
  const candidates = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && entry.name === name) candidates.push(path.join(root, name));
    if (entry.isDirectory()) {
      for (const child of await readdir(path.join(root, entry.name), { withFileTypes: true })) {
        if (child.isFile() && child.name === name) candidates.push(path.join(root, entry.name, name));
      }
    }
  }
  if (candidates.length !== 1) throw new Error(`Expected one ${name} in runtime archive; found ${candidates.length}`);
  return candidates[0];
}

export async function prepareDesktopRuntimes({ projectRoot, target, destination, cache }) {
  const lock = JSON.parse(await readFile(path.join(projectRoot, "desktop/runtime-lock.json"), "utf8"));
  const spec = lock.targets[target];
  if (!spec) throw new Error(`Unsupported Desktop target: ${target}`);
  await mkdir(path.join(destination, "bin"), { recursive: true });
  await mkdir(path.join(destination, "licenses"), { recursive: true });
  const windows = target.startsWith("win32-");
  for (const runtime of ["node", "uv"]) {
    console.log(`Preparing ${runtime} for ${target}`);
    const archive = await downloadRuntimeArchive(spec[runtime], cache);
    const directory = await mkdtemp(path.join(cache, "extract-"));
    try {
      await promisify(execFile)("tar", ["-xf", archive, "-C", directory]);
      if (runtime === "node") {
        const prefix = `node-v${lock.nodeVersion}-${target.replace("win32-", "win-")}`;
        await cp(path.join(directory, prefix, windows ? "node.exe" : "bin/node"), path.join(destination, "bin", windows ? "node.exe" : "node"));
        await cp(path.join(directory, prefix, "LICENSE"), path.join(destination, "licenses/Node-LICENSE"));
      } else {
        for (const name of ["uv", "uvx"]) {
          const executable = `${name}${windows ? ".exe" : ""}`;
          await cp(await findBinary(directory, executable), path.join(destination, "bin", executable));
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  if (!windows) for (const name of ["node", "uv", "uvx"]) await chmod(path.join(destination, "bin", name), 0o755);
  await cp(path.join(projectRoot, "desktop/licenses"), path.join(destination, "licenses"), { recursive: true });
  await cp(path.join(projectRoot, "desktop/runtime-lock.json"), path.join(destination, "runtime-lock.json"));
}
