import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { pythonCases, platformSources, verifyEngineeringRecord, collectEngineeringEvidence } from "../scripts/sdk-engineering-evidence.mjs";
import { sdkInventory } from "../src/lib/sdk-access.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

test("remaining engineering fixtures cover all 72 pending environments exactly once", async () => {
  const previous = JSON.parse(await fs.readFile(path.join(root, "docs/integrations/evidence/full-sdk-access-2026-10-12.json")));
  const expected = previous.libraries.filter(entry => entry.executionVerified === "not_checked").map(entry => entry.id).sort();
  const actual = [...pythonCases.map(entry => entry.id), ...Object.keys(platformSources)].sort();
  assert.equal(actual.length, 72);
  assert.equal(new Set(actual).size, actual.length);
  assert.deepEqual(actual, expected);
});

test("a newer interrupted attempt supersedes an old pass even when the old receipt mtime changes", async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "oq-sdk-attempts-"));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const fixture = pythonCases[0], sdk = (await sdkInventory(root)).libraries.find(entry => entry.id === fixture.id);
  const old = path.join(parent, "old"), newer = path.join(parent, "newer");
  await fs.mkdir(old);
  const files = [];
  for (const [name, text] of [["custom program.py", fixture.code], ["api-objects.json", JSON.stringify({ models: [{}], operations: ["constructed"], publicModules: sdk.modules })]]) {
    const filename = path.join(old, name);
    await fs.writeFile(filename, text);
    files.push({ path: filename, bytes: Buffer.byteLength(text), sha256: sha(text) });
  }
  await fs.writeFile(path.join(old, "attempt.json"), JSON.stringify({ id: sdk.id, startedAt: "2020-01-01T00:00:00Z", dependencyLockSha256: sdk.lock.sha256, fixtureSha256: sha(fixture.code) }));
  const execution = JSON.stringify({ executionStatus: "completed", scientificValidation: "not_evaluated", dependencyLockSha256: sdk.lock.sha256, files });
  await fs.writeFile(path.join(old, "execution.json"), execution);
  await fs.writeFile(path.join(old, "verification.json"), JSON.stringify({ id: sdk.id, status: "passed", scientificValidation: "not_evaluated", dependencyLockSha256: sdk.lock.sha256,
    checks: { programCompleted: true, publicModules: true, lockAndScienceBoundary: true, completeArtifact: true, failureDiagnostic: true, partialOutputRetained: true },
    executionRecordSha256: sha(execution), fixtureSha256: sha(fixture.code), networkIsolation: "macOS sandbox-exec deny network*" }));
  assert.equal((await collectEngineeringEvidence(parent)).summary.passed, 1);
  await fs.mkdir(newer);
  await fs.writeFile(path.join(newer, "attempt.json"), JSON.stringify({ id: sdk.id, startedAt: "2020-01-02T00:00:00Z", dependencyLockSha256: sdk.lock.sha256 }));
  await fs.utimes(path.join(old, "verification.json"), new Date("2030-01-01"), new Date("2030-01-01"));
  const report = await collectEngineeringEvidence(parent);
  assert.equal(report.summary.passed, 0);
  assert.equal(report.attempts.find(attempt => attempt.status === "interrupted_or_running").id, sdk.id);
  assert.match(report.libraries.find(entry => entry.id === sdk.id).evidenceDirectory, /newer$/);
  await fs.rm(path.join(newer, "attempt.json"));
  await fs.writeFile(path.join(newer, "sdk.json"), JSON.stringify({ id: sdk.id }));
  assert.equal((await collectEngineeringEvidence(parent)).summary.passed, 0, "legacy partial SDK directories must not be ignored");
});

test("evidence aggregation rejects partial success, changed fixtures and artifact corruption", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-sdk-evidence-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const fixture = pythonCases[0];
  const sdk = { id: fixture.id, title: "test", language: "python", modules: ["test"], lock: { sha256: "locked" } };
  const files = [];
  for (const [name, text] of [["custom program.py", fixture.code], ["api-objects.json", JSON.stringify({ models: [{}], operations: ["constructed"], publicModules: sdk.modules })]]) {
    const filename = path.join(directory, name);
    await fs.writeFile(filename, text);
    files.push({ path: filename, bytes: Buffer.byteLength(text), sha256: sha(text) });
  }
  const execution = JSON.stringify({ executionStatus: "completed", scientificValidation: "not_evaluated", dependencyLockSha256: "locked", files });
  await fs.writeFile(path.join(directory, "execution.json"), execution);
  const receipt = { id: fixture.id, status: "passed", scientificValidation: "not_evaluated", dependencyLockSha256: "locked",
    checks: { programCompleted: true, publicModules: true, lockAndScienceBoundary: true, completeArtifact: true, failureDiagnostic: true, partialOutputRetained: true },
    executionRecordSha256: sha(execution), fixtureSha256: sha(fixture.code), networkIsolation: "macOS sandbox-exec deny network*" };
  const save = () => fs.writeFile(path.join(directory, "verification.json"), JSON.stringify(receipt));
  await save();
  assert.equal((await verifyEngineeringRecord(directory, sdk)).status, "passed_scoped_engineering");
  receipt.checks.failureDiagnostic = false;
  await save();
  await assert.rejects(verifyEngineeringRecord(directory, sdk), /Missing check/);
  receipt.checks.failureDiagnostic = true;
  receipt.fixtureSha256 = "outdated";
  await save();
  await assert.rejects(verifyEngineeringRecord(directory, sdk), /Fixture changed/);
  receipt.fixtureSha256 = sha(fixture.code);
  await save();
  await fs.appendFile(path.join(directory, "api-objects.json"), "corrupt");
  await assert.rejects(verifyEngineeringRecord(directory, sdk));
  await fs.rm(path.join(directory, "verification.json"));
  await assert.rejects(verifyEngineeringRecord(directory, sdk), { code: "ENOENT" });
});
