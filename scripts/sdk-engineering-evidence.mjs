import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { sdkInventory } from "../src/lib/sdk-access.mjs";
import { circuitSdkCases } from "../tests/fixtures/sdk-native-circuits.mjs";
import { physicsSdkCases } from "../tests/fixtures/sdk-native-physics.mjs";
import { serviceSdkCases } from "../tests/fixtures/sdk-native-services.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
export const pythonCases = [...circuitSdkCases, ...physicsSdkCases, ...serviceSdkCases];
export const platformSources = { "qdmi-device": "tests/fixtures/sdk-native-qdmi.c", "randomized-measurements": "tests/fixtures/sdk-native-randommeas.jl" };

export async function verifyEngineeringRecord(directory, sdk, { repository = root } = {}) {
  const verificationBytes = await fs.readFile(path.join(directory, "verification.json"));
  const verification = JSON.parse(verificationBytes);
  const attempt = await fs.readFile(path.join(directory, "attempt.json"), "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (attempt) {
    assert.equal(attempt.id, sdk.id);
    assert.equal(attempt.dependencyLockSha256, sdk.lock.sha256);
  }
  assert.equal(verification.id, sdk.id);
  assert.equal(verification.status, "passed");
  assert.equal(verification.scientificValidation, "not_evaluated");
  assert.equal(verification.dependencyLockSha256, sdk.lock.sha256);
  assert.match(verification.networkIsolation, /sandbox-exec deny network\*/);
  const required = sdk.language === "python"
    ? ["programCompleted", "publicModules", "lockAndScienceBoundary", "completeArtifact", "failureDiagnostic", "partialOutputRetained"]
    : ["lockedRuntime", "programAndArtifacts", ...(sdk.language === "julia" ? ["failureDiagnosticAndPartialFile"] : [])];
  for (const check of required) assert.equal(verification.checks[check], true, `Missing check: ${check}`);
  const executionBytes = await fs.readFile(path.join(directory, "execution.json"));
  assert.equal(sha(executionBytes), verification.executionRecordSha256);
  const execution = JSON.parse(executionBytes);
  assert.equal(execution.executionStatus, "completed");
  assert.equal(execution.scientificValidation, "not_evaluated");
  assert.equal(execution.dependencyLockSha256, sdk.lock.sha256);
  const files = [];
  for (const record of execution.files) {
    const filename = path.resolve(record.path);
    assert.ok(filename.startsWith(path.resolve(directory) + path.sep), "Artifact outside evidence directory");
    const bytes = await fs.readFile(filename);
    assert.equal(bytes.length, record.bytes, filename);
    assert.equal(sha(bytes), record.sha256, filename);
    files.push({ ...record, path: path.relative(repository, filename) });
  }
  const programName = sdk.language === "python" ? "custom program.py" : sdk.language === "julia" ? "custom.jl" : "custom.c";
  assert.ok(files.some(file => path.basename(file.path) === programName), "Program not covered by execution manifest");
  assert.ok(files.some(file => path.basename(file.path) === "api-objects.json"), "API observation not covered by execution manifest");
  const program = await fs.readFile(path.join(directory, programName), "utf8");
  const fixture = pythonCases.find(entry => entry.id === sdk.id);
  if (fixture) {
    assert.equal(verification.fixtureSha256, sha(fixture.code), "Fixture changed since execution");
    if (attempt) assert.equal(attempt.fixtureSha256, verification.fixtureSha256);
    assert.ok(program.includes(fixture.code), "Executed program does not contain the current fixture");
  } else assert.equal(program, await fs.readFile(path.join(repository, platformSources[sdk.id]), "utf8"));
  const objects = JSON.parse(await fs.readFile(path.join(directory, "api-objects.json")));
  assert.ok(objects.models.length && objects.operations.length);
  if (fixture) assert.deepEqual(objects.publicModules, sdk.modules);
  return { id: sdk.id, title: sdk.title, language: sdk.language, status: "passed_scoped_engineering",
    scope: objects.operations, models: objects.models, publicModules: objects.publicModules ?? sdk.modules,
    lock: sdk.lock, packages: execution.packages, python: execution.python ?? null,
    networkIsolation: verification.networkIsolation, checks: verification.checks,
    evidenceDirectory: path.relative(repository, directory),
    verification: { path: path.relative(repository, path.join(directory, "verification.json")), sha256: sha(verificationBytes) },
    execution: { path: path.relative(repository, path.join(directory, "execution.json")), sha256: sha(executionBytes) },
    files, scientificValidation: "not_evaluated" };
}

export async function collectEngineeringEvidence(directory, { repository = root } = {}) {
  const historicalPath = "docs/integrations/evidence/full-sdk-access-2026-10-12.json";
  const historicalBytes = await fs.readFile(path.join(repository, historicalPath));
  const historical = JSON.parse(historicalBytes);
  const expected = historical.libraries.filter(entry => entry.executionVerified === "not_checked");
  const cases = [...pythonCases.map(entry => entry.id), ...Object.keys(platformSources)];
  assert.equal(new Set(cases).size, 72);
  assert.deepEqual(cases.toSorted(), expected.map(entry => entry.id).toSorted());
  const inventory = await sdkInventory(repository);
  const latest = new Map(), attempts = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) if (entry.isDirectory()) {
    const folder = path.join(directory, entry.name), filename = path.join(folder, "verification.json");
    const optional = name => fs.readFile(path.join(folder, name)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    const [bytes, attemptBytes, sdkBytes] = await Promise.all([optional("verification.json"), optional("attempt.json"), optional("sdk.json")]);
    if (!bytes && !attemptBytes && !sdkBytes) continue;
    const record = bytes ? JSON.parse(bytes) : null;
    const attempt = attemptBytes ? JSON.parse(attemptBytes) : null;
    const id = attempt?.id ?? (sdkBytes ? JSON.parse(sdkBytes).id : record?.id);
    assert.ok(cases.includes(id), `Unknown verification id: ${id}`);
    if (record) assert.equal(record.id, id);
    // Older receipts predate attempt.json. Preserve their provenance explicitly;
    // never sort by the mutable verification mtime or ignore incomplete attempts.
    const started = attempt ? Date.parse(attempt.startedAt) : (await fs.stat(path.join(folder, sdkBytes ? "sdk.json" : "verification.json"))).birthtimeMs;
    assert.ok(Number.isFinite(started) && started > 0, `No reliable attempt start time: ${id}`);
    attempts.push({ id, status: record?.status ?? "interrupted_or_running", startedAt: new Date(started).toISOString(),
      startSource: attempt ? "attempt.json" : "legacy-file-birthtime", path: path.relative(repository, bytes ? filename : path.join(folder, attemptBytes ? "attempt.json" : "sdk.json")),
      sha256: sha(bytes ?? attemptBytes ?? sdkBytes) });
    if (!latest.has(id) || latest.get(id).started <= started) latest.set(id, { folder, started });
  }
  const libraries = [];
  for (const entry of expected) {
    const attempt = latest.get(entry.id), sdk = inventory.libraries.find(item => item.id === entry.id);
    try {
      assert.ok(attempt, "No final verification receipt");
      libraries.push({ ...await verifyEngineeringRecord(attempt.folder, sdk, { repository }), batch: entry.batch });
    } catch (error) {
      libraries.push({ id: entry.id, batch: entry.batch, status: "not_verified", reason: error.message.slice(0, 1500),
        evidenceDirectory: attempt ? path.relative(repository, attempt.folder) : null, scientificValidation: "not_evaluated" });
    }
  }
  return { schemaVersion: 1, generatedAt: new Date().toISOString(),
    purpose: "Remaining 72 locked SDK environments: programmable public API engineering checks, not exhaustive upstream API coverage or research-task acceptance.",
    platform: { os: process.platform, arch: process.arch, node: process.version },
    priorEvidence: { path: historicalPath, sha256: sha(historicalBytes), passedPreviously: 13, rerunByThisReport: false },
    summary: { expected: 72, passed: libraries.filter(entry => entry.status === "passed_scoped_engineering").length,
      unresolved: libraries.filter(entry => entry.status !== "passed_scoped_engineering").map(entry => entry.id) },
    batches: [2, 3, 4].map(batch => ({ batch, expected: expected.filter(entry => entry.batch === batch).length,
      passed: libraries.filter(entry => entry.batch === batch && entry.status === "passed_scoped_engineering").length })),
    scientificValidation: "not_evaluated", libraries, attempts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [directory, destination, flag] = process.argv.slice(2);
  if (!directory || !destination || (flag && flag !== "--require-complete")) throw new Error("Usage: node scripts/sdk-engineering-evidence.mjs <evidence-directory> <report.json> [--require-complete]");
  const report = await collectEngineeringEvidence(path.resolve(directory));
  await fs.writeFile(destination, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report.summary));
  if (flag && report.summary.unresolved.length) process.exitCode = 1;
}
