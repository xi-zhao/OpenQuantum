import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { sourceCommand } from "./sdk-source.mjs";
import { verifySdkSourceSnapshot } from "./sdk-source-record.mjs";

const kernels = ["viterbi", "gmitm", "sparse_dp", "isd", "tree_dp"];
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

export async function readTropidistBuild(directory, source) {
  if (!source?.files) return null;
  try {
    const record = JSON.parse(await fs.readFile(path.join(directory, "native.json"), "utf8"));
    if (record.repository !== source.repository || record.revision !== source.revision ||
        record.platform !== process.platform || record.arch !== process.arch ||
        Object.keys(record.outputs ?? {}).length !== kernels.length) return null;
    const payload = path.join(directory, "payload");
    for (const name of kernels) {
      const lib = "cdist/lib" + name + ".so", input = "cdist/" + name + ".c";
      if (!Object.hasOwn(source.files, input) || !Object.hasOwn(record.outputs, lib)) return null;
      const binaryTime = (await fs.stat(path.join(payload, lib))).mtimeMs;
      if (binaryTime < (await fs.stat(path.join(payload, input))).mtimeMs) return null;
    }
    const files = { ...source.files, ...record.outputs };
    return await verifySdkSourceSnapshot(payload, { files }) ? record : null;
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function prepareTropidistBuild(sourceDirectory, source, directory) {
  if (!["linux", "darwin"].includes(process.platform)) throw new Error("tropidist requires Linux or macOS and a C compiler");
  const existing = await readTropidistBuild(directory, source);
  if (existing) return existing;
  if (await fs.lstat(directory).catch(error => { if (error.code !== "ENOENT") throw error; })) {
    throw new Error("Changed tropidist build; preserve it and select a fresh native SDK directory");
  }
  if (Object.keys(source.symlinks ?? {}).length) throw new Error("Unexpected symbolic link in tropidist inputs");
  await fs.mkdir(path.dirname(directory), { recursive: true });
  const pending = await fs.mkdtemp(directory + ".pending-");
  try {
    const payload = path.join(pending, "payload");
    for (const name of Object.keys(source.files)) {
      const file = path.join(payload, name);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.copyFile(path.join(sourceDirectory, name), file);
    }
    if (!await verifySdkSourceSnapshot(payload, source)) throw new Error("tropidist source changed before compilation");
    const compiler = sourceCommand("cc", ["--version"], payload, { capture: true }).split("\n")[0];
    const commands = [], outputs = {};
    for (const name of kernels) {
      const lib = "cdist/lib" + name + ".so";
      const flags = name === "tree_dp" ? ["-std=c99"] : process.platform === "linux" ? ["-fopenmp"] : [];
      const args = ["-O3", "-shared", "-fPIC", ...flags, "cdist/" + name + ".c", "-o", lib];
      sourceCommand("cc", args, payload);
      commands.push(["cc", ...args]);
      outputs[lib] = digest(await fs.readFile(path.join(payload, lib)));
    }
    const record = { repository: source.repository, revision: source.revision, platform: process.platform, arch: process.arch, compiler, commands, outputs };
    await fs.writeFile(path.join(pending, "native.json"), JSON.stringify(record, null, 2) + "\n");
    if (!await readTropidistBuild(pending, source)) throw new Error("Incomplete tropidist build");
    try { await fs.rename(pending, directory); }
    catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes(error.code)) throw error;
      const concurrent = await readTropidistBuild(directory, source);
      if (!concurrent) throw new Error("Concurrent tropidist build differs; preserve it for inspection");
      return concurrent;
    }
    return record;
  } finally {
    await fs.rm(pending, { recursive: true, force: true });
  }
}
