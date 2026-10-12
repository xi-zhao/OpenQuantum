import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { gunzipSync } from "node:zlib";
import { bundlePath, reportPaths, verifyEvidenceBundle } from "../scripts/sdk-evidence-bundle.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);

async function freshRepository(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-durable-evidence-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, "docs/integrations/evidence"), { recursive: true });
  await fs.cp(path.join(root, bundlePath), path.join(directory, bundlePath), { recursive: true });
  for (const report of reportPaths) await fs.copyFile(path.join(root, report), path.join(directory, report));
  return directory;
}

test("committed SDK evidence verifies in a fresh directory without the original workspace or dependencies", async t => {
  const repository = await freshRepository(t);
  await fs.mkdir(path.join(repository, "scripts"));
  await fs.copyFile(path.join(root, "scripts/sdk-evidence-bundle.mjs"), path.join(repository, "scripts/sdk-evidence-bundle.mjs"));
  for (const missing of [".git", ".openquantum", "node_modules"]) await assert.rejects(fs.stat(path.join(repository, missing)), { code: "ENOENT" });
  const result = await run(process.execPath, ["scripts/sdk-evidence-bundle.mjs", "verify"], { cwd: repository, env: {}, timeout: 30000 });
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.firstBatch, 13);
  assert.equal(summary.remaining, 72);
  assert.equal(summary.unavailableHistoricalReferences.length, 2);
  assert.equal(summary.scientificValidation, "not_evaluated");
  const manifest = JSON.parse(await fs.readFile(path.join(repository, bundlePath, "manifest.json")));
  assert.equal(manifest.files.filter(entry => entry.path === "src/lib/check_python_install.py").length, 2, "preserve both historical source digests");
  const receipt = manifest.files.find(entry => entry.path.endsWith("/verification.json"));
  const read = await run(process.execPath, ["scripts/sdk-evidence-bundle.mjs", "read", receipt.path, receipt.sha256], { cwd: repository, env: {}, timeout: 30000 });
  assert.ok(JSON.parse(read.stdout).id);
});

test("durable evidence rejects missing objects and truncated gzip without falling back to local originals", async t => {
  const repository = await freshRepository(t);
  const manifest = JSON.parse(await fs.readFile(path.join(repository, bundlePath, "manifest.json")));
  const receipt = manifest.files.find(entry => entry.path.endsWith("/verification.json"));
  const object = path.join(repository, bundlePath, "objects", `${receipt.sha256}.gz`);
  const bytes = await fs.readFile(object);
  // Supply an exact original at its relative path inside this isolated fixture.
  // The negative test must not depend on a maintainer's ignored working files.
  const original = path.join(repository, receipt.path);
  await fs.mkdir(path.dirname(original), { recursive: true });
  await fs.writeFile(original, gunzipSync(bytes));
  assert.ok((await fs.stat(original)).isFile());
  await fs.rm(object);
  await assert.rejects(verifyEvidenceBundle({ repository }), { code: "ENOENT" });
  await fs.writeFile(object, bytes.subarray(0, 12));
  await assert.rejects(verifyEvidenceBundle({ repository }));
});

test("durable evidence rejects omitted report references, changed reports and conflicting mappings", async t => {
  const repository = await freshRepository(t);
  const file = path.join(repository, bundlePath, "manifest.json");
  const bytes = await fs.readFile(file), manifest = JSON.parse(bytes);
  const current = JSON.parse(await fs.readFile(path.join(repository, reportPaths[1])));
  const receipt = current.libraries[0].verification;
  manifest.files = manifest.files.filter(entry => entry.path !== receipt.path || entry.sha256 !== receipt.sha256);
  assert.ok(!manifest.files.some(entry => entry.sha256 === receipt.sha256), "this receipt has its own object");
  const missingObject = path.join(repository, bundlePath, "objects", `${receipt.sha256}.gz`);
  const objectBytes = await fs.readFile(missingObject);
  await fs.rm(missingObject);
  await fs.writeFile(file, JSON.stringify(manifest));
  await assert.rejects(verifyEvidenceBundle({ repository }), /Missing archived reference/);
  await fs.writeFile(file, bytes);
  await fs.writeFile(missingObject, objectBytes);
  const conflict = JSON.parse(bytes);
  conflict.files.push({ ...conflict.files[0], bytes: 1 });
  await fs.writeFile(file, JSON.stringify(conflict));
  await assert.rejects(verifyEvidenceBundle({ repository }), /Duplicate evidence record/);
  await fs.writeFile(file, bytes);
  const hiddenGaps = JSON.parse(bytes);
  hiddenGaps.unavailableHistoricalReferences = [];
  await fs.writeFile(file, JSON.stringify(hiddenGaps));
  await assert.rejects(verifyEvidenceBundle({ repository }));
  await fs.writeFile(file, bytes);
  await fs.appendFile(path.join(repository, reportPaths[1]), " ");
  await assert.rejects(verifyEvidenceBundle({ repository }));
});

test("durable evidence rejects stale or injected objects not listed in the manifest", async t => {
  const repository = await freshRepository(t);
  const directory = path.join(repository, bundlePath, "objects");
  const [object] = await fs.readdir(directory);
  const unlisted = path.join(directory, `${"0".repeat(64)}.gz`);
  await fs.copyFile(path.join(directory, object), unlisted);
  await assert.rejects(verifyEvidenceBundle({ repository }), /Unlisted or missing archived objects/);
  await fs.rm(unlisted);
  await verifyEvidenceBundle({ repository });
});
