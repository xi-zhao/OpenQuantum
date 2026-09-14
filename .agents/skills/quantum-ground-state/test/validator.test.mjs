import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import { solveGroundState } from "../scripts/solve.mjs";
import {
  validateGroundStateComputation,
  validateValidationBundle,
} from "../validators/validate-result.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(skillRoot, relativePath), "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function resultPackageFor(facts) {
  const artifactTypes = [
    facts.problemSpec,
    facts.hamiltonianManifest,
    facts.exactReference,
    facts.groundStateResult,
    facts.convergenceTrace,
    facts.resourceEstimate,
  ];
  return {
    kind: "openquantum-result-package-v1.1",
    value: {
      schemaVersion: "1.1",
      packageId: "qgs-package-test-001",
      capability: {
        id: "quantum-ground-state",
        version: "0.2.0",
      },
      createdAt: "2026-08-14T00:00:00.000Z",
      executionRef: {
        sessionId: "qgs-validator-test-session",
        eventRange: { from: 10, to: 20 },
      },
      acceptanceProfile: {
        id: "supplied-pauli-statevector",
        version: "1.1.0",
        sha256: "b".repeat(64),
      },
      inputs: [
        {
          id: "request-snapshot",
          type: "ground-state-request",
          path: "request.json",
          mediaType: "application/json",
          bytes: 1,
          sha256: "c".repeat(64),
        },
      ],
      artifacts: artifactTypes.map((artifact, index) => ({
        id: `${artifact.artifactType}-artifact`,
        type: artifact.artifactType,
        path: `${artifact.artifactType}.json`,
        mediaType: "application/json",
        bytes: index + 1,
        sha256: String(index + 1).repeat(64),
      })),
      provenance: {
        tools: [{ id: "qgs-solver", version: "0.1.0", digest: "d".repeat(64) }],
        environment: [
          { id: "node", version: process.versions.node, digest: "e".repeat(64) },
        ],
        dependencies: [],
      },
    },
  };
}

function bundleFor(
  request,
  facts,
  profile = readJson("acceptance-profiles/supplied-pauli-statevector-v1.1.json"),
) {
  return {
    schemaVersion: "1.0",
    resultPackage: resultPackageFor(facts),
    profile,
    request,
    facts,
  };
}

function validate(
  request,
  facts,
  profile = readJson("acceptance-profiles/supplied-pauli-statevector-v1.1.json"),
) {
  return validateValidationBundle(bundleFor(request, facts, profile));
}

function observation(output, id) {
  const found = output.observations.find((item) => item.id === id);
  assert.ok(found, `missing observation ${id}`);
  return found;
}

const protocolFixture = readJson("evals/fixtures/requests/protocol-fixture.json");

test("the caller-budget profile has its own version and preserves the historical rule", () => {
  const previous = readJson("acceptance-profiles/supplied-pauli-statevector-v1.json");
  const current = readJson("acceptance-profiles/supplied-pauli-statevector-v1.1.json");
  assert.equal(previous.version, "1.0.0");
  assert.equal(previous.checks.find(c => c.id === "resources.within-budget").threshold, 256);
  assert.equal(current.version, "1.1.0");
  assert.equal(current.checks.find(c => c.id === "resources.within-budget").threshold, 1);
  const legacy = clone(protocolFixture);
  legacy.acceptanceProfile.version = "1.0.0";
  assert.throws(() => solveGroundState(legacy), /1\.1\.0/);
});

test("resource checks accept user grids above 256 evaluations and distinguish full from exceeded budgets", () => {
  const request = clone(protocolFixture);
  request.method.optimizer.coarsePoints = 2049;
  request.method.optimizer.maxEvaluations = 4096;
  const computed = solveGroundState(request);
  assert.ok(computed.groundStateResult.evaluationCount > 256);
  assert.ok(computed.resourceEstimate.pauliTermEvaluations > 8192);
  const inside = observation(validate(request, computed), "resources.within-budget");
  assert.equal(inside.status, "pass");
  assert.ok(inside.observed.budgetFraction < 1);
  assert.equal(observation(validate(request, computed), "optimizer.trace-replayed").status, "pass");

  request.method.optimizer.coarsePoints = 513;
  request.method.optimizer.maxEvaluations = 512;
  const full = solveGroundState(request);
  const atLimit = observation(validate(request, full), "resources.within-budget");
  assert.equal(atLimit.status, "pass");
  assert.equal(atLimit.observed.budgetFraction, 1);

  // Keep reported counts mutually consistent so the failure tests the request budget.
  const over = clone(full);
  over.convergenceTrace.entries.push({ ...over.convergenceTrace.entries.at(-1), evaluation: 513 });
  over.convergenceTrace.refinementEvaluations += 1;
  over.groundStateResult.evaluationCount = 513;
  over.resourceEstimate.expectationEvaluations = 513;
  over.resourceEstimate.pauliTermEvaluations = 513 * over.resourceEstimate.pauliTermCount;
  const exceeded = observation(validate(request, over), "resources.within-budget");
  assert.equal(exceeded.observed.resourceCountsMatch, true);
  assert.equal(exceeded.observed.budgetFraction, 513 / 512);
  assert.equal(exceeded.status, "fail");
});

test("execution-local validation checks computation but never fabricates provenance", () => {
  const facts = solveGroundState(protocolFixture);
  const output = validateGroundStateComputation({
    profile: readJson("acceptance-profiles/supplied-pauli-statevector-v1.1.json"),
    request: protocolFixture,
    facts,
  });

  assert.equal(output.scopeMatch.status, "in_scope");
  assert.ok(
    output.observations
      .filter((item) => item.id !== "provenance.complete")
      .every((item) => item.status === "pass"),
  );
  const provenance = observation(output, "provenance.complete");
  assert.equal(provenance.status, "not_checked");
  assert.deepEqual(provenance.evidenceRefs, []);
  assert.match(provenance.nextAction, /Materialize the input and six facts/);
  assert.match(output.statement, /no Acceptance decision/);
  assert.ok(output.limitations.some((item) => /provenance is not checked/i.test(item)));
  assert.equal("status" in output, false);
});

test("validator emits only profile-bound observations for a valid result", () => {
  const facts = solveGroundState(protocolFixture);
  const profile = readJson("acceptance-profiles/supplied-pauli-statevector-v1.1.json");
  const output = validate(protocolFixture, facts, profile);

  assert.deepEqual(Object.keys(output), [
    "scopeMatch",
    "observations",
    "limitations",
    "statement",
  ]);
  assert.equal(output.scopeMatch.status, "in_scope");
  assert.deepEqual(
    output.observations.map((item) => item.id),
    profile.checks.map((item) => item.id),
  );
  assert.ok(output.observations.every((item) => item.status === "pass"));
  assert.equal("status" in output, false);
  assert.equal("score" in output, false);
  assert.equal("acceptance" in output, false);
  assert.doesNotMatch(JSON.stringify(output), /(?:NaN|Infinity)/);
});

test("validator keeps truthful low-budget facts separate from convergence", () => {
  const request = clone(protocolFixture);
  request.method.optimizer.maxEvaluations = 32;
  const output = validate(request, solveGroundState(request));

  assert.equal(observation(output, "vqe.converged").status, "fail");
  assert.equal(observation(output, "optimizer.trace-replayed").status, "pass");
  assert.equal(observation(output, "resources.within-budget").status, "pass");
});

test("validator detects ansatz tampering but permits a global phase", () => {
  const tampered = solveGroundState(protocolFixture);
  tampered.groundStateResult.statevectorReal[1] += 1e-6;
  const output = validate(protocolFixture, tampered);
  assert.equal(observation(output, "result.ansatz-replayed").status, "fail");
  assert.equal(observation(output, "result.state-normalized").status, "fail");

  const permissive = readJson("acceptance-profiles/supplied-pauli-statevector-v1.1.json");
  permissive.checks.find((check) => check.id === "result.ansatz-replayed").threshold = 1;
  assert.equal(
    observation(validate(protocolFixture, tampered, permissive), "result.ansatz-replayed")
      .status,
    "pass",
  );

  const phaseShifted = solveGroundState(protocolFixture);
  phaseShifted.groundStateResult.statevectorReal =
    phaseShifted.groundStateResult.statevectorReal.map((amplitude) => -amplitude);
  const phaseOutput = validate(protocolFixture, phaseShifted);
  assert.equal(observation(phaseOutput, "result.ansatz-replayed").status, "pass");
  assert.equal(observation(phaseOutput, "result.expectation-replayed").status, "pass");
});

test("validator independently replays every optimizer trace entry", () => {
  const facts = solveGroundState(protocolFixture);
  facts.convergenceTrace.entries[10].energyHartree += 0.1;
  const replay = observation(
    validate(protocolFixture, facts),
    "optimizer.trace-replayed",
  );

  assert.equal(replay.status, "fail");
  assert.ok(replay.observed.maximumNormalizedEnergyResidual > 0);

  const bestThetaTamper = solveGroundState(protocolFixture);
  bestThetaTamper.convergenceTrace.bestThetaRadians += 0.1;
  const thetaReplay = observation(
    validate(protocolFixture, bestThetaTamper),
    "optimizer.trace-replayed",
  );
  assert.equal(thetaReplay.status, "fail");
  assert.ok(thetaReplay.observed.maximumAngularResidual > 0);
});

test("validator detects digest, matrix, sector, and exact-reference tampering", () => {
  const digestTamper = solveGroundState(protocolFixture);
  digestTamper.exactReference.hamiltonianDigest = "0".repeat(64);
  assert.equal(
    observation(validate(protocolFixture, digestTamper), "provenance.complete").status,
    "fail",
  );

  const manifestDigestTamper = solveGroundState(protocolFixture);
  manifestDigestTamper.hamiltonianManifest.hamiltonianDigest = "0".repeat(64);
  const digestOutput = validate(protocolFixture, manifestDigestTamper);
  assert.equal(observation(digestOutput, "hamiltonian.canonical").status, "fail");
  assert.equal(observation(digestOutput, "provenance.complete").status, "fail");

  const matrixTamper = solveGroundState(protocolFixture);
  matrixTamper.hamiltonianManifest.matrix[0][1] = 0.25;
  assert.equal(
    observation(validate(protocolFixture, matrixTamper), "hamiltonian.hermitian").status,
    "fail",
  );

  const sectorTamper = solveGroundState(protocolFixture);
  sectorTamper.hamiltonianManifest.matrix[0][2] = 0.25;
  sectorTamper.hamiltonianManifest.matrix[2][0] = 0.25;
  assert.equal(
    observation(validate(protocolFixture, sectorTamper), "sector.invariant").status,
    "fail",
  );

  const referenceTamper = solveGroundState(protocolFixture);
  referenceTamper.exactReference.groundEnergyHartree += 0.01;
  const referenceOutput = validate(protocolFixture, referenceTamper);
  assert.equal(observation(referenceOutput, "reference.recomputed").status, "fail");
  assert.equal(observation(referenceOutput, "reference.eigen-residual").status, "fail");
});

test("validator separates expectation replay and the variational lower bound", () => {
  const expectationTamper = solveGroundState(protocolFixture);
  expectationTamper.groundStateResult.energyHartree += 0.01;
  assert.equal(
    observation(
      validate(protocolFixture, expectationTamper),
      "result.expectation-replayed",
    ).status,
    "fail",
  );

  const variationalTamper = solveGroundState(protocolFixture);
  variationalTamper.groundStateResult.energyHartree =
    variationalTamper.exactReference.groundEnergyHartree - 0.01;
  variationalTamper.groundStateResult.variationalGapHartree = -0.01;
  assert.equal(
    observation(
      validate(protocolFixture, variationalTamper),
      "vqe.variational-bound",
    ).status,
    "fail",
  );
});

test("out-of-scope inputs remain a scope fact rather than an overall status", () => {
  const request = clone(protocolFixture);
  request.method.algorithm = "qaoa";
  const output = validate(request, solveGroundState(protocolFixture));
  assert.equal(output.scopeMatch.status, "out_of_scope");
  assert.equal(observation(output, "request.scope").status, "fail");
  assert.equal("status" in output, false);

  const leakingRequest = clone(protocolFixture);
  leakingRequest.hamiltonian.terms.find((term) => term.pauli === "XX").pauli = "XI";
  const leakingOutput = validate(leakingRequest, solveGroundState(protocolFixture));
  assert.equal(leakingOutput.scopeMatch.status, "out_of_scope");
  assert.match(leakingOutput.scopeMatch.statement, /does not preserve/);
});

test("validator fails closed on non-finite artifacts without emitting invalid JSON", () => {
  const facts = solveGroundState(protocolFixture);
  facts.groundStateResult.energyHartree = Number.POSITIVE_INFINITY;
  const output = validate(protocolFixture, facts);

  assert.equal(observation(output, "result.finite-hartree").status, "fail");
  assert.equal(observation(output, "result.expectation-replayed").status, "fail");
  assert.doesNotMatch(JSON.stringify(output), /(?:NaN|Infinity)/);
});

test("scale-normalized checks accept a high-coefficient supported Hamiltonian", () => {
  const request = clone(protocolFixture);
  request.requestId = "qgs-validator-large-scale-001";
  request.hamiltonian.terms = [
    { pauli: "II", coefficient: -526313.844602555 },
    { pauli: "IZ", coefficient: -80051.1222332716 },
    { pauli: "ZI", coefficient: -622099.3907190859 },
    { pauli: "ZZ", coefficient: 483799.25917834044 },
    { pauli: "XX", coefficient: 434019.77280154824 },
  ];
  const output = validate(request, solveGroundState(request));

  for (const id of [
    "hamiltonian.hermitian",
    "sector.invariant",
    "reference.recomputed",
    "reference.eigen-residual",
    "result.expectation-replayed",
    "vqe.variational-bound",
    "optimizer.trace-replayed",
  ]) {
    assert.equal(observation(output, id).status, "pass", id);
  }
});

test("validator accepts deterministic random supported Hamiltonians across scales", () => {
  let state = 0x41c64e6d;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  for (let caseIndex = 0; caseIndex < 24; caseIndex += 1) {
    const request = clone(protocolFixture);
    request.requestId = `qgs-validator-random-${caseIndex}`;
    const scale = 10 ** (-6 + 12 * random());
    for (const term of request.hamiltonian.terms) {
      term.coefficient = (2 * random() - 1) * scale;
    }
    const output = validate(request, solveGroundState(request));
    assert.ok(
      output.observations.every((item) => item.status === "pass"),
      `random case ${caseIndex}: ${JSON.stringify(
        output.observations.filter((item) => item.status !== "pass"),
      )}`,
    );
  }
});

test("materialized validation bundle is strict and carries one of each fact type", () => {
  const facts = solveGroundState(protocolFixture);
  const bundle = bundleFor(protocolFixture, facts);
  const schema = readJson("validators/result-validation-bundle.schema.json");
  const validator = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  assert.equal(validator(bundle), true, JSON.stringify(validator.errors));
  assert.ok(validateValidationBundle(bundle).observations.every((item) => item.status === "pass"));

  const duplicate = clone(bundle);
  duplicate.resultPackage.value.artifacts.push({
    ...duplicate.resultPackage.value.artifacts[0],
    id: "duplicate",
  });
  assert.throws(
    () => validateValidationBundle(duplicate),
    /exactly one problem-spec artifact/,
  );

  const forgedCapability = clone(bundle);
  forgedCapability.resultPackage.value.capability.id = "other-capability";
  assert.equal(
    observation(validateValidationBundle(forgedCapability), "provenance.complete").status,
    "fail",
  );

  const wrongContract = clone(bundle);
  wrongContract.resultPackage.kind = "openquantum-result-package-v1";
  wrongContract.resultPackage.value.schemaVersion = "1.0";
  assert.throws(
    () => validateValidationBundle(wrongContract),
    /Result Package v1\.1 contract/,
  );

  const extra = clone(bundle);
  extra.status = "passed";
  assert.equal(validator(extra), false);
  assert.throws(() => validateValidationBundle(extra), /must contain exactly/);
});

test("validator CLI consumes one materialized bundle and emits observations only", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qgs-validator-"));
  try {
    const facts = solveGroundState(protocolFixture);
    const bundle = bundleFor(protocolFixture, facts);
    const bundlePath = path.join(temporaryRoot, "validation-bundle.json");
    fs.writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

    const accepted = spawnSync(
      process.execPath,
      [path.join(skillRoot, "validators/validate-result.mjs"), bundlePath],
      { encoding: "utf8" },
    );
    assert.equal(accepted.status, 0, accepted.stderr);
    const output = JSON.parse(accepted.stdout);
    assert.deepEqual(Object.keys(output), [
      "scopeMatch",
      "observations",
      "limitations",
      "statement",
    ]);
    assert.ok(output.observations.every((item) => item.status === "pass"));

    const forbidden = { ...bundle, status: "passed" };
    fs.writeFileSync(bundlePath, `${JSON.stringify(forbidden, null, 2)}\n`);
    const rejected = spawnSync(
      process.execPath,
      [path.join(skillRoot, "validators/validate-result.mjs"), bundlePath],
      { encoding: "utf8" },
    );
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /must contain exactly/);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
