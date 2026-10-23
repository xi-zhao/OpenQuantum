import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  installQuantumHardwareMcp,
  inspectQuantumHardwareMcp,
  QUANTUM_HARDWARE_MCP_RELATIVE_ROOT,
} from "../scripts/setup-quantum-hardware-mcp.mjs";

const exec = promisify(execFile);

async function git(cwd, ...args) {
  const result = await exec("git", args, { cwd });
  return result.stdout.trim();
}

test("hardware MCP setup publishes one pinned local checkout and is idempotent", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-hardware-setup-"));
  const source = path.join(root, "source");
  const project = path.join(root, "project");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(source);
  await mkdir(project);
  await git(source, "init", "--quiet");
  for (const fileName of ["server.py", "requirements.txt", "mcp_app.py", "turso_db.py"]) {
    await writeFile(path.join(source, fileName), `${fileName}\n`);
  }
  await git(source, "add", "server.py", "requirements.txt", "mcp_app.py", "turso_db.py");
  await git(
    source,
    "-c",
    "user.name=OpenQuantum Test",
    "-c",
    "user.email=test@openquantum.local",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  );
  const revision = await git(source, "rev-parse", "HEAD");

  const installed = await installQuantumHardwareMcp(project, { source, revision });
  assert.equal(installed.status, "installed");
  assert.equal(
    installed.target,
    path.join(project, QUANTUM_HARDWARE_MCP_RELATIVE_ROOT),
  );
  const marker = JSON.parse(
    await readFile(path.join(installed.target, ".openquantum-source.json"), "utf8"),
  );
  assert.deepEqual(marker, { schemaVersion: "1.0", source, revision });

  const ready = await installQuantumHardwareMcp(project, { source, revision });
  assert.equal(ready.status, "ready");
  assert.equal((await inspectQuantumHardwareMcp(project, { source, revision })).revision, revision);
});

test("hardware MCP setup never overwrites an unverified existing checkout", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-hardware-guard-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, QUANTUM_HARDWARE_MCP_RELATIVE_ROOT);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, "server.py"), "unreviewed\n");

  await assert.rejects(
    installQuantumHardwareMcp(root, {
      source: path.join(root, "unused-source"),
      revision: "1".repeat(40),
    }),
    /is not the pinned installation/,
  );
  assert.equal(await readFile(path.join(target, "server.py"), "utf8"), "unreviewed\n");
});

async function installedFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-source-integrity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const project = path.join(root, "project");
  await mkdir(source);
  await mkdir(project);
  await git(source, "init", "--quiet");
  for (const file of ["server.py", "requirements.txt", "mcp_app.py", "turso_db.py"]) {
    await mkdir(path.dirname(path.join(source, file)), { recursive: true });
    await writeFile(path.join(source, file), `${file}\n`);
  }
  await git(source, "add", ".");
  await git(source, "-c", "user.name=OpenQuantum Test", "-c", "user.email=test@openquantum.local", "commit", "--quiet", "-m", "reviewed fixture");
  const revision = await git(source, "rev-parse", "HEAD");
  const installed = await installQuantumHardwareMcp(project, { source, revision });
  return { project, source, revision, target: installed.target };
}

for (const file of ["server.py", "requirements.txt"]) {
  test("hardware MCP rejects altered " + file + " without overwriting it", async (t) => {
    const f = await installedFixture(t);
    const targetFile = path.join(f.target, file);
    const changed = (await readFile(targetFile, "utf8")) + "# unreviewed local change\n";
    await writeFile(targetFile, changed);
    const markerPath = path.join(f.target, ".openquantum-source.json");
    const marker = await readFile(markerPath, "utf8");
    await assert.rejects(inspectQuantumHardwareMcp(f.project, f));
    for (const flag of ["assume-unchanged", "skip-worktree"]) {
      await git(f.target, "update-index", `--${flag}`, file);
      await assert.rejects(inspectQuantumHardwareMcp(f.project, f), `${flag} cannot attest changed source bytes`);
      await git(f.target, "update-index", `--no-${flag}`, file);
    }
    await git(f.target, "add", file);
    await assert.rejects(inspectQuantumHardwareMcp(f.project, f), "staging the alteration does not restore a pinned checkout");
    await assert.rejects(installQuantumHardwareMcp(f.project, { ...f, runGit: () => assert.fail("rejected installations must not fetch") }), /not the pinned installation/);
    assert.equal(await readFile(targetFile, "utf8"), changed);
    assert.equal(await readFile(markerPath, "utf8"), marker);
  });
}

test("hardware MCP rejects a clean checkout at another HEAD despite its old marker", async (t) => {
  const f = await installedFixture(t);
  const file = path.join(f.target, "requirements.txt");
  await writeFile(file, "# different committed version\n");
  await git(f.target, "add", "requirements.txt");
  await git(f.target, "-c", "user.name=OpenQuantum Test", "-c", "user.email=test@openquantum.local", "commit", "--quiet", "-m", "unreviewed revision");
  const changedHead = await git(f.target, "rev-parse", "HEAD");
  assert.notEqual(changedHead, f.revision);
  await assert.rejects(inspectQuantumHardwareMcp(f.project, f));
  await assert.rejects(installQuantumHardwareMcp(f.project, { ...f, runGit: () => assert.fail("rejected installations must not fetch") }), /not the pinned installation/);
  assert.equal(await git(f.target, "rev-parse", "HEAD"), changedHead);
  assert.equal(await readFile(file, "utf8"), "# different committed version\n");
});

test("hardware MCP rejects a forged source marker without a Git checkout", async (t) => {
  const f = await installedFixture(t);
  await rm(path.join(f.target, ".git"), { recursive: true, force: true });
  const sourceBefore = await readFile(path.join(f.target, "server.py"), "utf8");
  await assert.rejects(inspectQuantumHardwareMcp(f.project, f));
  await assert.rejects(installQuantumHardwareMcp(f.project, { ...f, runGit: () => assert.fail("forged installations must not fetch") }), /not the pinned installation/);
  assert.equal(await readFile(path.join(f.target, "server.py"), "utf8"), sourceBefore);
});
