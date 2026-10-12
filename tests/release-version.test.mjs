import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkReleaseVersions, setReleaseVersion } from "../scripts/lib/release-version.mjs";
import { buildPlugin } from "../scripts/build-codex-plugin.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oq-release-version-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = [];
  for (const directory of ["", "distributions/codex-plugin", "distributions/codex-installer"]) {
    await fs.mkdir(path.join(root, directory), { recursive: true });
    for (const filename of ["package.json", "package-lock.json"]) {
      const value = { name: directory || "openquantum", version: "1.2.3", dependencies: { unchanged: "1.2.3" } };
      if (filename === "package-lock.json") Object.assign(value, { lockfileVersion: 3, packages: {
        "": { name: value.name, version: value.version, dependencies: value.dependencies },
        "node_modules/unchanged": { version: "1.2.3", integrity: "unchanged-integrity" },
      } });
      const file = path.join(root, directory, filename);
      await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
      files.push(file);
    }
  }
  return { root, files, snapshot: () => Promise.all(files.map(file => fs.readFile(file, "utf8"))) };
}

test("all shipped product packages match the canonical root version", async () => {
  const version = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8")).version;
  assert.equal(await checkReleaseVersions(), version);
});

test("one version update changes all product copies and preserves dependency metadata", async t => {
  const f = await fixture(t);
  const before = (await f.snapshot()).map(JSON.parse);
  assert.equal(await setReleaseVersion("1.3.0", f.root), "1.3.0");
  const after = (await f.snapshot()).map(JSON.parse);
  for (let i = 0; i < after.length; i++) {
    const expected = structuredClone(before[i]);
    expected.version = "1.3.0";
    if (expected.packages) expected.packages[""].version = "1.3.0";
    assert.deepEqual(after[i], expected);
  }
  assert.equal(await checkReleaseVersions(f.root), "1.3.0");
  assert.equal(await setReleaseVersion("1.3.0", f.root), "1.3.0");
});

test("version checks reject drift in either manifests or either lockfile version field", async t => {
  for (const [index, nested] of [[2, false], [4, false], [1, false], [3, true], [5, true]]) {
    const f = await fixture(t);
    const value = JSON.parse(await fs.readFile(f.files[index], "utf8"));
    (nested ? value.packages[""] : value).version = "1.2.4";
    await fs.writeFile(f.files[index], JSON.stringify(value));
    const before = await f.snapshot();
    await assert.rejects(checkReleaseVersions(f.root), /Release version mismatch/);
    assert.deepEqual(await f.snapshot(), before);
  }
});

test("invalid versions, downgrades and malformed lockfiles fail before any writes", async t => {
  const f = await fixture(t);
  let before = await f.snapshot();
  for (const version of ["v1.3.0", "1.03.0", "1.1.0", "1.3.0-01"]) {
    await assert.rejects(setReleaseVersion(version, f.root));
    assert.deepEqual(await f.snapshot(), before);
  }
  const broken = JSON.parse(before[5]);
  delete broken.packages[""];
  await fs.writeFile(f.files[5], JSON.stringify(broken));
  before = await f.snapshot();
  await assert.rejects(setReleaseVersion("1.3.0", f.root), /Missing root package version/);
  assert.deepEqual(await f.snapshot(), before);
});

test("version updates refuse to downgrade a distribution or a lockfile root copy", async t => {
  for (const [index, nested] of [[2, false], [5, true]]) {
    const f = await fixture(t);
    const value = JSON.parse(await fs.readFile(f.files[index], "utf8"));
    (nested ? value.packages[""] : value).version = "2.0.0";
    await fs.writeFile(f.files[index], JSON.stringify(value));
    const before = await f.snapshot();
    await assert.rejects(setReleaseVersion("1.3.0", f.root), /Refusing to lower/);
    assert.deepEqual(await f.snapshot(), before);
  }
});

test("plugin packaging rejects mismatched product versions before replacing existing output", async t => {
  const f = await fixture(t);
  const manifest = JSON.parse(await fs.readFile(f.files[2], "utf8"));
  manifest.version = "1.2.4";
  await fs.writeFile(f.files[2], JSON.stringify(manifest));
  const output = path.join(f.root, "dist/codex-plugin");
  const sentinel = path.join(output, "openquantum", "keep.txt");
  await fs.mkdir(path.dirname(sentinel), { recursive: true });
  await fs.writeFile(sentinel, "existing build");
  await assert.rejects(buildPlugin({ root: f.root, output }), /Release version mismatch/);
  assert.equal(await fs.readFile(sentinel, "utf8"), "existing build");
});
