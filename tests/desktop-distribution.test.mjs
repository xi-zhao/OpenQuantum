import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readlink, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { desktopPayloadIdentity, installDesktopDistribution, sha256 } from "../scripts/lib/desktop-distribution.mjs";

test("same-version packages keep separate dependencies across native architectures and runtime locks", () => {
  const manifest = { kind: "dsh-capability-package", version: "0.8.1", target: "darwin-arm64", runtimeLockSha256: sha256("runtime 1"), files: {} };
  const arm = { platform: "darwin", arch: "arm64" };
  const intel = { platform: "darwin", arch: "x64" };
  const identity = desktopPayloadIdentity(manifest, arm);
  assert.notEqual(identity, desktopPayloadIdentity({ ...manifest, target: "darwin-x64" }, intel));
  assert.notEqual(identity, desktopPayloadIdentity({ ...manifest, runtimeLockSha256: sha256("runtime 2") }, arm));
  assert.throws(() => desktopPayloadIdentity(manifest, intel), /Incompatible/);
  assert.throws(() => desktopPayloadIdentity({ ...manifest, version: "../escape" }, arm), /invalid/);
});

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
  await f.release("1.0.0", { "src/main.mjs": "v1" });
  assert.equal((await f.install()).changedFiles, 1);
  const data = path.join(f.projectRoot, ".openquantum/session.jsonl");
  await writeFile(data, "user session");
  assert.equal((await f.install()).changedFiles, 0);
  assert.equal(await readFile(data, "utf8"), "user session");
  assert.equal(await realpath(path.join(f.projectRoot, "node_modules")), await realpath(path.join(f.payload, "node_modules")));
});

test("updates and removes owned program files while retaining custom Skills and credentials", async (t) => {
  const f = await fixture(t);
  await f.release("1.0.0", { "src/main.mjs": "v1", "src/obsolete.mjs": "old" });
  await f.install();
  await mkdir(path.join(f.projectRoot, ".agents/skills/mine"), { recursive: true });
  await writeFile(path.join(f.projectRoot, ".agents/skills/mine/SKILL.md"), "my method");
  await writeFile(path.join(f.projectRoot, ".openquantum/credentials.json"), "test reference only");
  await f.release("2.0.0", { "src/main.mjs": "v2" });
  await f.install();
  assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "v2");
  await assert.rejects(readFile(path.join(f.projectRoot, "src/obsolete.mjs")), { code: "ENOENT" });
  assert.equal(await readFile(path.join(f.projectRoot, ".agents/skills/mine/SKILL.md"), "utf8"), "my method");
  assert.equal(await readFile(path.join(f.projectRoot, ".openquantum/credentials.json"), "utf8"), "test reference only");
});

test("retains edited MCP settings and saves new defaults for review", async (t) => {
  const f = await fixture(t);
  const config = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
  await f.release("1.0.0", { [config]: "default 1" });
  await f.install();
  await writeFile(path.join(f.projectRoot, config), "custom connection");
  await f.release("2.0.0", { [config]: "default 2" });
  assert.deepEqual((await f.install()).preservedFiles, [config]);
  assert.equal(await readFile(path.join(f.projectRoot, config), "utf8"), "custom connection");
  assert.equal(await readFile(path.join(f.projectRoot, ".openquantum/distribution-defaults", sha256("default 2"), config), "utf8"), "default 2");
  assert.equal((await f.install()).changedFiles, 0);
});

test("does not recreate a built-in Skill deleted through settings", async (t) => {
  const f = await fixture(t);
  const skill = ".agents/skills/example/SKILL.md";
  await f.release("1.0.0", { [skill]: "method" });
  await f.install();
  await rm(path.join(f.projectRoot, ".agents/skills/example"), { recursive: true });
  assert.equal((await f.install()).changedFiles, 0);
  await assert.rejects(readFile(path.join(f.projectRoot, skill)), { code: "ENOENT" });
});

test("rejects a damaged payload before any upgrade file is changed", async (t) => {
  const f = await fixture(t);
  await f.release("1.0.0", { "src/a.mjs": "v1", "src/z.mjs": "v1" });
  await f.install();
  await f.release("2.0.0", { "src/a.mjs": "v2", "src/z.mjs": "v2" });
  await writeFile(path.join(f.payload, "src/z.mjs"), "corrupt");
  await assert.rejects(f.install(), /Damaged installation payload/);
  assert.equal(await readFile(path.join(f.projectRoot, "src/a.mjs"), "utf8"), "v1");
});

test("refuses program conflicts without overwriting user edits", async (t) => {
  const f = await fixture(t);
  await f.release("1.0.0", { "src/main.mjs": "v1" });
  await f.install();
  await writeFile(path.join(f.projectRoot, "src/main.mjs"), "local edit");
  await f.release("2.0.0", { "src/main.mjs": "v2" });
  await assert.rejects(f.install(), /Locally changed program file/);
  assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "local edit");
});

test("can resume after an interrupted update already wrote a subset of the new files", async (t) => {
  const f = await fixture(t);
  await f.release("1.0.0", { "src/a.mjs": "v1", "src/b.mjs": "v1" });
  await f.install();
  await f.release("2.0.0", { "src/a.mjs": "v2", "src/b.mjs": "v2" });
  await writeFile(path.join(f.projectRoot, "src/a.mjs"), "v2");
  assert.equal((await f.install()).changedFiles, 1);
  assert.equal(JSON.parse(await readFile(path.join(f.projectRoot, ".openquantum/desktop-distribution.json"))).version, "2.0.0");
});

test("rejects manifest escapes and writes through directory links", async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.payload, "distribution.json"), JSON.stringify({ schemaVersion: 1, version: "1.0.0", files: { "../escape": { sha256: sha256("x"), mode: 0o644 } } }));
  await assert.rejects(f.install(), /Invalid distribution path/);
  await f.release("1.0.0", { "src/main.mjs": "v1" });
  await mkdir(f.projectRoot, { recursive: true });
  const outside = path.join(f.root, "outside");
  await mkdir(outside);
  await symlink(outside, path.join(f.projectRoot, "src"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(f.install(), /Refusing to write through a link/);
  await assert.rejects(readFile(path.join(outside, "main.mjs")), { code: "ENOENT" });
});

test("rejects a V5 Home before changing any installed program", async (t) => {
  const f = await fixture(t);
  await f.release("1.0.0", { "src/main.mjs": "old" });
  await f.install();
  const logs = path.join(f.projectRoot, ".openquantum/dsh/sessions/new-session");
  await mkdir(logs, { recursive: true });
  await writeFile(path.join(logs, "log.v5.jsonl"), "newer session format");
  await f.release("2.0.0", { "src/main.mjs": "new" });
  await assert.rejects(f.install(), /V5 sessions/);
  assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "old");
  assert.equal(await readFile(path.join(logs, "log.v5.jsonl"), "utf8"), "newer session format");
});

test("preserves modified provider routes through capability package updates", async (t) => {
  const f = await fixture(t);
  const config = "runtime/openquantum/model-routes.cordis.yml";
  await f.release("1.0.0", { [config]: "provider default" });
  await f.install();
  await writeFile(path.join(f.projectRoot, config), "personal provider reference");
  await f.release("2.0.0", { [config]: "new provider default" });
  await f.install();
  assert.equal(await readFile(path.join(f.projectRoot, config), "utf8"), "personal provider reference");
});

test("rejects older packages before changing programs, dependency links, state or user data", async t => {
  const f = await fixture(t);
  await f.release("0.8.3", { "src/main.mjs": "current program", "src/keep.mjs": "current only" });
  await f.install();
  const references = { ".env": "synthetic credential", ".openquantum/session.jsonl": "saved session", "runtime/openquantum/model-routes.cordis.yml": "custom route" };
  for (const [relative, value] of Object.entries(references)) {
    await mkdir(path.dirname(path.join(f.projectRoot, relative)), { recursive: true });
    await writeFile(path.join(f.projectRoot, relative), value);
  }
  const stateFile = path.join(f.projectRoot, ".openquantum/desktop-distribution.json");
  const state = await readFile(stateFile, "utf8");
  const dependency = await readlink(path.join(f.projectRoot, "node_modules"));
  for (const version of ["0.8.1", "0.8.3-rc.1"]) {
    await f.release(version, { "src/main.mjs": "older program", "src/old-only.mjs": "should not appear" });
    await assert.rejects(f.install(), /Refusing to downgrade OpenQuantum/);
    assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "current program");
    assert.equal(await readFile(path.join(f.projectRoot, "src/keep.mjs"), "utf8"), "current only");
    await assert.rejects(readFile(path.join(f.projectRoot, "src/old-only.mjs")), { code: "ENOENT" });
    assert.equal(await readFile(stateFile, "utf8"), state);
    assert.equal(await readlink(path.join(f.projectRoot, "node_modules")), dependency);
    for (const [relative, value] of Object.entries(references)) assert.equal(await readFile(path.join(f.projectRoot, relative), "utf8"), value);
  }
});

test("allows same-version repair and numeric upgrades, but rejects unorderable manifests", async t => {
  const f = await fixture(t);
  await f.release("0.8.3", { "src/main.mjs": "initial" });
  await f.install();
  await f.release("0.8.3", { "src/main.mjs": "repaired" });
  assert.equal((await f.install()).version, "0.8.3");
  await f.release("0.8.10", { "src/main.mjs": "upgraded" });
  assert.equal((await f.install()).version, "0.8.10");
  for (const version of ["", "unknown", "0.08.3"]) {
    await f.release(version, { "src/main.mjs": "invalid" });
    await assert.rejects(f.install(), /Unsupported Desktop distribution manifest/);
    assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "upgraded");
  }
  await f.release("0.8.11", { "src/main.mjs": "next" });
  const stateFile = path.join(f.projectRoot, ".openquantum/desktop-distribution.json");
  const state = JSON.parse(await readFile(stateFile, "utf8"));
  state.version = "unknown";
  await writeFile(stateFile, JSON.stringify(state));
  await assert.rejects(f.install(), /Unsupported Desktop distribution manifest/);
  assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "upgraded");
});

test("installer rejects a downgrade before staging a version or replacing the launcher", {
  skip: !["darwin-arm64", "darwin-x64", "win32-x64"].includes(`${process.platform}-${process.arch}`),
}, async t => {
  const f = await fixture(t);
  await f.release("0.8.3", { "src/main.mjs": "current" });
  await f.install();
  const dataRoot = path.dirname(f.projectRoot);
  const launcher = path.join(dataRoot, "OpenQuantum DSH.command");
  await writeFile(launcher, "current launcher");
  const stateFile = path.join(f.projectRoot, ".openquantum/desktop-distribution.json");
  const state = await readFile(stateFile, "utf8");
  const packageRoot = path.join(f.root, "older-package");
  for (const relative of ["scripts/lib/desktop-distribution.mjs", "scripts/lib/harness-home-compatibility.mjs", "scripts/lib/desktop-branding.mjs", "src/updates/release.mjs"]) {
    const target = path.join(packageRoot, "openquantum", relative);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(new URL(`../${relative}`, import.meta.url), target);
  }
  await cp(new URL("../desktop/install.mjs", import.meta.url), path.join(packageRoot, "install.mjs"));
  await writeFile(path.join(packageRoot, "openquantum/distribution.json"), JSON.stringify({
    schemaVersion: 1, version: "0.8.1", kind: "dsh-capability-package", target: `${process.platform}-${process.arch}`,
    runtimeLockSha256: sha256("runtime"), files: {},
  }));
  await assert.rejects(promisify(execFile)(process.execPath, [path.join(packageRoot, "install.mjs"), dataRoot]), /Refusing to downgrade OpenQuantum/);
  await assert.rejects(stat(path.join(dataRoot, "versions")), { code: "ENOENT" });
  assert.equal(await readFile(launcher, "utf8"), "current launcher");
  assert.equal(await readFile(stateFile, "utf8"), state);
  assert.equal(await readFile(path.join(f.projectRoot, "src/main.mjs"), "utf8"), "current");
});
