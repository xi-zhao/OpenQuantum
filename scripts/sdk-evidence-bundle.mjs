import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gzipSync, gunzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
export const bundlePath = "docs/integrations/evidence/full-sdk-2026-10-12.bundle";
export const reportPaths = ["full-sdk-access-2026-10-12.json", "full-sdk-engineering-2026-10-12.json", "full-sdk-engineering-validation-2026-10-12.json"].map(name => `docs/integrations/evidence/${name}`);
const historicalRevisions = ["5ce3b3ec503c1478bf38a4cf9903dbd1b78a3916"];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const receiptNames = new Set(["execution.json", "headers.json", "driver.json"]);
// These uncommitted intermediate dependency files were overwritten during a
// failed experiment. Retain the original diagnostic and explicitly report the
// missing bytes; never reconstruct them or exempt successful-run references.
const unavailableHistoricalReferences = [
  { path: ".agents/skills/tensorcircuit-differentiable/pyproject.toml", sha256: "443b482f517bd4f375c7d5a6922d49d4678be899de18770af07857fbb5955818" },
  { path: ".agents/skills/tensorcircuit-differentiable/uv.lock", sha256: "f054d0e0e086b96ab8c9f5abda8c5d74ea1d1beadb5504cdcf2f0f58b5e5797b" },
].map(ref => ({
  ...ref,
  referredBy: ".openquantum/sdk-checks/remaining/tensorcircuit-differentiable-ok5Pjx/sdk.json",
  referredBySha256: "5b8cf7838169f3454d2c7189530e20736f4264b69d61b20f580e5b3442e5ffde",
  failedReceiptSha256: "98c6286f2bb27ecd125dd48ba6aad2465ae64d884257939d6a2e8a80abef9da8",
  reason: "Uncommitted intermediate dependency snapshot was not retained; failed attempt only",
}));

function logicalPath(filename, originalRepository) {
  if (filename.startsWith(originalRepository + "/")) filename = filename.slice(originalRepository.length + 1);
  assert.ok(filename && !filename.startsWith("/") && !filename.includes("\\") && !filename.includes(":"), "Unsafe evidence path");
  assert.ok(filename.split("/").every(part => part && part !== "." && part !== ".."), "Unsafe evidence path");
  return filename;
}

function references(value, result = []) {
  if (value && typeof value === "object") {
    if (typeof value.path === "string" && typeof value.sha256 === "string") result.push(value);
    for (const item of Object.values(value)) references(item, result);
  }
  return result;
}

// Archive original bytes. Reports retain their original paths, contents and
// digests; identical large artifacts share one losslessly compressed object.
export async function buildEvidenceBundle({ repository = root } = {}) {
  const destination = path.join(repository, bundlePath);
  const originalRepository = repository.replace(/\/$/, "");
  await fs.mkdir(path.join(destination, "objects"), { recursive: true });
  const files = new Map(), objects = new Set(), reports = [], folders = new Set();
  async function add(filename, expected) {
    const logical = logicalPath(filename, originalRepository);
    let bytes = await fs.readFile(path.join(repository, logical));
    if (expected && sha(bytes) !== expected.sha256) {
      // Old reports may reference earlier source/lock versions. Never substitute
      // current bytes for those historical digests or modify the old report.
      for (const revision of historicalRevisions) {
        const prior = execFileSync("git", ["show", `${revision}:${logical}`], { cwd: repository, maxBuffer: 64 * 1024 * 1024 });
        if (sha(prior) === expected.sha256) { bytes = prior; break; }
      }
    }
    const digest = sha(bytes);
    if (expected) {
      assert.equal(digest, expected.sha256, logical);
      if (expected.bytes !== undefined) assert.equal(bytes.length, expected.bytes, logical);
    }
    const key = `${logical}\0${digest}`;
    if (!files.has(key)) {
      if (!objects.has(digest)) {
        await fs.writeFile(path.join(destination, "objects", `${digest}.gz`), gzipSync(bytes));
        objects.add(digest);
      }
      files.set(key, { path: logical, bytes: bytes.length, sha256: digest });
      if (receiptNames.has(path.posix.basename(logical))) for (const ref of references(JSON.parse(bytes))) await add(ref.path, ref);
    }
    return bytes;
  }
  for (const filename of reportPaths) {
    const bytes = await add(filename), report = JSON.parse(bytes);
    reports.push({ path: filename, sha256: sha(bytes), bytes: bytes.length });
    for (const ref of references(report)) await add(ref.path, ref);
    for (const library of report.libraries ?? []) {
      const directory = library.evidenceDirectory ?? library.observation?.evidenceDirectory;
      if (directory) folders.add(directory);
    }
    for (const attempt of report.attempts ?? []) folders.add(path.posix.dirname(attempt.path));
  }
  // Include diagnostics and failure probes that were written after execution's
  // success manifest, as well as the full files of earlier failed attempts.
  for (const folder of [...folders].sort()) {
    const logical = logicalPath(folder, originalRepository);
    assert.ok(logical.startsWith(".openquantum/sdk-checks/"));
    for (const entry of await fs.readdir(path.join(repository, logical), { withFileTypes: true })) if (entry.isFile()) {
      const filename = `${logical}/${entry.name}`;
      await add(filename);
    }
  }
  const entries = [...files.values()].sort((a, b) => a.path.localeCompare(b.path) || a.sha256.localeCompare(b.sha256));
  const manifest = { schemaVersion: 1, originalRepository, reports, files: entries, unavailableHistoricalReferences, scientificValidation: "not_evaluated" };
  await fs.writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return verifyEvidenceBundle({ repository });
}

export async function verifyEvidenceBundle({ repository = root } = {}) {
  const destination = path.join(repository, bundlePath);
  const manifest = JSON.parse(await fs.readFile(path.join(destination, "manifest.json")));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.scientificValidation, "not_evaluated");
  assert.deepEqual(manifest.unavailableHistoricalReferences, unavailableHistoricalReferences);
  assert.deepEqual(manifest.reports.map(entry => entry.path), reportPaths);
  const index = new Map(), objects = new Map();
  for (const record of manifest.files) {
    const filename = logicalPath(record.path, manifest.originalRepository);
    assert.match(record.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(record.bytes) && record.bytes >= 0 && record.bytes <= 64 * 1024 * 1024, "Invalid evidence length");
    const key = `${filename}\0${record.sha256}`;
    assert.ok(!index.has(key), "Duplicate evidence record");
    if (!objects.has(record.sha256)) {
      const compressed = await fs.readFile(path.join(destination, "objects", `${record.sha256}.gz`));
      const bytes = gunzipSync(compressed, { maxOutputLength: Math.max(1, record.bytes) });
      assert.equal(sha(bytes), record.sha256, filename);
      objects.set(record.sha256, bytes);
    }
    assert.equal(objects.get(record.sha256).length, record.bytes, filename);
    index.set(key, record);
  }
  const storedObjects = await fs.readdir(path.join(destination, "objects"), { withFileTypes: true });
  assert.deepEqual(storedObjects.map(entry => entry.name).sort(), [...objects.keys()].map(digest => `${digest}.gz`).sort(), "Unlisted or missing archived objects");
  assert.ok(storedObjects.every(entry => entry.isFile()), "Archived objects must be regular files");
  const read = record => {
    const filename = logicalPath(record.path, manifest.originalRepository);
    const entry = index.get(`${filename}\0${record.sha256}`);
    assert.ok(entry, `Missing archived reference: ${filename}`);
    if (record.bytes !== undefined) assert.equal(entry.bytes, record.bytes, filename);
    return objects.get(entry.sha256);
  };
  const reports = [];
  for (const entry of manifest.reports) {
    const bytes = await fs.readFile(path.join(repository, entry.path));
    assert.equal(sha(bytes), entry.sha256, entry.path);
    assert.deepEqual(read(entry), bytes);
    const report = JSON.parse(bytes);
    for (const ref of references(report)) read(ref);
    reports.push(report);
  }
  // Also follow references inside original execution receipts, including their
  // absolute historical paths; no original workspace or SDK is needed.
  for (const entry of manifest.files.filter(entry => receiptNames.has(path.posix.basename(entry.path)))) {
    for (const ref of references(JSON.parse(read(entry)))) read(ref);
  }
  const missingHistoricalReferences = [];
  const successfulDirectories = new Set(reports.flatMap(report => (report.libraries ?? []).map(entry => entry.evidenceDirectory ?? entry.observation?.evidenceDirectory).filter(Boolean)));
  for (const entry of manifest.files.filter(entry => path.posix.basename(entry.path) === "sdk.json")) {
    for (const ref of references(JSON.parse(read(entry)))) {
      const filename = logicalPath(ref.path, manifest.originalRepository);
      if (index.has(`${filename}\0${ref.sha256}`)) { read(ref); continue; }
      const gap = unavailableHistoricalReferences.find(gap => gap.referredBy === entry.path && gap.path === filename && gap.sha256 === ref.sha256);
      assert.ok(gap, `Missing archived SDK reference: ${filename}`);
      assert.equal(entry.sha256, gap.referredBySha256);
      assert.ok(!successfulDirectories.has(path.posix.dirname(entry.path)), "Successful run metadata cannot have unavailable references");
      const receiptPath = `${path.posix.dirname(entry.path)}/verification.json`;
      const receipts = manifest.files.filter(record => record.path === receiptPath);
      assert.equal(receipts.length, 1);
      assert.equal(receipts[0].sha256, gap.failedReceiptSha256);
      assert.equal(JSON.parse(read(receipts[0])).status, "failed", "Only explicitly recorded failed attempts may have unavailable historical metadata");
      missingHistoricalReferences.push(gap);
    }
  }
  assert.deepEqual(missingHistoricalReferences, unavailableHistoricalReferences);
  const [prior, current] = reports;
  assert.equal(prior.libraries.filter(entry => entry.executionVerified === "passed_scoped_engineering").length, 13);
  assert.deepEqual(current.summary, { expected: 72, passed: 72, unresolved: [] });
  assert.equal(new Set(current.libraries.map(entry => entry.id)).size, 72);
  for (const entry of current.libraries) {
    const receipt = JSON.parse(read(entry.verification));
    const execution = JSON.parse(read(entry.execution));
    assert.equal(entry.status, "passed_scoped_engineering");
    assert.equal(receipt.id, entry.id);
    assert.equal(receipt.status, "passed");
    assert.equal(receipt.executionRecordSha256, entry.execution.sha256);
    assert.equal(receipt.dependencyLockSha256, entry.lock.sha256);
    assert.equal(execution.executionStatus, "completed");
    assert.equal(execution.scientificValidation, "not_evaluated");
  }
  return { reports: reports.length, firstBatch: 13, remaining: 72, files: index.size, objects: objects.size, unavailableHistoricalReferences: missingHistoricalReferences, scientificValidation: "not_evaluated" };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, filename, digest] = process.argv.slice(2);
  if (action === "build" && !filename) console.log(JSON.stringify(await buildEvidenceBundle()));
  else if (action === "verify" && !filename) console.log(JSON.stringify(await verifyEvidenceBundle()));
  else if (action === "read" && filename) {
    await verifyEvidenceBundle();
    const manifest = JSON.parse(await fs.readFile(path.join(root, bundlePath, "manifest.json")));
    const entries = manifest.files.filter(entry => entry.path === filename && (!digest || entry.sha256 === digest));
    assert.equal(entries.length, 1, "Expected one file; provide its SHA-256 when the path has historical versions");
    process.stdout.write(gunzipSync(await fs.readFile(path.join(root, bundlePath, "objects", `${entries[0].sha256}.gz`))));
  } else throw new Error("Usage: node scripts/sdk-evidence-bundle.mjs build|verify|read <original-relative-path> [sha256]");
}
