import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

const STATE = ".openquantum/desktop-distribution.json";
export const sha256 = (data) => createHash("sha256").update(data).digest("hex");

function relativeFile(filename) {
  if (typeof filename !== "string" || !filename || filename.includes("\\")
    || filename.includes(":") || filename.split("/").some((part) => !part || part === "." || part === "..")
    || /(^|\/)(node_modules|\.env[^/]*|\.git|\.openquantum)(\/|$)/.test(filename)) {
    throw new Error(`Invalid distribution path: ${filename}`);
  }
  return filename;
}

async function statOrNull(filename) {
  return lstat(filename).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
}

// Reject links in every writable path, including ancestors of the project.
// Installer-created node_modules is handled separately and never traversed.
async function assertNoLinks(filename) {
  const absolute = path.resolve(filename);
  const parts = absolute.slice(path.parse(absolute).root.length).split(path.sep);
  let current = path.parse(absolute).root;
  for (const part of parts) {
    current = path.join(current, part);
    if ((await statOrNull(current))?.isSymbolicLink()) throw new Error(`Refusing to write through a link: ${current}`);
  }
}

async function atomicWrite(filename, content, mode = 0o600) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { mode });
    await rename(temporary, filename);
  } finally {
    await rm(temporary, { force: true });
  }
}

function editable(filename) {
  return filename.startsWith(".agents/skills/")
    || filename === "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
}

function validateManifest(manifest) {
  if (manifest.schemaVersion !== 1 || typeof manifest.version !== "string"
    || !manifest.files || typeof manifest.files !== "object" || Array.isArray(manifest.files)) {
    throw new Error("Unsupported Desktop distribution manifest");
  }
  for (const [filename, entry] of Object.entries(manifest.files)) {
    relativeFile(filename);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || ![0o644, 0o755].includes(entry.mode)) {
      throw new Error(`Invalid distribution entry: ${filename}`);
    }
  }
}

/** Refresh only distributed files; preserve sessions, credentials and user extensions. */
export async function installDesktopDistribution({ payload, projectRoot }) {
  const next = JSON.parse(await readFile(path.join(payload, "distribution.json"), "utf8"));
  validateManifest(next);
  const statePath = path.join(projectRoot, STATE);
  await assertNoLinks(statePath);
  const previous = await readFile(statePath, "utf8").then(JSON.parse).catch((error) => {
    if (error.code === "ENOENT") return { schemaVersion: 1, version: "", files: {} };
    throw error;
  });
  validateManifest(previous);
  const changes = [];
  const preserved = [];
  // Validate the entire payload and update plan before touching an existing install.
  for (const filename of new Set([...Object.keys(next.files), ...Object.keys(previous.files)])) {
    const target = path.join(projectRoot, filename);
    await assertNoLinks(target);
    const current = await readFile(target).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    const before = previous.files[filename];
    const after = next.files[filename];
    const content = after ? await readFile(path.join(payload, filename)) : null;
    if (after && sha256(content) !== after.sha256) throw new Error(`Damaged installation payload: ${filename}`);
    const currentHash = current === null ? null : sha256(current);
    if (after && currentHash === after.sha256) continue;
    if (currentHash && currentHash !== before?.sha256) {
      if (!editable(filename)) throw new Error(`Locally changed program file; restore it before upgrading: ${filename}`);
      preserved.push(filename);
      // Keep edited Skills/MCP settings. New defaults are available for explicit review.
      if (after && before?.sha256 !== after.sha256) {
        const reviewPath = path.join(projectRoot, ".openquantum", "distribution-defaults", after.sha256, filename);
        await assertNoLinks(reviewPath);
        changes.push({ target: reviewPath, content, mode: after.mode });
      }
      continue;
    }
    // Removing a built-in Skill is a supported settings action; do not recreate it
    // at every startup. New files in later versions are still installed.
    if (current === null && before && editable(filename)) continue;
    if (after || current !== null) changes.push({ target, content, mode: after?.mode });
  }
  const dependencies = path.join(projectRoot, "node_modules");
  const dependencyStat = await statOrNull(dependencies);
  if (dependencyStat && !dependencyStat.isSymbolicLink()) throw new Error("An unmanaged node_modules directory blocks Desktop preparation");
  for (const { target, content, mode } of changes) {
    if (content === null) await rm(target, { force: true });
    else await atomicWrite(target, content, mode);
  }
  await mkdir(projectRoot, { recursive: true });
  if (dependencyStat) await rm(dependencies, { force: true });
  await symlink(path.join(payload, "node_modules"), dependencies, process.platform === "win32" ? "junction" : "dir");
  await atomicWrite(statePath, JSON.stringify(next, null, 2));
  return { version: next.version, changedFiles: changes.length, preservedFiles: preserved };
}
