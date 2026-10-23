import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readdir, readFile, readlink, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { inspectReviewedMcpSource, readExternalMcpReview } from "../../lib/reviewed-mcp-source.mjs";

const exec = promisify(execFile);
export const SOURCE_MARKER = ".openquantum-source.json";

export async function assertRegularSourceFile(sourceRoot, relativeFile) {
  const parts = relativeFile.split("/");
  if (!parts.every((part) => /^[A-Za-z0-9_.-]+$/.test(part) && ![".", ".."].includes(part))) {
    throw new TypeError("Unsafe pinned source path");
  }
  for (let index = 0; index < parts.length; index += 1) {
    const candidate = path.join(sourceRoot, ...parts.slice(0, index + 1));
    const info = await lstat(candidate);
    const regular = index === parts.length - 1 ? info.isFile() : info.isDirectory();
    if (!regular || info.isSymbolicLink()) throw new Error(`${relativeFile} must be a regular source file`);
  }
}

async function git(sourceRoot, ...args) {
  const { stdout } = await exec("git", ["--no-optional-locks", "--no-replace-objects", ...args], {
    cwd: sourceRoot,
    timeout: 10_000,
    maxBuffer: 1_048_576,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  return stdout;
}

// Generated dependencies and bytecode caches are outside the source-tree check.
// Inspect filesystem entries directly so ignored and staged additions cannot hide
// a module that shadows an upstream dependency (for example, a new anyio.py).
async function assertNoAdditionalSource(target, tracked) {
  const startupFiles = new Set(["pyproject.toml", "uv.toml", "setup.cfg", "setup.py", ".python-version"]);
  async function visit(relativeDirectory = "") {
    const entries = await readdir(path.join(target, relativeDirectory), { withFileTypes: true });
    for (const entry of entries) {
      if (!relativeDirectory && [".git", ".venv", SOURCE_MARKER].includes(entry.name)) continue;
      const relativeFile = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (entry.name !== "__pycache__") await visit(relativeFile);
      } else if (!tracked.has(relativeFile) && (entry.isSymbolicLink() ||
        /\.(?:py|pyw|pyi|pyc|pyo|so|pyd|pth|dll|dylib)$/i.test(entry.name) || startupFiles.has(entry.name))) {
        throw new Error(`${relativeFile}: additional unreviewed source or startup configuration`);
      }
    }
  }
  await visit();
}

/** Inspect bytes without importing upstream code or starting its service. */
export async function inspectPinnedSourceDirectory(
  target,
  integration,
  { source = integration.sourceUrl, revision = integration.revision } = {},
) {
  const info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`${target} must be a regular directory`);
  for (const relativeFile of integration.requiredFiles) await assertRegularSourceFile(target, relativeFile);
  await assertRegularSourceFile(target, SOURCE_MARKER);
  const marker = JSON.parse(await readFile(path.join(target, SOURCE_MARKER), "utf8"));
  if (marker?.schemaVersion !== "1.0" || marker.source !== source || marker.revision !== revision) {
    throw new Error(`${integration.relativeRoot} source marker does not match the pinned release`);
  }
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Pinned source revision must be a full commit hash");
  const checkoutRoot = (await git(target, "rev-parse", "--show-toplevel")).trim();
  if (await realpath(checkoutRoot) !== await realpath(target)) throw new Error("Pinned source must be its own checkout");
  if ((await git(target, "rev-parse", "HEAD")).trim() !== revision) throw new Error("Pinned source HEAD does not match the reviewed revision");
  // Verify object contents too: filenames/refs alone do not prove a commit hash.
  await git(target, "fsck", "--no-reflogs", "--no-dangling", revision);
  // Hash actual bytes against the immutable Git tree, including build metadata.
  // Do not trust index flags (assume-unchanged/skip-worktree) or run Git filters.
  const resolvedRoot = await realpath(target);
  const tree = await git(target, "ls-tree", "-rz", "--full-tree", revision);
  const tracked = new Set();
  for (const entry of tree.split("\0").filter(Boolean)) {
    const tab = entry.indexOf("\t");
    const [mode, type, expected] = entry.slice(0, tab).split(" ");
    const relativeFile = entry.slice(tab + 1);
    tracked.add(relativeFile);
    if (type !== "blob") throw new Error("Pinned source submodules are not supported");
    const filePath = path.join(target, relativeFile);
    const info = await lstat(filePath);
    let bytes;
    if (mode === "120000" && info.isSymbolicLink()) {
      bytes = Buffer.from(await readlink(filePath));
    } else {
      if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${relativeFile}: pinned source type mismatch`);
      const resolved = await realpath(filePath);
      if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error(`${relativeFile}: source escapes checkout`);
      bytes = await readFile(filePath);
    }
    const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if (actual !== expected) throw new Error(`${relativeFile}: pinned source bytes mismatch`);
  }
  await assertNoAdditionalSource(target, tracked);
  if (integration.reviewServerName && source === integration.sourceUrl && revision === integration.revision) {
    const review = readExternalMcpReview().servers.find((entry) =>
      entry.serverName === integration.reviewServerName && entry.pin.kind === "git" && entry.pin.revision === revision && entry.pin.url === `${source}/tree/${revision}`);
    if (!review) throw new Error("Pinned source is missing its source review");
    const result = inspectReviewedMcpSource(review, target);
    if (result.status !== "pass") throw new Error(result.issues.join("; "));
  }
  return { target, source, revision };
}

export function inspectPinnedSource(root, integration, options) {
  return inspectPinnedSourceDirectory(path.join(root, integration.relativeRoot), integration, options);
}
