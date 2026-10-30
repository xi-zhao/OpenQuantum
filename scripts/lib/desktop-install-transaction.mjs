// Keep recovery independent of installed code and dependencies: this module is also
// loaded from the immutable package before an interrupted installation is inspected.
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, open, readFile, readdir, readlink, rename, rm, rmdir, symlink } from "node:fs/promises";
import path from "node:path";

const JOURNAL = ".openquantum/desktop-install-journal.json";
const BACKUPS = ".openquantum/desktop-install-backups";
const LOCK = ".openquantum/desktop-install.lock";
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const statOrNull = filename => lstat(filename).catch(error => { if (error.code === "ENOENT") return null; throw error; });

async function noLinks(filename) {
  const absolute = path.resolve(filename);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part);
    if ((await statOrNull(current))?.isSymbolicLink()) throw new Error(`Refusing to write through a link: ${current}`);
  }
}

function targetPath(root, filename) {
  const target = path.resolve(root, filename);
  const relative = path.relative(root, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
    || [JOURNAL, BACKUPS, LOCK].some(reserved => target === path.join(root, reserved) || target.startsWith(`${path.join(root, reserved)}${path.sep}`))
    || /^(?:\.openquantum\/(?:dsh\/)?)?(?:sessions|workspace|workspaces)(?:\/|$)/.test(relative.split(path.sep).join("/"))) {
    throw new Error(`Path is outside Desktop installation ownership: ${filename}`);
  }
  return target;
}

async function syncDirectory(directory) {
  if (process.platform === "win32") return; // Windows does not expose directory fsync through Node.
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

async function durableFile(filename, bytes, mode = 0o600) {
  const handle = await open(filename, "wx", mode);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}

function alive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; throw error; }
}

async function withLock(projectRoot, operation) {
  const root = path.resolve(projectRoot);
  const directory = path.join(root, LOCK);
  await noLinks(directory);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  // Unique claims avoid deleting a new owner's lock while reclaiming a dead one.
  // Concurrent claimants may both fail, but cannot both enter the operation.
  const name = `${process.pid}-${randomUUID()}`;
  const claim = path.join(directory, name);
  await durableFile(claim, "");
  try {
    for (const other of await readdir(directory)) {
      if (other === name) continue;
      const match = /^(\d+)-[a-f0-9-]+$/.exec(other);
      if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) <= 0) throw new Error("Invalid Desktop installation lock; preserve it for inspection");
      if (alive(Number(match[1]))) throw new Error(`Desktop installation is already running (pid ${match[1]})`);
      const stale = path.join(directory, other);
      await noLinks(stale);
      await rm(stale, { force: true });
    }
    return await operation(root);
  } finally { await rm(claim, { force: true }); }
}

async function persist(root, journal) {
  const directory = path.join(root, BACKUPS);
  const temporary = path.join(directory, "journal.next");
  await noLinks(temporary);
  await rm(temporary, { force: true });
  await durableFile(temporary, JSON.stringify(journal, null, 2));
  await rename(temporary, path.join(root, JOURNAL));
  await syncDirectory(path.dirname(path.join(root, JOURNAL)));
}

async function clean(root) {
  await noLinks(path.join(root, BACKUPS));
  await rm(path.join(root, BACKUPS), { recursive: true, force: true });
  // The durable outcome stays present until all backups have been removed.
  await rm(path.join(root, JOURNAL), { force: true });
  await syncDirectory(path.join(root, ".openquantum"));
}

async function blob(root, bytes) {
  const name = `${randomUUID()}.data`;
  await durableFile(path.join(root, BACKUPS, name), bytes);
  await syncDirectory(path.join(root, BACKUPS));
  return { blob: name, sha256: digest(bytes) };
}

async function readBlob(root, entry) {
  if (!/^[a-f0-9-]+\.data$/.test(entry.blob) || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("Invalid Desktop backup reference");
  const filename = path.join(root, BACKUPS, entry.blob);
  await noLinks(filename);
  if (!(await lstat(filename)).isFile()) throw new Error("Desktop backup is not a regular file");
  const bytes = await readFile(filename);
  if (digest(bytes) !== entry.sha256) throw new Error("Damaged Desktop installation backup; recovery remains pending");
  return bytes;
}

async function snapshot(root, target) {
  await noLinks(path.dirname(target));
  const info = await statOrNull(target);
  if (!info) return { kind: "absent" };
  const mode = info.mode & 0o7777;
  if (info.isSymbolicLink()) return { kind: "link", mode, ...await blob(root, Buffer.from(await readlink(target))) };
  if (info.isFile()) return { kind: "file", mode, ...await blob(root, await readFile(target)) };
  if (info.isDirectory()) return { kind: "directory", mode };
  throw new Error(`Unsupported Desktop installation target: ${target}`);
}

async function removeLeaf(target) {
  if ((await statOrNull(target))?.isDirectory()) throw new Error(`Refusing to replace an unexpected directory: ${target}`);
  await rm(target, { force: true });
}

async function restoreLeaf(root, target, entry) {
  await noLinks(path.dirname(target));
  if (entry.kind === "absent") { await removeLeaf(target); return; }
  if (entry.kind === "directory") {
    const info = await statOrNull(target);
    if (info && !info.isDirectory()) await removeLeaf(target);
    await mkdir(target, { recursive: true, mode: entry.mode });
    await chmod(target, entry.mode);
    return;
  }
  if (!["file", "link"].includes(entry.kind) || !Number.isInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o7777) throw new Error("Invalid Desktop backup entry");
  const bytes = await readBlob(root, entry);
  if ((await statOrNull(target))?.isDirectory()) throw new Error(`Refusing to replace an unexpected directory: ${target}`);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = path.join(root, BACKUPS, "restore.next");
  await noLinks(path.dirname(temporary));
  await rm(temporary, { force: true });
  if (entry.kind === "link") await symlink(bytes.toString(), temporary, process.platform === "win32" ? "junction" : undefined);
  else { await durableFile(temporary, bytes, entry.mode); await chmod(temporary, entry.mode); }
  // Windows cannot rename over a directory junction. The durable snapshot stays
  // pending until replacement completes, so recovery can retry after this unlink.
  if (process.platform === "win32" && (await statOrNull(target))?.isSymbolicLink()) await removeLeaf(target);
  await rename(temporary, target);
  await syncDirectory(path.dirname(target));
}

async function walkTree(root, target, excluded, visit, relative = "") {
  await noLinks(path.dirname(target));
  const info = await statOrNull(target);
  if (!info) return;
  await visit(target, relative, info);
  if (!info.isDirectory()) return; // lstat: links are saved, never followed.
  for (const name of (await readdir(target)).sort()) {
    if (excluded.includes(name)) continue;
    if (["sessions", "workspace", "workspaces"].includes(name)) throw new Error("Refusing to snapshot Desktop session or workspace trees");
    await walkTree(root, path.join(target, name), excluded, visit, path.join(relative, name));
  }
}

async function restoreTree(root, target, entry) {
  const originals = new Map(entry.members.map(member => [member.path, member]));
  const current = [];
  await walkTree(root, target, entry.exclude, async (filename, relative, info) => current.push({ filename, relative, info }));
  for (const { filename, relative, info } of current.reverse()) {
    const original = originals.get(relative);
    if (original && (info.isDirectory() === (original.kind === "directory"))) continue;
    if (info.isDirectory()) {
      // Excluded dependency trees are outside this snapshot's ownership.
      await rmdir(filename).catch(error => { if (!["ENOTEMPTY", "EEXIST"].includes(error.code)) throw error; });
    } else await rm(filename, { force: true });
  }
  for (const member of entry.members) {
    const filename = member.path ? targetPath(root, path.join(target, member.path)) : target;
    if (filename !== target && !filename.startsWith(`${target}${path.sep}`)) throw new Error("Invalid Desktop tree backup path");
    await restoreLeaf(root, filename, member);
  }
}

async function restoreDetached(root, target, entry) {
  await noLinks(path.dirname(target));
  if (!/^[a-f0-9-]+\.directory$/.test(entry.backup) || path.basename(target) !== "node_modules") throw new Error("Invalid detached Desktop dependency directory");
  const backup = path.join(root, BACKUPS, entry.backup);
  await noLinks(path.dirname(backup));
  const stored = await statOrNull(backup);
  const current = await statOrNull(target);
  const original = info => info && (info.isDirectory() || info.isSymbolicLink()) && info.dev === entry.dev && info.ino === entry.ino;
  if (entry.existed && !stored) {
    // Either the write-ahead rename had not run, or an earlier rollback restored it.
    if (original(current)) return;
    throw new Error("Detached Desktop dependencies are missing; recovery remains pending");
  }
  if (stored && !original(stored)) throw new Error("Detached Desktop dependencies changed; recovery remains pending");
  await rm(target, { recursive: true, force: true });
  if (stored) await rename(backup, target);
  await syncDirectory(path.dirname(target));
}

async function restoreLock(root, target, entry) {
  if (path.basename(target) !== ".credentials.yaml.lock" || !Number.isSafeInteger(entry.pid) || entry.pid <= 0) throw new Error("Invalid Desktop credential lock registration");
  await noLinks(target);
  const before = await statOrNull(target);
  if (!before) return;
  const expected = `${entry.pid}\n`;
  if (!before.isFile() || await readFile(target, "utf8") !== expected) throw new Error("Desktop credential lock belongs to another writer; recovery remains pending");
  if (entry.pid !== process.pid && alive(entry.pid)) throw new Error("Desktop credential lock owner is still running; recovery remains pending");
  const after = await lstat(target);
  if (!after.isFile() || before.dev !== after.dev || before.ino !== after.ino || await readFile(target, "utf8") !== expected) throw new Error("Desktop credential lock changed; recovery remains pending");
  await rm(target);
  await syncDirectory(path.dirname(target));
}

function assertNoWriters(journal) {
  for (const writer of journal.writers) {
    if (!Number.isSafeInteger(writer.pid) || writer.pid <= 0) throw new Error("Invalid Desktop writer registration");
    if (alive(writer.group ? -writer.pid : writer.pid)) throw new Error(`Desktop preparation writer is still running (pid ${writer.pid}); recovery remains pending`);
    if (!writer.group) throw new Error("Cannot confirm that interrupted Desktop preparation descendants exited; recovery remains pending");
  }
}

async function rollback(root, journal) {
  assertNoWriters(journal);
  while (journal.entries.length) {
    const entry = journal.entries.at(-1);
    const target = targetPath(root, entry.path);
    if (entry.kind === "tree") await restoreTree(root, target, entry);
    else if (entry.kind === "detached") await restoreDetached(root, target, entry);
    else if (entry.kind === "credential-lock") await restoreLock(root, target, entry);
    else if (entry.kind === "created-directory") {
      await noLinks(target);
      await rmdir(target).catch(error => { if (error.code !== "ENOENT") throw error; });
    } else await restoreLeaf(root, target, entry);
    const next = { ...journal, entries: journal.entries.slice(0, -1) };
    await persist(root, next);
    journal.entries = next.entries;
  }
  await persist(root, { ...journal, status: "rolled-back" });
  journal.status = "rolled-back";
  await clean(root);
}

async function recover(root) {
  await noLinks(path.join(root, JOURNAL));
  await noLinks(path.join(root, BACKUPS));
  const journal = await readFile(path.join(root, JOURNAL), "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (!journal) {
    // A crash before the initial journal is durable cannot have changed a target.
    if (await statOrNull(path.join(root, BACKUPS))) {
      const contents = await readdir(path.join(root, BACKUPS));
      if (contents.some(name => name !== "journal.next")) throw new Error("Desktop backups have no journal; preserve them for inspection");
      await rm(path.join(root, BACKUPS), { recursive: true });
    }
    return { recovered: false };
  }
  if (journal.schemaVersion !== 1 || !["pending", "committed", "rolled-back"].includes(journal.status)
    || !Array.isArray(journal.entries) || !Array.isArray(journal.writers)) throw new Error("Unsupported Desktop installation journal");
  assertNoWriters(journal);
  if (journal.status === "pending") await rollback(root, journal);
  else await clean(root);
  return { recovered: true, status: journal.status };
}

// The child cannot start its writer until its pid/process group is durable. On
// parent death an armed POSIX gate kills its whole group, including pnpm children.
const WRITER_GATE = `
const { spawn } = require('node:child_process');
let armed = false, finished = false;
process.on('disconnect', () => {
  if (finished) return;
  if (armed && process.platform !== 'win32') process.kill(-process.pid, 'SIGKILL');
  else if (!armed) process.exit(0);
});
process.once('message', ({ command, args, options }) => {
  armed = true;
  const child = spawn(command, args, { ...options, detached: false, shell: false, stdio: ['ignore', 'inherit', 'inherit'] });
  child.once('error', error => { console.error(error.message); });
  child.once('close', code => {
    finished = true;
    process.exitCode = code ?? 1;
    if (process.connected) process.disconnect();
  });
});
`;

async function begin(root) {
  await mkdir(path.join(root, BACKUPS), { mode: 0o700 });
  let journal = { schemaVersion: 1, status: "pending", entries: [], writers: [] };
  await persist(root, journal);
  let persistenceFailed = false;
  const save = async next => {
    try { await persist(root, next); journal = next; }
    catch (error) { persistenceFailed = true; throw error; }
  };
  const recorded = new Set();
  const add = async (target, entry) => {
    await save({ ...journal, entries: [...journal.entries, { path: path.relative(root, target), ...entry }] });
    recorded.add(target);
  };
  const parents = async target => {
    const missing = [];
    for (let parent = path.dirname(target); parent !== root && !await statOrNull(parent); parent = path.dirname(parent)) missing.push(parent);
    for (const parent of missing.reverse()) if (!recorded.has(parent)) await add(parent, { kind: "created-directory" });
  };
  const capture = async filename => {
    const target = targetPath(root, filename);
    if (recorded.has(target)) return;
    await noLinks(path.dirname(target));
    const entry = await snapshot(root, target);
    if (entry.kind === "directory") throw new Error(`Use captureTree for an explicitly owned small directory: ${target}`);
    await parents(target);
    await add(target, entry);
  };
  const captureLock = async filename => {
    const target = targetPath(root, filename);
    if (target !== path.join(root, ".openquantum/dsh/.credentials.yaml.lock")) throw new Error("Only the Desktop credential writer lock can be registered");
    if (recorded.has(target)) return;
    await noLinks(target);
    if (await statOrNull(target)) throw new Error(`Desktop credential writer lock already exists: ${target}`);
    await parents(target);
    await add(target, { kind: "credential-lock", pid: process.pid });
  };
  const captureTree = async (filename, { exclude = [] } = {}) => {
    const target = targetPath(root, filename);
    const relative = path.relative(root, target).split(path.sep).join("/");
    // Capability directories also own SDK environments; capture their small
    // settings files individually instead of snapshotting the whole tree.
    if (!/^\.openquantum\/dsh\/(?:\.openquantum-extensions(?:\/[A-Za-z0-9_-]+)?|\.agent-presets\/(?:openquantum|quantum-learning))$/.test(relative)) {
      throw new Error(`Not an owned small Desktop Home directory: ${target}`);
    }
    if (recorded.has(target)) return;
    const excluded = [...new Set(["node_modules", ...exclude])];
    if (excluded.some(name => typeof name !== "string" || !name || name === "." || name === ".." || /[\\/]/.test(name))) throw new Error("Tree exclusions must be directory basenames");
    const members = [];
    await walkTree(root, target, excluded, async (name, relative) => members.push({ path: relative, ...await snapshot(root, name) }));
    await parents(target);
    await add(target, { kind: "tree", exclude: excluded, members });
  };
  const detachDirectory = async filename => {
    const target = targetPath(root, filename);
    if (path.basename(target) !== "node_modules") throw new Error("Only a Profile node_modules directory can be detached");
    if (recorded.has(target)) throw new Error(`Desktop dependency directory was already captured: ${target}`);
    await noLinks(path.dirname(target));
    const info = await statOrNull(target);
    if (info && !info.isDirectory() && !info.isSymbolicLink()) throw new Error(`Expected a Desktop dependency directory: ${target}`);
    const backup = `${randomUUID()}.directory`;
    await parents(target);
    await add(target, { kind: "detached", backup, existed: Boolean(info), dev: info?.dev, ino: info?.ino });
    if (info) { await rename(target, path.join(root, BACKUPS, backup)); await syncDirectory(path.dirname(target)); await syncDirectory(path.join(root, BACKUPS)); }
  };
  const runWriter = async (command, args = [], options = {}) => {
    const { maxBuffer = 4 * 1024 * 1024, ...spawnOptions } = options;
    const group = process.platform !== "win32";
    const child = spawn(process.execPath, ["-e", WRITER_GATE], { detached: group, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let stdout = "", stderr = "", failure;
    const closed = new Promise(resolve => {
      child.once("error", error => { failure = error; });
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    for (const [stream, append] of [[child.stdout, text => { stdout += text; }], [child.stderr, text => { stderr += text; }]]) stream.on("data", bytes => {
      append(bytes.toString());
      if (stdout.length + stderr.length > maxBuffer) {
        failure = new Error("Desktop preparation output exceeded maxBuffer");
        if (group) { try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") failure = error; } }
        else child.kill("SIGKILL");
      }
    });
    try {
      if (!child.pid) { await closed; throw failure ?? new Error("Could not start Desktop preparation writer"); }
      await save({ ...journal, writers: [...journal.writers, { pid: child.pid, group }] });
      child.send({ command, args, options: spawnOptions });
      const { code, signal } = await closed;
      if (group && alive(-child.pid)) throw new Error("Desktop preparation descendants are still running; recovery remains pending");
      if (!group && (failure || signal)) throw new Error("Cannot confirm that interrupted Desktop preparation descendants exited; recovery remains pending");
      await save({ ...journal, writers: journal.writers.filter(writer => writer.pid !== child.pid) });
      if (failure) throw failure;
      if (code !== 0) throw new Error(`Desktop preparation writer failed (${signal ?? code}): ${stderr.trim()}`);
      return { stdout, stderr };
    } finally {
      if (child.connected) child.disconnect();
    }
  };
  return {
    api: { capture, captureTree, captureLock, detachDirectory, runWriter },
    get journal() { return journal; },
    commit: async () => { assertNoWriters(journal); await save({ ...journal, status: "committed" }); await clean(root); },
    rollback: () => {
      if (persistenceFailed) throw new Error("Desktop journal persistence failed; reopen the durable journal before recovery");
      return rollback(root, journal);
    },
  };
}

/** Lock + recovery + optional transaction. begin() follows read-only preflight. */
export async function withDesktopInstall(projectRoot, operation) {
  return withLock(projectRoot, async root => {
    await recover(root);
    let transaction;
    try {
      const result = await operation({ begin: async () => {
        if (transaction) throw new Error("Desktop installation transaction already started");
        transaction = await begin(root);
        return transaction.api;
      } });
      if (transaction) await transaction.commit();
      return result;
    } catch (error) {
      if (transaction?.journal.status === "pending") {
        try { await transaction.rollback(); }
        catch (recoveryError) { throw new AggregateError([error, recoveryError], `Desktop installation failed; recovery remains pending: ${recoveryError.message}`, { cause: error }); }
      }
      throw error;
    }
  });
}

/** Call from the immutable installer before downgrade checks or installed imports. */
export async function recoverDesktopInstall(projectRoot) {
  return withLock(projectRoot, recover);
}
