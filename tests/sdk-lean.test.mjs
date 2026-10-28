import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { prepareLeanSdk } from "../scripts/setup-lean-sdk.mjs";
import { Environments } from "../src/settings/codex/environments.mjs";

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq lean "));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, ".agents/skills/example"), { recursive: true });
  await fs.writeFile(path.join(directory, ".agents/capability-packages.yml"), 'schemaVersion: "1.1"\npackages:\n  - id: example\n    level: L0\n');
  return { directory };
}

test("Lean discovery exposes pinned Lake dependencies without preparing or executing them", async t => {
  const { directory } = await fixture(t);
  const project = path.join(directory, ".agents/skills/example");
  await fs.writeFile(path.join(directory, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [{ id: "example", language: "lean", modules: ["Mathlib", "Physlib"] }] }));
  await fs.writeFile(path.join(project, "lakefile.toml"), 'name = "Example"\n');
  await fs.writeFile(path.join(project, "lean-toolchain"), "leanprover/lean4:v4.35.0\n");
  await fs.writeFile(path.join(project, "lake-manifest.json"), JSON.stringify({ version: "1.3.0", name: "Example", packagesDir: ".lake/packages", packages: [{ name: "mathlib", type: "git", url: "https://github.com/leanprover-community/mathlib4.git", rev: "56a005855ea17e0b0958f73ec801ae140b0a1679" }] }));
  const destination = path.join(directory, "separate lean environments");
  const sdk = await describeSdk(directory, "example", { environment: { OPENQUANTUM_LEAN_ENV_ROOT: destination, SECRET_FIXTURE: "never-export" } });
  assert.equal(sdk.environmentState, "not_prepared");
  assert.equal(sdk.run, null);
  assert.equal(sdk.leanProject.directory, path.join(destination, "example"));
  assert.equal(sdk.toolchain.value, "leanprover/lean4:v4.35.0");
  assert.equal(sdk.lockedPackages.find(p => p.name === "mathlib").version, "56a005855ea17e0b0958f73ec801ae140b0a1679");
  assert.equal(sdk.setup.effect, "workspace-write-and-download");
  assert.doesNotMatch(JSON.stringify(sdk), /never-export/);
  await assert.rejects(fs.access(destination), { code: "ENOENT" });

  const catalogPath = path.join(directory, ".agents/sdk-libraries.json");
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  catalog.libraries[0].leanCacheModules = ["--unsafe"];
  await fs.writeFile(catalogPath, JSON.stringify(catalog));
  await assert.rejects(describeSdk(directory, "example", { environment: {} }), /Lean cache modules/);
  delete catalog.libraries[0].leanCacheModules;
  await fs.writeFile(catalogPath, JSON.stringify(catalog));

  const lockPath = path.join(project, "lake-manifest.json");
  const lock = JSON.parse(await fs.readFile(lockPath, "utf8"));
  lock.packages[0].rev = "master";
  await fs.writeFile(lockPath, JSON.stringify(lock));
  await assert.rejects(describeSdk(directory, "example", { environment: {} }), /fixed Lean/);
});

test("Lean readiness fails closed for corrupted receipts and changed prepared inputs", async t => {
  const { directory } = await fixture(t);
  const source = path.join(directory, ".agents/skills/example");
  const prepared = path.join(directory, ".openquantum/sdk-lean/example");
  await fs.mkdir(prepared, { recursive: true });
  await fs.writeFile(path.join(directory, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [{ id: "example", language: "lean", modules: ["Mathlib"] }] }));
  const texts = { "lakefile.toml": 'name = "Example"\n', "lean-toolchain": "leanprover/lean4:v4.35.0\n", "OpenQuantumProofs.lean": "example : 1 = 1 := rfl\n",
    "lake-manifest.json": JSON.stringify({ version: "1.3.0", packagesDir: ".lake/packages", packages: [{ name: "mathlib", type: "git", url: "https://github.com/leanprover-community/mathlib4.git", rev: "56a005855ea17e0b0958f73ec801ae140b0a1679" }] }) };
  for (const [name, bytes] of Object.entries(texts)) {
    await fs.writeFile(path.join(source, name), bytes);
    await fs.writeFile(path.join(prepared, name), bytes);
  }
  const marker = path.join(prepared, "openquantum-lean.json");
  await fs.writeFile(marker, "null");
  assert.equal((await describeSdk(directory, "example", { environment: {} })).environmentState, "stale");
  const hash = value => createHash("sha256").update(value).digest("hex");
  const lean = path.join(directory, "lean");
  await fs.writeFile(lean, "not executed by discovery", { mode: 0o755 });
  await fs.mkdir(path.join(prepared, ".lake/build/lib/lean"), { recursive: true });
  await fs.writeFile(path.join(prepared, ".lake/build/lib/lean/OpenQuantumProofs.olean"), "receipt fixture");
  const record = { schemaVersion: 1, platform: process.platform, arch: process.arch, files: Object.fromEntries(Object.entries(texts).map(([name, text]) => [name, hash(text)])), lean,
    leanSha256: hash("not executed by discovery"), leanPath: path.join(prepared, ".lake/build/lib/lean"), proofSha256: hash("receipt fixture") };
  await fs.writeFile(marker, JSON.stringify(record));
  const ready = await describeSdk(directory, "example", { environment: { SECRET_FIXTURE: "hidden" } });
  assert.equal(ready.environmentState, "prepared");
  assert.equal(ready.run.command, lean);
  assert.deepEqual(ready.run.environment, { LEAN_PATH: record.leanPath });
  await fs.appendFile(path.join(prepared, "lake-manifest.json"), "\n");
  assert.equal((await describeSdk(directory, "example", { environment: {} })).environmentState, "stale");
  await fs.writeFile(path.join(prepared, "lake-manifest.json"), texts["lake-manifest.json"]);
  await fs.appendFile(lean, " changed");
  assert.equal((await describeSdk(directory, "example", { environment: {} })).run, null);
});

test("Lean preparation requires an explicit toolchain and preserves existing project files", async t => {
  const { directory } = await fixture(t);
  const project = path.join(directory, ".agents/skills/example");
  await fs.writeFile(path.join(directory, ".agents/sdk-libraries.json"), JSON.stringify({ schemaVersion: 1, libraries: [{ id: "example", language: "lean", modules: ["Mathlib"] }] }));
  await fs.writeFile(path.join(project, "lakefile.toml"), 'name = "Example"\n');
  await fs.writeFile(path.join(project, "lean-toolchain"), "leanprover/lean4:v4.35.0\n");
  await fs.writeFile(path.join(project, "OpenQuantumProofs.lean"), "example : 1 = 1 := rfl\n");
  await fs.writeFile(path.join(project, "lake-manifest.json"), JSON.stringify({ version: "1.3.0", name: "Example", packagesDir: ".lake/packages", packages: [{ name: "mathlib", type: "git", url: "https://github.com/leanprover-community/mathlib4.git", rev: "56a005855ea17e0b0958f73ec801ae140b0a1679" }] }));
  await assert.rejects(prepareLeanSdk(directory, "example", {}), /OPENQUANTUM_LEAN_BIN/);
  const destination = path.join(directory, "environments/example");
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, "lakefile.toml"), "user work\n");
  await assert.rejects(prepareLeanSdk(directory, "example", { OPENQUANTUM_LEAN_ENV_ROOT: path.dirname(destination), OPENQUANTUM_LEAN_BIN: path.join(directory, "missing-lean") }), /preserve/i);
  assert.equal(await fs.readFile(path.join(destination, "lakefile.toml"), "utf8"), "user work\n");
  const fresh = path.join(directory, "fresh");
  await assert.rejects(prepareLeanSdk(directory, "example", { OPENQUANTUM_LEAN_ENV_ROOT: fresh, OPENQUANTUM_LEAN_BIN: process.execPath }), /toolchain mismatch/);
  await assert.rejects(fs.access(fresh), { code: "ENOENT" });

  const manager = new Environments({ root: directory, directory: path.join(directory, "settings"), environment: { OPENQUANTUM_LEAN_ENV_ROOT: fresh, OPENQUANTUM_LEAN_BIN: process.execPath, SECRET_FIXTURE: "hidden" } });
  assert.equal(manager.environment.OPENQUANTUM_LEAN_BIN, process.execPath);
  assert.equal(manager.environment.OPENQUANTUM_LEAN_ENV_ROOT, fresh);
  assert.equal(manager.environment.SECRET_FIXTURE, undefined);
  assert.equal((await manager.status("example")).installation, "missing");
  const before = await manager.fingerprint("example");
  await fs.appendFile(path.join(project, "OpenQuantumProofs.lean"), "-- changed contract\n");
  assert.notEqual(await manager.fingerprint("example"), before);
});
