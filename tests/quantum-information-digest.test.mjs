import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Context } from "@deepseek-ai/cordis";
import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";
import {
  REQUEST_DIGEST_VERSION,
  binary64RequestDigest,
  computeReferenceAnalysis,
  normalizeAuditRequest,
  requestDigest,
} from "../.agents/skills/quantum-information-audit/validators/state-math.mjs";
import { validateStateAnalysis } from "../.agents/skills/quantum-information-audit/validators/validate-state-analysis.mjs";
import {
  QUANTUM_INFORMATION_AUDIT_TOOL,
  scientificResultAdapter,
} from "../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";

const pythonDirectory = fileURLToPath(new URL("../.agents/skills/quantum-information-audit/mcp", import.meta.url));
const python = process.env.OPENQUANTUM_TEST_PYTHON ?? (process.platform === "win32" ? "python" : "python3");

function pythonDigests(requests) {
  // Execute the same standard-library helper imported by the real Python bridge.
  // This test needs no toqito installation, network or simulated Python response.
  const child = spawnSync(python, ["-B", "-c", `
import json, sys
sys.path.insert(0, ${JSON.stringify(pythonDirectory)})
from request_digest import REQUEST_DIGEST_VERSION, canonical_digest
print(json.dumps({"version": REQUEST_DIGEST_VERSION, "digests": [canonical_digest(request) for request in json.load(sys.stdin)]}))
`], { input: JSON.stringify(requests), encoding: "utf8", timeout: 10000 });
  assert.equal(child.status, 0, child.error?.message ?? child.stderr);
  const output = JSON.parse(child.stdout);
  assert.equal(output.version, REQUEST_DIGEST_VERSION);
  return output.digests;
}

function requestWithCoherence(value = 1e-7) {
  return normalizeAuditRequest({
    matrixReal: [[0.25, value, 0, 0], [value, 0.25, 0, 0], [0, 0, 0.25, 0], [0, 0, 0, 0.25]],
    subsystemDimensions: [2, 2],
    transposeSubsystems: [0],
  });
}

function numericalFacts(request) {
  // Only the digest crosses Python here. Existing live tests own the SDK facts.
  const reference = computeReferenceAnalysis(request);
  const { densityByReplayedCriteria, ...state } = reference.state;
  return { ...reference, packageVersion: "1.3.1", state: { ...state, toqitoDensity: densityByReplayedCriteria } };
}

function digestStatus(request, analysis) {
  return validateStateAnalysis({ request, analysis }).observations.find(item => item.id === "state.digest").status;
}

test("Python and JavaScript independently hash binary64 boundaries and decimal exponent forms", () => {
  const numbers = [0, -0, 1, -1, 1e-7, -1e-7, 1e-6, 1e-5, 1e20, 1e21,
    Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE, Number.EPSILON,
    Number.MAX_SAFE_INTEGER, 2 ** 53, 1000000000000000100];
  let state = 0x12345678;
  const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  for (let index = 0; index < 256; index += 1) {
    const bytes = Buffer.alloc(8);
    bytes.writeUInt32BE(next(), 0);
    bytes.writeUInt32BE(next(), 4);
    const value = bytes.readDoubleBE();
    if (Number.isFinite(value)) numbers.push(value);
  }
  const requests = numbers.map(value => requestWithCoherence(value));
  assert.deepEqual(pythonDigests(requests), requests.map(binary64RequestDigest));
  assert.equal(binary64RequestDigest(requestWithCoherence(-0)), binary64RequestDigest(requestWithCoherence(0)));
  assert.notEqual(binary64RequestDigest(requestWithCoherence(0)), binary64RequestDigest(requestWithCoherence(Number.MIN_VALUE)));
});

test("digest verification preserves legacy artifacts and rejects tampering or unknown versions", () => {
  const bell = normalizeAuditRequest({ matrixReal: [[0.5, 0, 0, 0.5], [0, 0, 0, 0], [0, 0, 0, 0], [0.5, 0, 0, 0.5]], subsystemDimensions: [2, 2], transposeSubsystems: [0] });
  assert.equal(requestDigest(bell), "5cb4cce15ac7bc324fdaf943ac669e6510c8c6614390d106519837cf0793f6ba");
  assert.equal(digestStatus(bell, numericalFacts(bell)), "pass");
  const request = requestWithCoherence();
  const analysis = { ...numericalFacts(request), requestDigestVersion: REQUEST_DIGEST_VERSION, requestDigest: pythonDigests([request])[0] };
  assert.equal(digestStatus(request, analysis), "pass");
  assert.equal(digestStatus(requestWithCoherence(2e-7), analysis), "fail");
  assert.equal(digestStatus(request, { ...analysis, requestDigest: "0".repeat(64) }), "fail");
  assert.equal(digestStatus(request, { ...analysis, requestDigestVersion: "unknown" }), "fail");
  assert.equal(digestStatus(request, { ...analysis, requestDigestVersion: null }), "fail");
  assert.equal(digestStatus(request, { ...analysis, requestDigest: requestDigest(request) }), "fail");
  const strippedVersion = { ...analysis };
  delete strippedVersion.requestDigestVersion;
  assert.equal(digestStatus(request, strippedVersion), "fail");
  // This is the old Python json.dumps digest from the review's real toqito run.
  const historicalMismatch = { ...numericalFacts(request), requestDigest: "9e1cdf6c82bc4f357032e0c63bd94bf8265f94874fdc58f70c1252f783a32ca5" };
  assert.equal(digestStatus(request, historicalMismatch), "fail");
});

test("a Python-computed versioned digest survives materialization and the central Builder", async (t) => {
  const request = requestWithCoherence();
  const analysis = { ...numericalFacts(request), requestDigestVersion: REQUEST_DIGEST_VERSION, requestDigest: pythonDigests([request])[0] };
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qia-digest-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const context = new Context();
  const result = await scientificResultAdapter(QUANTUM_INFORMATION_AUDIT_TOOL).materialize({
    fileSystem: new LocalFileSystem(context, { cwd: workspaceRoot, diffBasisMaxBytes: 1048576 }),
    workspaceRoot, sessionId: "digest-regression", callId: "digest-call", eventRange: { from: 1, to: 2 },
    arguments: request, canonicalValue: { structuredContent: { analysis } }, signal: new AbortController().signal,
  });
  assert.equal(result.acceptanceStatus, "passed");
  const report = JSON.parse(fs.readFileSync(path.join(workspaceRoot, result.acceptanceReportPath)));
  assert.ok(report.checks.every(check => check.status === "pass"));
  const artifact = result.resultCommit.artifacts.find(item => item.type === "state-analysis");
  const persisted = JSON.parse(fs.readFileSync(path.join(workspaceRoot, artifact.path)));
  assert.equal(persisted.requestDigestVersion, REQUEST_DIGEST_VERSION);
  assert.equal(persisted.requestDigest, analysis.requestDigest);
});
