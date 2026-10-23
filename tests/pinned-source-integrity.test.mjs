import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { deflateSync } from "node:zlib";
import { appendFile, chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { inspectPinnedSourceDirectory } from "../src/settings/server/pinned-source.mjs";

const exec = promisify(execFile);

async function git(root, ...args) {
  return (await exec("git", args, { cwd: root })).stdout;
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-pinned-integrity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await git(root, "init", "--quiet");
  await writeFile(path.join(root, "server.py"), "# Fixture only: no upstream code is executed.\n");
  await git(root, "add", "server.py");
  await git(root, "-c", "user.name=OpenQuantum Test", "-c", "user.email=test@openquantum.local", "commit", "--quiet", "-m", "fixed source fixture");
  const revision = (await git(root, "rev-parse", "HEAD")).trim();
  const integration = {
    sourceUrl: "https://example.invalid/pinned-source",
    revision,
    relativeRoot: "checkout",
    requiredFiles: ["server.py"],
  };
  await writeFile(path.join(root, ".openquantum-source.json"), JSON.stringify({
    schemaVersion: "1.0", source: integration.sourceUrl, revision,
  }));
  await inspectPinnedSourceDirectory(root, integration);
  return { root, integration, inspect: () => inspectPinnedSourceDirectory(root, integration) };
}

for (const addition of ["untracked", "ignored", "staged"]) {
  test(`pinned source rejects ${addition} import-shadowing source`, async (t) => {
    const f = await fixture(t);
    await writeFile(path.join(f.root, "anyio.py"), "# Added source that could shadow a dependency.\n");
    if (addition === "ignored") await appendFile(path.join(f.root, ".git", "info", "exclude"), "\nanyio.py\n");
    if (addition === "staged") await git(f.root, "add", "anyio.py");
    await assert.rejects(f.inspect, /unreviewed|untracked|unexpected|not pinned/i);
  });
}

test("pinned source rejects an added Python package", async (t) => {
  const f = await fixture(t);
  await mkdir(path.join(f.root, "shadow_package"));
  await writeFile(path.join(f.root, "shadow_package", "__init__.py"), "# Added importable package.\n");
  await assert.rejects(f.inspect, /unreviewed|untracked|unexpected|not pinned/i);
});

for (const file of ["pyproject.toml", "uv.toml", ".python-version"]) {
  test(`pinned source rejects added startup metadata ${file}`, async (t) => {
    const f = await fixture(t);
    await writeFile(path.join(f.root, file), "unreviewed startup metadata\n");
    await assert.rejects(f.inspect, /unreviewed|untracked|unexpected|not pinned/i);
  });
}

test("pinned source rejects an added symlink even with a non-source name", async (t) => {
  const f = await fixture(t);
  await symlink("server.py", path.join(f.root, "notes.txt"));
  await assert.rejects(f.inspect, /symlink|symbolic|unreviewed|untracked|unexpected|not pinned/i);
});

test("pinned source permits normal environment, cache, lock and SQLite outputs", async (t) => {
  const f = await fixture(t);
  for (const file of [
    ".venv/lib/python/site-packages/anyio.py",
    "__pycache__/server.cpython-313.pyc",
    "nested/__pycache__/helper.cpython-313.pyc",
    "devices.db", "devices.db-wal", "devices.db-shm", "uv.lock",
  ]) {
    await mkdir(path.dirname(path.join(f.root, file)), { recursive: true });
    await writeFile(path.join(f.root, file), "normal runtime output\n");
  }
  assert.equal((await f.inspect()).revision, f.integration.revision);
});

test("pinned source rejects a commit object stored under a forged hash", async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, "anyio.py"), "# Added source hidden in a forged commit tree.\n");
  await git(f.root, "add", "anyio.py");
  const tree = (await git(f.root, "write-tree")).trim();
  const commit = await git(f.root, "cat-file", "-p", f.integration.revision);
  const altered = commit.replace(/^tree [a-f0-9]{40}/, `tree ${tree}`);
  const object = Buffer.concat([Buffer.from(`commit ${Buffer.byteLength(altered)}\0`), Buffer.from(altered)]);
  const oid = f.integration.revision;
  const objectPath = path.join(f.root, ".git", "objects", oid.slice(0, 2), oid.slice(2));
  await chmod(objectPath, 0o600);
  await writeFile(objectPath, deflateSync(object));
  assert.equal((await git(f.root, "rev-parse", "HEAD")).trim(), oid);
  await assert.rejects(f.inspect);
});
