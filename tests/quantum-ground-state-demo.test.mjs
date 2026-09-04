import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const demoPath = path.join(projectRoot, "scripts", "run-quantum-ground-state-demo.mjs");
const fixturePath = path.join(
  projectRoot,
  ".agents",
  "skills",
  "quantum-ground-state",
  "evals",
  "fixtures",
  "requests",
  "protocol-fixture.json",
);

function runDemo(requestPath) {
  return spawnSync(process.execPath, [demoPath, ...(requestPath ? [requestPath] : [])], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 20_000,
  });
}

test("newcomer QGS demo runs the atomic native Tool workflow without cloud credentials", () => {
  const result = runDemo();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.capability, {
    id: "quantum-ground-state",
    version: "0.2.0",
  });
  assert.equal(report.provider, "openquantum-native-quantum-tools");
  assert.equal(report.tool, "solve_and_validate_ground_state");
  assert.equal(report.runtime.status, "completed");
  assert.equal(report.result.converged, true);
  assert.deepEqual(report.scientificReview, {
    status: "observations_available",
    scope: "in_scope",
    observations: { pass: 15, fail: 0, not_checked: 1 },
    provenance: "not_checked",
    acceptance: "not_derived",
  });
});

test("newcomer QGS demo fails when a required computational check fails", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qgs-demo-"));
  try {
    const request = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    request.requestId = "qgs-demo-low-budget";
    request.method.optimizer.maxEvaluations = 32;
    const requestPath = path.join(temporaryRoot, "request.json");
    fs.writeFileSync(requestPath, `${JSON.stringify(request, null, 2)}\n`);

    const result = runDemo(requestPath);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /computational checks failed: vqe\.converged/);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
