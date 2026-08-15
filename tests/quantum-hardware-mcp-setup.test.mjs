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
  for (const fileName of ["server.py", "requirements.txt", "mcp_app.py"]) {
    await writeFile(path.join(source, fileName), `${fileName}\n`);
  }
  await git(source, "add", "server.py", "requirements.txt", "mcp_app.py");
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
