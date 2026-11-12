import { lstat, readFile, readdir, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { assertNoLinks, sha256 } from "./desktop-distribution.mjs";

export const DESKTOP_EXTENSIONS = {
  security: ["packages/openquantum-web-security", "harness-web-security"],
  capabilityHost: ["runtime/openquantum/capability-host", "harness-capability-host"],
  branding: ["packages/openquantum-web-branding", "harness-web-branding"],
  capabilities: ["runtime/openquantum/web-capabilities", "harness-web-capabilities"],
  learning: ["runtime/openquantum/web-learning", "harness-web-learning"],
  locales: ["runtime/openquantum/web-locales", "harness-web-locales"],
  updates: ["runtime/openquantum/web-updates", "harness-web-updates"],
};

export const DESKTOP_EXTENSION_RECEIPT = ".openquantum-extensions.json";

async function extensionDigest(extensionRoot) {
  const files = [];
  async function visit(relative) {
    const filename = path.join(extensionRoot, relative);
    const info = await lstat(filename);
    if (info.isSymbolicLink()) throw new Error(`Refusing to reuse an extension link: ${filename}`);
    if (info.isDirectory()) {
      files.push([relative, "directory"]);
      for (const name of (await readdir(filename)).sort()) await visit(path.posix.join(relative, name));
    } else if (info.isFile()) {
      files.push([relative, info.mode & 0o777, sha256(await readFile(filename))]);
    } else throw new Error(`Unsupported Desktop extension file: ${filename}`);
  }
  try {
    for (const [, name] of Object.values(DESKTOP_EXTENSIONS)) await visit(name);
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error.code)) return null;
    throw error;
  }
  return sha256(JSON.stringify(files));
}

/** Only the installed CLI supplies a digest of a fully verified distribution.
 * Source/Web launches keep rebuilding: no second dependency graph or mtime cache.
 */
export async function planDesktopExtensions({ harnessHome, projectRoot, sourceDigest, force = false }) {
  const receiptPath = path.join(harnessHome, DESKTOP_EXTENSION_RECEIPT);
  await assertNoLinks(receiptPath);
  const extensionRoot = path.join(harnessHome, ".openquantum-extensions");
  const identity = sourceDigest ? sha256(JSON.stringify({
    sourceDigest, projectRoot: path.resolve(projectRoot), dependencies: await realpath(path.join(projectRoot, "node_modules")),
    executable: process.execPath, node: process.version, platform: process.platform, arch: process.arch,
  })) : null;
  let reused = false;
  if (identity && !force) {
    const receipt = await readFile(receiptPath, "utf8").then(JSON.parse).catch(error => {
      if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
      throw error;
    });
    if (receipt?.schemaVersion === 1 && receipt.identity === identity && /^[a-f0-9]{64}$/.test(receipt.outputDigest)) {
      reused = await extensionDigest(extensionRoot) === receipt.outputDigest;
    }
  }
  return {
    reused, receiptPath,
    async invalidate() { await rm(receiptPath, { force: true }); },
    async complete() {
      if (!identity || reused) return;
      const outputDigest = await extensionDigest(extensionRoot);
      if (!outputDigest) throw new Error("Desktop extensions are incomplete after preparation");
      await writeFileAtomic(receiptPath, JSON.stringify({ schemaVersion: 1, identity, outputDigest }), { mode: 0o600, dirMode: 0o700 });
    },
  };
}
