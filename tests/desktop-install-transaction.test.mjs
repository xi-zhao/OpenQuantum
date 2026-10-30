import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { recoverDesktopInstall, withDesktopInstall } from "../scripts/lib/desktop-install-transaction.mjs";

const moduleURL = new URL("../scripts/lib/desktop-install-transaction.mjs", import.meta.url).href;
const journalPath = root => path.join(root, ".openquantum/desktop-install-journal.json");
const backupPath = root => path.join(root, ".openquantum/desktop-install-backups");

async function fixture(t) {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-install-transaction-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  await mkdir(project);
  return { root, project, home: path.join(project, ".openquantum/dsh") };
}

async function noJournal(project) {
  await assert.rejects(stat(journalPath(project)), { code: "ENOENT" });
  await assert.rejects(stat(backupPath(project)), { code: "ENOENT" });
}

async function interrupted(t, project, body) {
  const child = spawn(process.execPath, ["--input-type=module", "-e", `
    import { withDesktopInstall } from ${JSON.stringify(moduleURL)};
    import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
    import path from 'node:path';
    const project = process.argv[1];
    await withDesktopInstall(project, async ({ begin }) => {
      const tx = await begin();
      ${body}
      process.send('ready');
      await new Promise(() => {});
    });
  `, project], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let stderr = "";
  child.stderr.on("data", bytes => { stderr += bytes; });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
  const stopped = once(child, "exit");
  await Promise.race([
    once(child, "message"),
    stopped.then(() => { throw new Error(`Interrupted fixture exited early: ${stderr}`); }),
  ]);
  child.kill("SIGKILL");
  await stopped;
}

test("rolls back bytes, permission modes, links and absence without following links", async t => {
  const { project, root } = await fixture(t);
  const file = path.join(project, "credentials.yaml"), link = path.join(project, "dependencies");
  const outside = path.join(root, "outside");
  await mkdir(outside);
  await writeFile(path.join(outside, "untouched"), "outside data");
  await writeFile(file, "synthetic secret before", { mode: 0o640 });
  await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(withDesktopInstall(project, async ({ begin }) => {
    const tx = await begin();
    await tx.capture(file);
    await tx.capture(link);
    const added = path.join(project, "new/deep/created.json");
    await tx.capture(added);
    assert.equal((await stat(backupPath(project))).mode & 0o777, 0o700);
    const journal = await readFile(journalPath(project), "utf8");
    assert.ok(!journal.includes("synthetic secret before"));
    assert.ok(!journal.includes(outside));
    for (const name of await readdir(backupPath(project))) assert.equal((await stat(path.join(backupPath(project), name))).mode & 0o777, 0o600);
    await writeFile(file, "changed");
    await chmod(file, 0o777);
    await rm(link);
    await symlink(path.join(root, "new-dependencies"), link);
    await mkdir(path.dirname(added), { recursive: true });
    await writeFile(added, "new");
    throw new Error("prepare failed");
  }), /prepare failed/);
  assert.equal(await readFile(file, "utf8"), "synthetic secret before");
  assert.equal((await stat(file)).mode & 0o777, 0o640);
  assert.equal(await readlink(link), outside);
  assert.equal(await readFile(path.join(outside, "untouched"), "utf8"), "outside data");
  await assert.rejects(stat(path.join(project, "new")), { code: "ENOENT" });
  await noJournal(project);
});

test("owned tree rollback removes added files and restores removed files, modes and link text", async t => {
  const { project, home, root } = await fixture(t);
  const tree = path.join(home, ".agent-presets/openquantum");
  await mkdir(path.join(tree, "node_modules"), { recursive: true });
  await writeFile(path.join(tree, "node_modules/do-not-copy"), "dependency");
  await writeFile(path.join(tree, "existing"), "old", { mode: 0o750 });
  await symlink(path.join(root, "outside"), path.join(tree, "link"));
  const beforeMode = (await stat(tree)).mode & 0o777;
  await assert.rejects(withDesktopInstall(project, async ({ begin }) => {
    const tx = await begin();
    await tx.captureTree(tree);
    const journal = JSON.parse(await readFile(journalPath(project), "utf8"));
    assert.ok(journal.entries.at(-1).members.every(member => !member.path.includes("node_modules")));
    await rm(path.join(tree, "existing"));
    await rm(path.join(tree, "link"));
    await mkdir(path.join(tree, "new/sub"), { recursive: true });
    await writeFile(path.join(tree, "new/sub/added"), "new");
    await chmod(tree, 0o700);
    throw new Error("fail");
  }), /fail/);
  assert.equal(await readFile(path.join(tree, "existing"), "utf8"), "old");
  assert.equal((await stat(path.join(tree, "existing"))).mode & 0o777, 0o750);
  assert.equal((await stat(tree)).mode & 0o777, beforeMode);
  assert.equal(await readlink(path.join(tree, "link")), path.join(root, "outside"));
  assert.equal(await readFile(path.join(tree, "node_modules/do-not-copy"), "utf8"), "dependency");
  await assert.rejects(stat(path.join(tree, "new")), { code: "ENOENT" });
  await noJournal(project);
});

test("tree snapshot of a missing preset removes newly created owned subtree", async t => {
  const { project, home } = await fixture(t);
  const tree = path.join(home, ".agent-presets/quantum-learning");
  await assert.rejects(withDesktopInstall(project, async ({ begin }) => {
    const tx = await begin();
    await tx.captureTree(tree);
    await mkdir(path.join(tree, "nested"), { recursive: true });
    await writeFile(path.join(tree, "nested/agent.mjs"), "new");
    throw new Error("fail");
  }), /fail/);
  await assert.rejects(stat(tree), { code: "ENOENT" });
  await noJournal(project);
});

test("detachDirectory moves dependencies and restores the same inode after failure", async t => {
  const { project, home } = await fixture(t);
  const dependencies = path.join(home, "profiles/desktop/node_modules");
  await mkdir(dependencies, { recursive: true });
  await writeFile(path.join(dependencies, "module"), "old dependency");
  const before = await stat(dependencies);
  await assert.rejects(withDesktopInstall(project, async ({ begin }) => {
    const tx = await begin();
    await tx.detachDirectory(dependencies);
    await assert.rejects(stat(dependencies), { code: "ENOENT" });
    const journal = JSON.parse(await readFile(journalPath(project), "utf8"));
    const stored = await stat(path.join(backupPath(project), journal.entries.at(-1).backup));
    assert.equal(stored.ino, before.ino);
    await mkdir(dependencies);
    await writeFile(path.join(dependencies, "partial"), "new dependency");
    throw new Error("pnpm failure");
  }), /pnpm failure/);
  assert.equal((await stat(dependencies)).ino, before.ino);
  assert.equal(await readFile(path.join(dependencies, "module"), "utf8"), "old dependency");
  await assert.rejects(stat(path.join(dependencies, "partial")), { code: "ENOENT" });
  await noJournal(project);
});

test("detached missing directories and symlinks both roll back without copying dependencies", async t => {
  for (const existing of [false, true]) {
    const { project, home, root } = await fixture(t);
    const dependencies = path.join(home, "profiles/desktop/node_modules");
    await mkdir(path.dirname(dependencies), { recursive: true });
    if (existing) await symlink(path.join(root, "external-modules"), dependencies);
    await assert.rejects(withDesktopInstall(project, async ({ begin }) => {
      const tx = await begin();
      await tx.detachDirectory(dependencies);
      await mkdir(dependencies);
      await writeFile(path.join(dependencies, "partial"), "new");
      throw new Error("fail");
    }), /fail/);
    if (existing) assert.equal(await readlink(dependencies), path.join(root, "external-modules"));
    else await assert.rejects(lstat(dependencies), { code: "ENOENT" });
    await noJournal(project);
  }
});

test("rejects outside paths, linked ancestors, data trees and broad tree snapshots", async t => {
  const { project, root, home } = await fixture(t);
  const outside = path.join(root, "outside");
  await mkdir(outside);
  await symlink(outside, path.join(project, "linked"));
  await withDesktopInstall(project, async ({ begin }) => {
    const tx = await begin();
    for (const name of [path.join(outside, "file"), path.join(project, "linked/file"), path.join(home, "sessions/log.jsonl"), journalPath(project)]) {
      await assert.rejects(tx.capture(name), /ownership|link/);
    }
    for (const name of [project, home, path.join(project, "src"), path.join(home, ".openquantum/capabilities"), path.join(home, ".openquantum/capabilities/environments")]) {
      await assert.rejects(tx.captureTree(name), /ownership|owned small/);
    }
    await assert.rejects(tx.detachDirectory(path.join(home, "sessions")), /ownership/);
  });
  await noJournal(project);
});

test("credential lock recovery only removes the registered dead owner's exact lock", async t => {
  const { project, home } = await fixture(t);
  await mkdir(home, { recursive: true });
  const filename = path.join(home, ".credentials.yaml.lock");
  await interrupted(t, project, `
    const filename = path.join(project, '.openquantum/dsh/.credentials.yaml.lock');
    await tx.captureLock(filename);
    await writeFile(filename, process.pid + '\\n');
  `);
  await recoverDesktopInstall(project);
  await assert.rejects(stat(filename), { code: "ENOENT" });
  await noJournal(project);
});

test("credential lock recovery preserves foreign ownership and retries after it is released", async t => {
  const { project, home } = await fixture(t);
  await mkdir(home, { recursive: true });
  const filename = path.join(home, ".credentials.yaml.lock");
  await interrupted(t, project, `
    await tx.captureLock(path.join(project, '.openquantum/dsh/.credentials.yaml.lock'));
  `);
  await writeFile(filename, `${process.pid}\n`);
  await assert.rejects(recoverDesktopInstall(project), /belongs to another writer/);
  assert.equal(await readFile(filename, "utf8"), `${process.pid}\n`);
  assert.equal(JSON.parse(await readFile(journalPath(project), "utf8")).status, "pending");
  await rm(filename);
  await recoverDesktopInstall(project);
  await noJournal(project);
  await writeFile(filename, "existing lock");
  await assert.rejects(withDesktopInstall(project, async ({ begin }) => {
    await (await begin()).captureLock(filename);
  }), /already exists/);
  assert.equal(await readFile(filename, "utf8"), "existing lock");
});

test("interrupted migration releases its registered settings locks before removing new directories", async t => {
  const { project, home } = await fixture(t);
  const storageURL = new URL("../src/settings/codex/storage.mjs", import.meta.url).href;
  await interrupted(t, project, `
    const { withLock } = await import(${JSON.stringify(storageURL)});
    const home = path.join(project, '.openquantum/dsh');
    const files = ['migration.json', 'settings.json', 'skill-policy.json'].map(name => path.join(home, '.openquantum/capabilities', name));
    files.push(path.join(home, '.openquantum-home.json'));
    for (const file of files) await tx.capture(file);
    for (const file of files) await tx.captureLock(file + '.openquantum.lock');
    async function hold(index) {
      if (index < files.length) return withLock(files[index], () => hold(index + 1));
      await writeFile(files[0], '{}');
      process.send('ready');
      await new Promise(() => {});
    }
    await hold(0);
  `);
  assert.equal((await readdir(path.join(home, '.openquantum/capabilities'))).filter(name => name.endsWith('.lock')).length, 3);
  await recoverDesktopInstall(project);
  await assert.rejects(stat(home), { code: "ENOENT" });
  await noJournal(project);
});

test("migration lock recovery preserves a replacement owned by another process", async t => {
  const { project, home } = await fixture(t);
  const file = path.join(home, '.openquantum/capabilities/settings.json.openquantum.lock');
  await interrupted(t, project, `
    const file = path.join(project, '.openquantum/dsh/.openquantum/capabilities/settings.json.openquantum.lock');
    await tx.captureLock(file);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ pid: process.pid, nonce: '11111111-1111-1111-1111-111111111111' }));
  `);
  const foreign = JSON.stringify({ pid: process.pid, nonce: '22222222-2222-2222-2222-222222222222' });
  await writeFile(file, foreign);
  await assert.rejects(recoverDesktopInstall(project), /belongs to another writer/);
  assert.equal(await readFile(file, 'utf8'), foreign);
  await rm(file);
  await recoverDesktopInstall(project);
  await noJournal(project);
});

test("disk errors retain the journal until a later successful, idempotent recovery", async t => {
  const { project } = await fixture(t);
  const target = path.join(project, "settings.yaml");
  await writeFile(target, "before");
  let saved;
  await assert.rejects(withDesktopInstall(project, async ({ begin }) => {
    const tx = await begin();
    await tx.capture(target);
    await writeFile(target, "after");
    const journal = JSON.parse(await readFile(journalPath(project), "utf8"));
    const filename = path.join(backupPath(project), journal.entries.at(-1).blob);
    saved = { filename, bytes: await readFile(filename) };
    await rm(filename); // ENOENT while rolling back must not claim recovery succeeded.
    throw new Error("callback failure");
  }), /recovery remains pending/);
  assert.equal(JSON.parse(await readFile(journalPath(project), "utf8")).status, "pending");
  assert.equal(await readFile(target, "utf8"), "after");
  await writeFile(saved.filename, saved.bytes, { mode: 0o600 });
  assert.equal((await recoverDesktopInstall(project)).recovered, true);
  assert.equal(await readFile(target, "utf8"), "before");
  assert.deepEqual(await recoverDesktopInstall(project), { recovered: false });
  await noJournal(project);
});

test("a killed child is recovered from the durable journal, including directory detach", async t => {
  const { project, home } = await fixture(t);
  const filename = path.join(project, "settings.yaml");
  const dependencies = path.join(home, "profiles/desktop/node_modules");
  await writeFile(filename, "before", { mode: 0o640 });
  await mkdir(dependencies, { recursive: true });
  await writeFile(path.join(dependencies, "module"), "before");
  const inode = (await stat(dependencies)).ino;
  await interrupted(t, project, `
    await tx.capture(path.join(project, 'settings.yaml'));
    await writeFile(path.join(project, 'settings.yaml'), 'interrupted');
    const dependencies = path.join(project, '.openquantum/dsh/profiles/desktop/node_modules');
    await tx.detachDirectory(dependencies);
    await mkdir(dependencies);
    await writeFile(path.join(dependencies, 'partial'), 'interrupted');
  `);
  await recoverDesktopInstall(project);
  assert.equal(await readFile(filename, "utf8"), "before");
  assert.equal((await stat(filename)).mode & 0o777, 0o640);
  assert.equal((await stat(dependencies)).ino, inode);
  assert.equal(await readFile(path.join(dependencies, "module"), "utf8"), "before");
  await noJournal(project);
});

test("repeating recovery after the detached directory was already moved back is safe", async t => {
  const { project, home } = await fixture(t);
  const dependencies = path.join(home, "profiles/desktop/node_modules");
  await mkdir(dependencies, { recursive: true });
  await writeFile(path.join(dependencies, "module"), "before");
  await interrupted(t, project, `
    const dependencies = path.join(project, '.openquantum/dsh/profiles/desktop/node_modules');
    await tx.detachDirectory(dependencies);
  `);
  const journal = JSON.parse(await readFile(journalPath(project), "utf8"));
  await rename(path.join(backupPath(project), journal.entries.at(-1).backup), dependencies);
  await recoverDesktopInstall(project);
  assert.equal(await readFile(path.join(dependencies, "module"), "utf8"), "before");
  await noJournal(project);
});

test("committed journals only clean backups and do not revert a successful install", async t => {
  const { project } = await fixture(t);
  await writeFile(path.join(project, "program"), "before");
  await interrupted(t, project, `
    const target = path.join(project, 'program');
    await tx.capture(target);
    await writeFile(target, 'committed version');
    const filename = path.join(project, '.openquantum/desktop-install-journal.json');
    const journal = JSON.parse(await readFile(filename, 'utf8'));
    journal.status = 'committed';
    await writeFile(filename, JSON.stringify(journal));
  `);
  await recoverDesktopInstall(project);
  assert.equal(await readFile(path.join(project, "program"), "utf8"), "committed version");
  await noJournal(project);
});

test("another install cannot enter while an owner holds the transaction lock", async t => {
  const { project } = await fixture(t);
  await withDesktopInstall(project, async () => {
    await assert.rejects(recoverDesktopInstall(project), /already running/);
    await assert.rejects(withDesktopInstall(project, async () => assert.fail("entered concurrently")), /already running/);
  });
  await recoverDesktopInstall(project);
});

test("parallel recovery contenders cannot remove another live claim or enter together", async t => {
  const { project } = await fixture(t);
  const target = path.join(project, "settings.yaml");
  await writeFile(target, "old");
  await interrupted(t, project, `
    await tx.capture(path.join(project, 'settings.yaml'));
    await writeFile(path.join(project, 'settings.yaml'), 'interrupted');
  `);
  let successes = 0;
  const children = Array.from({ length: 5 }, () => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", `
      import { withDesktopInstall } from ${JSON.stringify(moduleURL)};
      import { open, rm } from 'node:fs/promises';
      import path from 'node:path';
      process.once('message', async () => {
        try {
          await withDesktopInstall(process.argv[1], async () => {
            const marker = path.join(process.argv[1], 'exclusive');
            const handle = await open(marker, 'wx');
            await handle.close();
            process.send('entered');
            await new Promise(resolve => setTimeout(resolve, 80));
            await rm(marker);
          });
          process.exitCode = 0;
        } catch (error) {
          if (!/already running/.test(error.message)) { console.error(error.stack); process.exitCode = 1; }
        }
        process.disconnect();
      });
      process.send('ready');
    `, project], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let stderr = "";
    child.stderr.on("data", bytes => { stderr += bytes; });
    child.on("message", message => { if (message === "entered") successes++; });
    t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
    return { child, ready: once(child, "message"), exited: once(child, "exit"), stderr: () => stderr };
  });
  await Promise.all(children.map(child => child.ready));
  for (const { child } of children) child.send("go");
  for (const child of children) assert.equal((await child.exited)[0], 0, child.stderr());
  assert.ok(successes <= 1);
  await recoverDesktopInstall(project); // Simultaneous claims may all yield; retry is safe.
  assert.equal(await readFile(target, "utf8"), "old");
  await noJournal(project);
});

test("runWriter returns output on success and rolls back on nonzero exit or spawn failure", async t => {
  for (const failure of [null, "exit", "spawn"]) {
    const { project } = await fixture(t);
    const target = path.join(project, "program");
    await writeFile(target, "old");
    const operation = withDesktopInstall(project, async ({ begin }) => {
      const tx = await begin();
      await tx.capture(target);
      await writeFile(target, "new");
      const result = await tx.runWriter(failure === "spawn" ? path.join(project, "absent-executable") : process.execPath, ["-e", failure === "exit" ? "console.error('synthetic failure');process.exit(7)" : "console.log('writer done')"], { cwd: project });
      assert.equal(result.stdout.trim(), "writer done");
    });
    if (failure) await assert.rejects(operation, /writer failed/);
    else await operation;
    assert.equal(await readFile(target, "utf8"), failure ? "old" : "new");
    await noJournal(project);
  }
});

test("recovery refuses a still-live writer and preserves pending snapshots", { skip: process.platform === "win32" }, async t => {
  const { project } = await fixture(t);
  const target = path.join(project, "settings.yaml");
  await writeFile(target, "old");
  await interrupted(t, project, `
    await tx.capture(path.join(project, 'settings.yaml'));
    await writeFile(path.join(project, 'settings.yaml'), 'new');
  `);
  const writer = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], { detached: true, stdio: "ignore" });
  const stopped = once(writer, "exit");
  t.after(() => { if (writer.exitCode === null && writer.signalCode === null) writer.kill("SIGKILL"); });
  const journal = JSON.parse(await readFile(journalPath(project), "utf8"));
  journal.writers = [{ pid: writer.pid, group: true }];
  await writeFile(journalPath(project), JSON.stringify(journal));
  await assert.rejects(recoverDesktopInstall(project), /writer is still running/);
  assert.equal(await readFile(target, "utf8"), "new");
  writer.kill("SIGKILL");
  await stopped;
  await recoverDesktopInstall(project);
  assert.equal(await readFile(target, "utf8"), "old");
});

test("killing the install parent terminates the writer group before recovery", { skip: process.platform === "win32" }, async t => {
  const { project } = await fixture(t);
  const target = path.join(project, "settings.yaml");
  await writeFile(target, "old");
  await interrupted(t, project, `
    await tx.capture(path.join(project, 'settings.yaml'));
    await writeFile(path.join(project, 'settings.yaml'), 'new');
    const writer = tx.runWriter(process.execPath, ['-e', "require('node:fs').writeFileSync(process.argv[1],'started');setInterval(()=>{},1000)", path.join(project, 'writer-started')]);
    for (let n = 0; n < 200; n++) {
      if (await readFile(path.join(project, 'writer-started')).catch(() => null)) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    process.send('ready');
    await writer;
  `);
  let recovered = false;
  for (let attempt = 0; attempt < 200 && !recovered; attempt++) {
    try { await recoverDesktopInstall(project); recovered = true; }
    catch (error) { if (!/writer is still running/.test(error.message)) throw error; await delay(10); }
  }
  assert.equal(recovered, true);
  assert.equal(await readFile(target, "utf8"), "old");
  await noJournal(project);
});
