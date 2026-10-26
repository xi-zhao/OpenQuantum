import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readSdkLibraries } from "../src/lib/sdk-access.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const reportPath = "docs/integrations/evidence/sdk-ecosystem-2026-10-14.json";
function contained(relative) {
  const file = path.resolve(root, relative);
  assert.ok(file.startsWith(root + path.sep), `Evidence path escapes repository: ${relative}`);
  return file;
}

test("native SDK scoped API receipts are durable, match current locks and retain the science boundary", async () => {
  const report = JSON.parse(await fs.readFile(path.join(root, reportPath)));
  const chromobius = JSON.parse(await fs.readFile(path.join(root, "docs/integrations/evidence/chromobius-2026-10-26.json")));
  const receipts = [...report.libraries, chromobius.receipt];
  const cohort = (await readSdkLibraries(root)).filter(entry => entry.nativeOnly);
  const tracked = new Set(execFileSync("git", ["ls-files", "-z", "--", "docs/integrations/evidence"], { cwd: root, encoding: "utf8" }).split("\0"));
  assert.deepEqual(receipts.map(entry => entry.id).sort(), cohort.map(entry => entry.id).sort());
  assert.equal(report.summary.passed, 26);
  assert.equal(report.summary.scientificValidation, "not_evaluated");
  for (const entry of receipts) {
    assert.equal(entry.status, "passed_scoped_engineering", entry.id);
    assert.equal(entry.scientificValidation, "not_evaluated", entry.id);
    assert.equal(hash(await fs.readFile(contained(entry.sourcePath))), entry.sourceSha256, entry.id);
    assert.equal(hash(await fs.readFile(contained(entry.dependencyLockPath))), entry.dependencyLockSha256, entry.id);
    const directory = contained(entry.durableEvidenceDirectory);
    const bytes = await fs.readFile(path.join(directory, "verification.json"));
    assert.equal(hash(bytes), entry.verificationSha256, entry.id);
    const receipt = JSON.parse(bytes);
    assert.equal(receipt.status, "passed", entry.id);
    assert.equal(receipt.sourceSha256, entry.sourceSha256, entry.id);
    assert.equal(receipt.dependencyLockSha256, entry.dependencyLockSha256, entry.id);
    assert.equal(receipt.scientificValidation, "not_evaluated", entry.id);
    assert.deepEqual(receipt.files, entry.artifacts, entry.id);
    for (const [name, digest] of Object.entries(entry.artifacts)) {
      assert.equal(path.basename(name), name);
      const file = path.join(directory, name);
      assert.ok(tracked.has(`${entry.durableEvidenceDirectory}/${name}`), `Unversioned receipt artifact: ${entry.id}/${name}`);
      assert.ok((await fs.lstat(file)).isFile());
      assert.equal(hash(await fs.readFile(file)), digest, `${entry.id}/${name}`);
    }
    if (entry.language === "native") {
      assert.match(entry.nativeExecutableSha256, /^[0-9a-f]{64}$/);
      assert.equal(entry.nativeExecutableSha256, receipt.nativeExecutableSha256);
    }
  }
});

test("migration receipts contain nonzero derivatives, version identities and complete state comparisons", async () => {
  const report = JSON.parse(await fs.readFile(path.join(root, reportPath)));
  const directory = contained(report.tensorcircuitMigration.durableEvidenceDirectory);
  const legacy = JSON.parse(await fs.readFile(path.join(directory, "legacy/result.json")));
  const next = JSON.parse(await fs.readFile(path.join(directory, "ng/result.json")));
  assert.equal(legacy.distribution, "tensorcircuit");
  assert.equal(next.distribution, "tensorcircuit-ng");
  assert.equal(next.version, "1.10.0");
  assert.ok(next.gradients.every(value => Math.abs(value) > 0.1));
  const compare = (a, b) => Array.isArray(a) ? a.forEach((value, index) => compare(value, b[index])) : assert.ok(Math.abs(a - b) < 1e-10);
  for (const key of ["means", "gradients", "amplitudes"]) compare(legacy[key], next[key]);
  assert.equal(next.qiskitConversionVerified, true);
  assert.equal(next.scientificValidation, "not_evaluated");
});
