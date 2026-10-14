import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { prepareSdkSource } from "../src/lib/sdk-source.mjs";
import { verifySdkSourceSnapshot } from "../src/lib/sdk-source-record.mjs";

test("source preparation preserves changes and records internal generated-header links", async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "oq source with spaces "));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const directory = path.join(parent, "checkout");
  await fs.mkdir(directory);
  const git = args => execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git(["init"]);
  const repository = "https://github.com/fixture/native-source.git";
  git(["remote", "add", "origin", repository]);
  await fs.writeFile(path.join(directory, "source.cpp"), "int main() { return 0; }\n");
  await fs.writeFile(path.join(directory, ".gitignore"), "ignored.cpp\n");
  await fs.symlink("generated.hpp", path.join(directory, "header.hpp"));
  git(["add", "source.cpp", "header.hpp", ".gitignore"]);
  git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture"]);
  const revision = git(["rev-parse", "HEAD"]);
  const record = await prepareSdkSource(directory, { repository, revision });
  assert.deepEqual(record.symlinks, { "header.hpp": "generated.hpp" });
  assert.match(record.files["source.cpp"], /^[0-9a-f]{64}$/);
  const marker = await fs.readFile(path.join(directory, "openquantum-source.json"));
  assert.equal(await verifySdkSourceSnapshot(directory, record), true);
  for (const name of ["injected.cpp", "ignored.cpp"]) {
    await fs.writeFile(path.join(directory, name), "// could enter a CMake glob\n");
    await assert.rejects(prepareSdkSource(directory, { repository, revision }), /Unrecorded/);
    assert.equal(await verifySdkSourceSnapshot(directory, record), false);
    assert.equal(await fs.readFile(path.join(directory, name), "utf8"), "// could enter a CMake glob\n");
    assert.deepEqual(await fs.readFile(path.join(directory, "openquantum-source.json")), marker);
    await fs.rm(path.join(directory, name)); // Only this test's own temporary input.
  }
  await fs.appendFile(path.join(directory, "source.cpp"), "// user work\n");
  await assert.rejects(prepareSdkSource(directory, { repository, revision }), /Modified SDK source/);
  assert.match(await fs.readFile(path.join(directory, "source.cpp"), "utf8"), /user work/);
  assert.deepEqual(await fs.readFile(path.join(directory, "openquantum-source.json")), marker);
  await assert.rejects(prepareSdkSource(directory, { repository, revision: "b".repeat(40) }), /Unexpected SDK source/);
});

test("a pinned initialized submodule cannot silently contribute an untracked header", async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "oq submodule fixture "));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const directory = path.join(parent, "checkout"), child = path.join(parent, "module");
  const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const commit = cwd => git(cwd, ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgSign=false", "commit", "-m", "fixture"]);
  for (const cwd of [directory, child]) { await fs.mkdir(cwd); git(cwd, ["init"]); }
  await fs.writeFile(path.join(child, "module.cpp"), "// reviewed module\n");
  git(child, ["add", "module.cpp"]); commit(child);
  git(directory, ["-c", "protocol.file.allow=always", "submodule", "add", child, "deps/module"]);
  commit(directory);
  const repository = "https://github.com/fixture/native-source.git", revision = git(directory, ["rev-parse", "HEAD"]);
  git(directory, ["remote", "add", "origin", repository]);
  const record = await prepareSdkSource(directory, { repository, revision });
  assert.deepEqual(record.submodulePaths, ["deps/module"]);
  assert.equal(await verifySdkSourceSnapshot(directory, record), true);
  const extra = path.join(directory, "deps/module/unreviewed.hpp");
  await fs.writeFile(extra, "// new header\n");
  await assert.rejects(prepareSdkSource(directory, { repository, revision }), /Unrecorded/);
  assert.equal(await verifySdkSourceSnapshot(directory, record), false);
  assert.equal(await fs.readFile(extra, "utf8"), "// new header\n");
});

test("source setup rejects unreviewed refs and source URLs before creating a checkout", async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "oq invalid source "));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const directory = path.join(parent, "missing");
  await assert.rejects(prepareSdkSource(directory, { repository: "https://github.com/fixture/source.git", revision: "main" }), /full commit/);
  await assert.rejects(prepareSdkSource(directory, { repository: "file:///outside", revision: "a".repeat(40) }), /HTTPS repository/);
  await assert.rejects(fs.access(directory), { code: "ENOENT" });
});
