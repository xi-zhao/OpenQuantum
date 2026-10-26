import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { normalizeVerificationRequest } from "../core/request-contract.mjs";
import { auditQcecAnalysis, prepareQcecAnalysis } from "../validators/validate-qcec-analysis.mjs";

export function controlledCase(verdict = "equivalent") {
  const prefix = 'OPENQASM 2.0; include "qelib1.inc"; qreg q[1]; ';
  const request = { circuitAOpenQasm2: prefix + "h q[0];",
    circuitBOpenQasm2: prefix + (verdict === "not_equivalent" ? "x q[0];"
      : verdict === "equivalent_up_to_global_phase" ? "h q[0]; x q[0]; y q[0]; z q[0];"
        : "h q[0]; x q[0]; x q[0];") };
  const inputs = normalizeVerificationRequest(request).summaries;
  const inputDigests = { circuitA: inputs.circuitA.sha256, circuitB: inputs.circuitB.sha256 };
  const analysis = prepareQcecAnalysis(request, { schemaVersion: "1.0", scientificValidation: "observations_available",
    packageVersion: "3.10.0", inputs, result: { equivalence: verdict, inputDigests, timeoutSeconds: 0,
      statistics: { preprocessingSeconds: 0, checkSeconds: 0.001, performedSimulations: 0, performedInstantiations: 0, checkers: [] } } });
  // Fixed numerical boundary fixtures; these are not real Python execution evidence.
  const reference = { schemaVersion: "1.0", engine: { name: "qiskit", version: "2.5.2" }, inputDigests,
    maxDenseQubits: 8, mode: "dense-unitary", qubits: 1, strictResidual: 0, globalPhaseResidual: 0, phase: { real: 1, imag: 0 } };
  return { request, analysis, reference };
}

export function runEvals() {
  const suite = JSON.parse(fs.readFileSync(new URL("./suite.json", import.meta.url), "utf8"));
  const cases = [
    ["equivalent", "equivalent", "pass", "pass", value => value],
    ["global-phase", "equivalent_up_to_global_phase", "pass", "pass", value => { value.reference.strictResidual = 1; value.reference.phase = { real: 0, imag: 1 }; }],
    ["negative-control", "not_equivalent", "pass", "pass", value => { value.reference.strictResidual = 0.7; value.reference.globalPhaseResidual = 0.7; }],
    ["relative-phase", "equivalent_up_to_phase", "warn", "warn", value => value],
    ["probably-equivalent", "probably_equivalent", "warn", "warn", value => value],
    ["no-information", "no_information", "warn", "warn", value => value],
    ["near-negative-margin", "not_equivalent", "pass", "warn", value => { value.reference.globalPhaseResidual = 5e-9; value.reference.strictResidual = 5e-9; }],
    ["digest-tamper", "equivalent", "pass", "pass", value => { value.analysis.result.inputDigests.circuitA = "0".repeat(64); }],
    ["backend-tamper", "equivalent", "pass", "pass", value => { value.analysis.packageVersion = "0.0.0"; }],
    ["missing-reference", "equivalent", "pass", "warn", value => { value.reference = { mode: "unavailable", reason: "reference_process_failed" }; }],
  ];
  assert.deepEqual(cases.map(item => item[0]), suite.cases.map(item => item.id));
  for (const [id, verdict, conclusive, replay, mutate] of cases) {
    const value = controlledCase(verdict); mutate(value);
    const observations = new Map(auditQcecAnalysis(value).observations.map(item => [item.id, item.status]));
    assert.equal(observations.get("qcec.conclusive"), conclusive, id);
    assert.equal(observations.get("classification.replayed"), replay, id);
    if (id === "digest-tamper") assert.equal(observations.get("inputs.digest"), "fail");
    if (id === "backend-tamper") assert.equal(observations.get("backend.version"), "fail");
    assert.equal(observations.get("provenance.complete"), "not_checked");
    assert.equal(suite.cases.find(item => item.id === id).expectedOutcome.conclusive, conclusive);
    assert.equal(suite.cases.find(item => item.id === id).expectedOutcome.replay, replay);
  }
  return { status: "passed", cases: cases.length, scope: "controlled-validator-boundaries", scientificAcceptance: "not_evaluated" };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runEvals()));
