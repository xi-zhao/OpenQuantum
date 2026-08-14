import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import { minimizePeriodicAngle } from "../scripts/lib/deterministic-optimizer.mjs";
import { GroundStateInputError } from "../scripts/lib/domain-error.mjs";
import {
  expectationFromMatrix,
  expectationFromTerms,
  statevectorForTheta,
} from "../scripts/lib/pauli-statevector.mjs";
import { solveGroundState, writeFactArtifacts } from "../scripts/solve.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(skillRoot, relativePath), "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function closeTo(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function angularDistance(actual, expected) {
  return Math.abs(Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected)));
}

function expectInputError(request, code) {
  assert.throws(
    () => solveGroundState(request),
    (error) => error instanceof GroundStateInputError && error.code === code,
  );
}

function assertAllNumbersFinite(value, location = "facts") {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${location} must be finite`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertAllNumbersFinite(item, `${location}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertAllNumbersFinite(item, `${location}.${key}`);
    }
  }
}

function coefficientScale(terms) {
  return Math.max(1, terms.reduce((sum, term) => sum + Math.abs(term.coefficient), 0));
}

const protocolFixture = readJson("evals/fixtures/requests/protocol-fixture.json");

test("protocol fixture reaches its independently calculated sector energy", () => {
  const facts = solveGroundState(protocolFixture);

  closeTo(facts.exactReference.groundEnergyHartree, -1.8572750302023802, 1e-14);
  closeTo(facts.groundStateResult.energyHartree, -1.8572750302023802, 1e-12);
  assert.ok(
    angularDistance(facts.groundStateResult.optimalThetaRadians, -0.22353699826765921) <
      1e-7,
  );
  assert.equal(facts.groundStateResult.converged, true);
  assert.equal(facts.groundStateResult.terminationReason, "angle-tolerance");
  assert.ok(facts.groundStateResult.evaluationCount <= 256);
  assert.equal(facts.hamiltonianManifest.hermiticityResidualHartree, 0);
  assert.equal(facts.hamiltonianManifest.sectorLeakageHartree, 0);
  assert.ok(facts.exactReference.eigenResidualHartree < 1e-12);
  assert.ok(facts.groundStateResult.variationalGapHartree >= -1e-12);
});

test("diagonal and XX analytic Hamiltonians have exact VQE minima", () => {
  const diagonal = solveGroundState(readJson("evals/fixtures/requests/diagonal.json"));
  closeTo(diagonal.exactReference.groundEnergyHartree, -1, 1e-14);
  closeTo(diagonal.groundStateResult.energyHartree, -1, 1e-12);
  assert.ok(angularDistance(diagonal.groundStateResult.optimalThetaRadians, 0) < 1e-7);

  const xx = solveGroundState(readJson("evals/fixtures/requests/xx-coupled.json"));
  closeTo(xx.exactReference.groundEnergyHartree, -1, 1e-14);
  closeTo(xx.groundStateResult.energyHartree, -1, 1e-12);
  assert.ok(angularDistance(xx.groundStateResult.optimalThetaRadians, -Math.PI / 2) < 1e-7);
});

test("periodic optimizer refines across the plus-or-minus-pi seam without a duplicate node", () => {
  const seamRequest = clone(readJson("evals/fixtures/requests/diagonal.json"));
  seamRequest.requestId = "qgs-periodic-seam-001";
  seamRequest.hamiltonian.terms[0].coefficient = 1;
  const facts = solveGroundState(seamRequest);
  const coarseEntries = facts.convergenceTrace.entries.filter(
    (entry) => entry.phase === "coarse",
  );

  assert.equal(facts.groundStateResult.optimalThetaRadians, -Math.PI);
  assert.equal(facts.convergenceTrace.coarsePointsEvaluated, 64);
  assert.equal(coarseEntries.length, 64);
  assert.equal(new Set(coarseEntries.map((entry) => entry.thetaRadians)).size, 64);
  assert.ok(
    facts.convergenceTrace.entries.every(
      (entry) => entry.thetaRadians >= -Math.PI && entry.thetaRadians < Math.PI,
    ),
  );
  assert.equal(facts.groundStateResult.converged, true);
  assert.ok(
    facts.convergenceTrace.finalBracketWidthRadians <=
      seamRequest.method.optimizer.angleToleranceRadians,
  );

  const direct = minimizePeriodicAngle(
    (thetaRadians) => Math.cos(thetaRadians),
    seamRequest.method.optimizer,
  );
  assert.equal(direct.best.thetaRadians, -Math.PI);
  assert.equal(direct.coarsePointsEvaluated, 64);

  for (const expectedTheta of [Math.PI - 0.03, -Math.PI + 0.03]) {
    const nearSeam = minimizePeriodicAngle(
      (thetaRadians) => -Math.cos(thetaRadians - expectedTheta),
      seamRequest.method.optimizer,
    );
    assert.ok(angularDistance(nearSeam.best.thetaRadians, expectedTheta) < 1e-7);
    assert.equal(nearSeam.converged, true);
  }
});

test("identity shift moves both energies but preserves the minimizer", () => {
  const base = solveGroundState(protocolFixture);
  const shiftedRequest = clone(protocolFixture);
  shiftedRequest.requestId = "qgs-protocol-shifted-001";
  shiftedRequest.hamiltonian.terms.find((term) => term.pauli === "II").coefficient += 0.25;
  const shifted = solveGroundState(shiftedRequest);

  closeTo(
    shifted.exactReference.groundEnergyHartree,
    base.exactReference.groundEnergyHartree + 0.25,
    1e-14,
  );
  closeTo(
    shifted.groundStateResult.energyHartree,
    base.groundStateResult.energyHartree + 0.25,
    1e-12,
  );
  assert.ok(
    angularDistance(
      shifted.groundStateResult.optimalThetaRadians,
      base.groundStateResult.optimalThetaRadians,
    ) < 1e-7,
  );
});

test("term permutation preserves canonical Hamiltonian digest and scientific results", () => {
  const base = solveGroundState(protocolFixture);
  const permutedRequest = clone(protocolFixture);
  permutedRequest.hamiltonian.terms.reverse();
  const permuted = solveGroundState(permutedRequest);

  assert.equal(
    permuted.hamiltonianManifest.hamiltonianDigest,
    base.hamiltonianManifest.hamiltonianDigest,
  );
  closeTo(permuted.groundStateResult.energyHartree, base.groundStateResult.energyHartree, 0);
  closeTo(
    permuted.groundStateResult.optimalThetaRadians,
    base.groundStateResult.optimalThetaRadians,
    0,
  );
});

test("preflight rejects QAOA, wrong unit, Y, and sector leakage", () => {
  const qaoa = clone(protocolFixture);
  qaoa.method.algorithm = "qaoa";
  expectInputError(qaoa, "INVALID_REQUEST");

  const wrongUnit = clone(protocolFixture);
  wrongUnit.hamiltonian.coefficientUnit = "electronvolt";
  expectInputError(wrongUnit, "INVALID_REQUEST");

  const y = clone(protocolFixture);
  y.hamiltonian.terms.find((term) => term.pauli === "XX").pauli = "YY";
  expectInputError(y, "UNSUPPORTED_PAULI");

  const leaking = clone(protocolFixture);
  leaking.hamiltonian.terms.push({ pauli: "XI", coefficient: 0.1 });
  expectInputError(leaking, "SECTOR_LEAKAGE");
});

test("low optimizer budget emits finite facts but truthfully reports non-convergence", () => {
  const request = clone(protocolFixture);
  request.method.optimizer.maxEvaluations = 32;
  const facts = solveGroundState(request);

  assert.equal(facts.groundStateResult.converged, false);
  assert.equal(facts.groundStateResult.terminationReason, "evaluation-budget");
  assert.equal(facts.groundStateResult.evaluationCount, 32);
  assert.equal(facts.convergenceTrace.finalBracketWidthRadians, null);
  assert.equal(facts.convergenceTrace.coarsePointsEvaluated, 32);
  assert.ok(Number.isFinite(facts.groundStateResult.energyHartree));
  assert.equal("status" in facts.groundStateResult, false);
  assert.equal("score" in facts.groundStateResult, false);
  assert.equal("acceptance" in facts.groundStateResult, false);
});

test("a budget that covers only the unique periodic grid reports an unrefined bracket", () => {
  const request = clone(protocolFixture);
  request.method.optimizer.maxEvaluations = 64;
  const facts = solveGroundState(request);

  assert.equal(facts.groundStateResult.converged, false);
  assert.equal(facts.groundStateResult.terminationReason, "evaluation-budget");
  assert.equal(facts.groundStateResult.evaluationCount, 64);
  assert.equal(facts.convergenceTrace.coarsePointsEvaluated, 64);
  assert.equal(facts.convergenceTrace.refinementEvaluations, 0);
  closeTo(facts.convergenceTrace.finalBracketWidthRadians, Math.PI / 16, 1e-15);
});

test("large legal coefficients use scale-aware matrix replay and retain finite facts", () => {
  const request = clone(protocolFixture);
  request.requestId = "qgs-large-scale-001";
  request.hamiltonian.terms = [
    { pauli: "II", coefficient: -526313.844602555 },
    { pauli: "IZ", coefficient: -80051.1222332716 },
    { pauli: "ZI", coefficient: -622099.3907190859 },
    { pauli: "ZZ", coefficient: 483799.25917834044 },
    { pauli: "XX", coefficient: 434019.77280154824 },
  ];
  const facts = solveGroundState(request);
  const matrixEnergy = expectationFromMatrix(
    facts.hamiltonianManifest.matrix,
    facts.groundStateResult.statevectorReal,
  );
  const termEnergy = expectationFromTerms(
    facts.hamiltonianManifest.terms,
    facts.groundStateResult.statevectorReal,
  );
  const absoluteResidual = Math.abs(matrixEnergy - termEnergy);
  const normalizedResidual =
    absoluteResidual /
    Math.max(
      coefficientScale(facts.hamiltonianManifest.terms),
      Math.abs(matrixEnergy),
      Math.abs(termEnergy),
    );

  assert.ok(absoluteResidual > 1e-12);
  assert.ok(normalizedResidual <= 128 * Number.EPSILON);
  assertAllNumbersFinite(facts);
});

test("preflight applies the profile Hamiltonian scale to sector leakage", () => {
  const withinTolerance = clone(readJson("evals/fixtures/requests/diagonal.json"));
  withinTolerance.requestId = "qgs-scaled-sector-tolerance-001";
  withinTolerance.hamiltonian.terms.push(
    { pauli: "II", coefficient: 1_000_000 },
    { pauli: "XI", coefficient: 5e-7 },
  );
  const facts = solveGroundState(withinTolerance);
  const scale = coefficientScale(facts.hamiltonianManifest.terms);

  closeTo(facts.hamiltonianManifest.sectorLeakageHartree, 5e-7, 0);
  assert.ok(facts.hamiltonianManifest.sectorLeakageHartree / scale <= 1e-12);

  const relativeViolation = clone(withinTolerance);
  relativeViolation.requestId = "qgs-scaled-sector-violation-001";
  relativeViolation.hamiltonian.terms.find((term) => term.pauli === "XI").coefficient = 2e-6;
  expectInputError(relativeViolation, "SECTOR_LEAKAGE");
});

test("random supported matrices preserve periodic, variational, and replay properties", () => {
  let randomState = 0x5eed1234;
  const random = () => {
    randomState = (1664525 * randomState + 1013904223) >>> 0;
    return randomState / 2 ** 32;
  };

  for (let caseIndex = 0; caseIndex < 32; caseIndex += 1) {
    const request = clone(protocolFixture);
    request.requestId = `qgs-random-${caseIndex}`;
    const scale = 10 ** (-6 + 12 * random());
    for (const term of request.hamiltonian.terms) {
      term.coefficient = (2 * random() - 1) * scale;
    }
    const facts = solveGroundState(request);
    const hamiltonianScale = coefficientScale(facts.hamiltonianManifest.terms);
    const normalizedEnergyError =
      Math.abs(
        facts.groundStateResult.energyHartree - facts.exactReference.groundEnergyHartree,
      ) / hamiltonianScale;
    const replayedState = statevectorForTheta(
      facts.groundStateResult.optimalThetaRadians,
    );

    assert.ok(normalizedEnergyError <= 1e-12, `random case ${caseIndex}`);
    assert.ok(
      facts.groundStateResult.variationalGapHartree / hamiltonianScale >= -1e-12,
      `random case ${caseIndex}`,
    );
    assert.ok(facts.groundStateResult.optimalThetaRadians >= -Math.PI);
    assert.ok(facts.groundStateResult.optimalThetaRadians < Math.PI);
    assert.deepEqual(facts.groundStateResult.statevectorReal, replayedState);
    assert.equal(facts.hamiltonianManifest.sectorLeakageHartree, 0);
    assert.equal(facts.groundStateResult.converged, true);
    assertAllNumbersFinite(facts, `case[${caseIndex}]`);
  }
});

test("optimizer trace is contiguous, replayable, and carries the true running best", () => {
  const facts = solveGroundState(protocolFixture);
  const entries = facts.convergenceTrace.entries;
  const scale = coefficientScale(facts.hamiltonianManifest.terms);
  let runningBest = Number.POSITIVE_INFINITY;

  entries.forEach((entry, index) => {
    assert.equal(entry.evaluation, index + 1);
    const replayed = expectationFromTerms(
      facts.hamiltonianManifest.terms,
      statevectorForTheta(entry.thetaRadians),
    );
    assert.ok(Math.abs(replayed - entry.energyHartree) / scale <= 128 * Number.EPSILON);
    runningBest = Math.min(runningBest, entry.energyHartree);
    assert.equal(entry.bestEnergyHartree, runningBest);
  });
  assert.equal(entries.length, facts.groundStateResult.evaluationCount);
  assert.equal(runningBest, facts.groundStateResult.energyHartree);
  assert.equal(runningBest, facts.convergenceTrace.bestEnergyHartree);
  assert.equal(
    facts.convergenceTrace.coarsePointsEvaluated +
      facts.convergenceTrace.refinementEvaluations,
    entries.length,
  );
});

test("non-finite request coefficients are rejected before scientific execution", () => {
  for (const coefficient of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const request = clone(protocolFixture);
    request.hamiltonian.terms[0].coefficient = coefficient;
    expectInputError(request, "INVALID_REQUEST");
  }
});

test("acceptance profile keeps reproduction separate and requires ansatz and trace replay", () => {
  const profile = readJson(
    "acceptance-profiles/supplied-pauli-statevector-v1.json",
  );
  const checks = new Map(profile.checks.map((check) => [check.id, check]));

  assert.equal(checks.has("reproduction.independent"), false);
  assert.equal(checks.get("result.ansatz-replayed").required, true);
  assert.equal(checks.get("optimizer.trace-replayed").required, true);
  assert.equal(checks.get("result.expectation-replayed").unit, "dimensionless");
});

test("all emitted artifacts satisfy strict schemas", () => {
  const facts = solveGroundState(protocolFixture);
  const requestSchema = readJson("inputs/request.schema.json");
  const validateRequest = new Ajv2020({ strict: true, allErrors: true }).compile(requestSchema);
  assert.equal(
    validateRequest(protocolFixture),
    true,
    JSON.stringify(validateRequest.errors),
  );
  assert.equal(requestSchema.additionalProperties, false);
  const mappings = [
    ["problemSpec", "problem-spec.schema.json"],
    ["hamiltonianManifest", "hamiltonian-manifest.schema.json"],
    ["exactReference", "exact-reference.schema.json"],
    ["groundStateResult", "ground-state-result.schema.json"],
    ["convergenceTrace", "convergence-trace.schema.json"],
    ["resourceEstimate", "resource-estimate.schema.json"],
  ];
  for (const [key, schemaName] of mappings) {
    const schema = readJson(`artifacts/${schemaName}`);
    const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
    assert.equal(validate(facts[key]), true, `${schemaName}: ${JSON.stringify(validate.errors)}`);
    assert.equal(schema.additionalProperties, false);
  }
});

test("CLI writer emits facts only and refuses overwrite", () => {
  const facts = solveGroundState(protocolFixture);
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qgs-"));
  const output = path.join(parent, "facts");
  const written = writeFactArtifacts(facts, output);
  assert.equal(written.length, 6);
  for (const file of written) {
    const artifact = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal("status" in artifact, false);
    assert.equal("score" in artifact, false);
    assert.equal("acceptance" in artifact, false);
  }
  assert.throws(() => writeFactArtifacts(facts, output), /Refusing to overwrite/);
  fs.rmSync(parent, { recursive: true, force: true });
});
