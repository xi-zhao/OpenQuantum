import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { installDesktopDistribution, sha256 } from "../scripts/lib/desktop-distribution.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-distribution-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const payload = path.join(root, "payload");
  const projectRoot = path.join(root, "user data/project");
  await mkdir(path.join(payload, "node_modules"), { recursive: true });
  async function release(version, contents) {
    const files = {};
    for (const [filename, content] of Object.entries(contents)) {
      await mkdir(path.dirname(path.join(payload, filename)), { recursive: true });
      await writeFile(path.join(payload, filename), content);
      files[filename] = { sha256: sha256(content), mode: 0o644 };
    }
    await writeFile(path.join(payload, "distribution.json"), JSON.stringify({ schemaVersion: 1, version, files }));
  }
  return { root, payload, projectRoot, release, install: () => installDesktopDistribution({ payload, projectRoot }) };
}

test("installs into a path with spaces and can prepare it again without resetting data", async (t) => {
  const f = await fixture(t);
  await f.release("1", { "src/main.mjs": "v1" });
  assert.equal((await f.install()).changedFiles, 1);
  const data = path.join(f.projectRoot, ".openquantum/session.jsonl");
  await writeFile(data, "user session");
  assert.equal((await f.install()).changedFiles, 0);
  assert.equal(await readFile(data, "utf8"), "user session");
  assert.equal(await realpath(path.join(f.projectRoot, "node_modules")), await realpath(path.join(f.payload, "node_modules")));
});

test("updates and removes owned program files while retaining custom Skills and credentials", async (t) => {
  const f = await fixture(t);
  await f.release("1", { "src/main.mjs": "v1", "src/obsolete.mjs": "old" });
  await f.install();
  await mkdir(path.join(f.projectRoot, ".agents/skills/mine"), { recursive: true });
  await writeFile(path.join(f.projectRoot, ".agents/skills/mine/SKILL.md"), "my method");
  await writeFile(path.join(f.projectRoot, ".openquantum/credentials.json"), "test reference only");
  await f.release("2", { "src/main.mjs": "v2" });
  await f.install();
  assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "v2");
  await assert.rejects(readFile(path.join(f.projectRoot, "src/obsolete.mjs")), { code: "ENOENT" });
  assert.equal(await readFile(path.join(f.projectRoot, ".agents/skills/mine/SKILL.md"), "utf8"), "my method");
  assert.equal(await readFile(path.join(f.projectRoot, ".openquantum/credentials.json"), "utf8"), "test reference only");
});

test("retains edited MCP settings and saves new defaults for review", async (t) => {
  const f = await fixture(t);
  const config = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
  await f.release("1", { [config]: "default 1" });
  await f.install();
  await writeFile(path.join(f.projectRoot, config), "custom connection");
  await f.release("2", { [config]: "default 2" });
  assert.deepEqual((await f.install()).preservedFiles, [config]);
  assert.equal(await readFile(path.join(f.projectRoot, config), "utf8"), "custom connection");
  assert.equal(await readFile(path.join(f.projectRoot, ".openquantum/distribution-defaults", sha256("default 2"), config), "utf8"), "default 2");
  assert.equal((await f.install()).changedFiles, 0);
});

test("does not recreate a built-in Skill deleted through settings", async (t) => {
  const f = await fixture(t);
  const skill = ".agents/skills/example/SKILL.md";
  await f.release("1", { [skill]: "method" });
  await f.install();
  await rm(path.join(f.projectRoot, ".agents/skills/example"), { recursive: true });
  assert.equal((await f.install()).changedFiles, 0);
  await assert.rejects(readFile(path.join(f.projectRoot, skill)), { code: "ENOENT" });
});

test("rejects a damaged payload before any upgrade file is changed", async (t) => {
  const f = await fixture(t);
  await f.release("1", { "src/a.mjs": "v1", "src/z.mjs": "v1" });
  await f.install();
  await f.release("2", { "src/a.mjs": "v2", "src/z.mjs": "v2" });
  await writeFile(path.join(f.payload, "src/z.mjs"), "corrupt");
  await assert.rejects(f.install(), /Damaged installation payload/);
  assert.equal(await readFile(path.join(f.projectRoot, "src/a.mjs"), "utf8"), "v1");
});

test("refuses program conflicts without overwriting user edits", async (t) => {
  const f = await fixture(t);
  await f.release("1", { "src/main.mjs": "v1" });
  await f.install();
  await writeFile(path.join(f.projectRoot, "src/main.mjs"), "local edit");
  await f.release("2", { "src/main.mjs": "v2" });
  await assert.rejects(f.install(), /Locally changed program file/);
  assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "local edit");
});

test("can resume after an interrupted update already wrote a subset of the new files", async (t) => {
  const f = await fixture(t);
  await f.release("1", { "src/a.mjs": "v1", "src/b.mjs": "v1" });
  await f.install();
  await f.release("2", { "src/a.mjs": "v2", "src/b.mjs": "v2" });
  await writeFile(path.join(f.projectRoot, "src/a.mjs"), "v2");
  assert.equal((await f.install()).changedFiles, 1);
  assert.equal(JSON.parse(await readFile(path.join(f.projectRoot, ".openquantum/desktop-distribution.json"))).version, "2");
});

test("rejects manifest escapes and writes through directory links", async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.payload, "distribution.json"), JSON.stringify({ schemaVersion: 1, version: "1", files: { "../escape": { sha256: sha256("x"), mode: 0o644 } } }));
  await assert.rejects(f.install(), /Invalid distribution path/);
  await f.release("1", { "src/main.mjs": "v1" });
  await mkdir(f.projectRoot, { recursive: true });
  const outside = path.join(f.root, "outside");
  await mkdir(outside);
  await symlink(outside, path.join(f.projectRoot, "src"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(f.install(), /Refusing to write through a link/);
  await assert.rejects(readFile(path.join(outside, "main.mjs")), { code: "ENOENT" });
});
