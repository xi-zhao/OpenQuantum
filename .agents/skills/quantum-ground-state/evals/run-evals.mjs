import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GroundStateInputError } from "../scripts/lib/domain-error.mjs";
import { solveGroundState } from "../scripts/solve.mjs";
import { validateValidationBundle } from "../validators/validate-result.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(skillRoot, relativePath), "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function resultPackageFor(facts, packageId) {
  const artifacts = Object.values(facts).map((artifact, index) => ({
    id: `${artifact.artifactType}-${packageId}`,
    type: artifact.artifactType,
    path: `${artifact.artifactType}.json`,
    mediaType: "application/json",
    bytes: index + 1,
    sha256: String(index + 1).repeat(64),
  }));
  return {
    kind: "openquantum-result-package-v1.1",
    value: {
      schemaVersion: "1.1",
      packageId,
      capability: {
        id: "quantum-ground-state",
        version: "0.2.0",
      },
      createdAt: "2026-08-14T00:00:00.000Z",
      executionRef: {
        sessionId: `${packageId}-session`,
        eventRange: { from: 1, to: 2 },
      },
      acceptanceProfile: {
        id: "supplied-pauli-statevector",
        version: "1.0.0",
        sha256: "b".repeat(64),
      },
      inputs: [
        {
          id: `request-${packageId}`,
          type: "ground-state-request",
          path: "request.json",
          mediaType: "application/json",
          bytes: 1,
          sha256: "c".repeat(64),
        },
      ],
      artifacts,
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

function validate(request, facts, packageId) {
  return validateValidationBundle({
    schemaVersion: "1.0",
    resultPackage: resultPackageFor(facts, packageId),
    profile: readJson("acceptance-profiles/supplied-pauli-statevector-v1.json"),
    request,
    facts,
  });
}

function allPass(output) {
  return (
    output.scopeMatch.status === "in_scope" &&
    output.observations.every((observation) => observation.status === "pass")
  );
}

function observation(output, id) {
  return output.observations.find((item) => item.id === id);
}

function expectInputCode(request, code) {
  try {
    solveGroundState(request);
    return false;
  } catch (error) {
    return error instanceof GroundStateInputError && error.code === code;
  }
}

function closeTo(left, right, tolerance = 1e-12) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function evaluateCase(id) {
  const protocol = readJson("evals/fixtures/requests/protocol-fixture.json");
  if (id === "protocol-fixture-accepted") {
    const facts = solveGroundState(protocol);
    return {
      passed: facts.groundStateResult.converged && allPass(validate(protocol, facts, id)),
      observed: {
        converged: facts.groundStateResult.converged,
        energyHartree: facts.groundStateResult.energyHartree,
      },
    };
  }
  if (id === "analytic-diagonal-accepted" || id === "analytic-xx-accepted") {
    const fixture = id.includes("diagonal") ? "diagonal.json" : "xx-coupled.json";
    const request = readJson(`evals/fixtures/requests/${fixture}`);
    const facts = solveGroundState(request);
    return {
      passed:
        closeTo(facts.groundStateResult.energyHartree, -1) &&
        allPass(validate(request, facts, id)),
      observed: { energyHartree: facts.groundStateResult.energyHartree },
    };
  }
  if (id === "low-budget-rejected") {
    const request = clone(protocol);
    request.method.optimizer.maxEvaluations = 32;
    const facts = solveGroundState(request);
    const output = validate(request, facts, id);
    return {
      passed:
        facts.groundStateResult.converged === false &&
        observation(output, "vqe.converged")?.status === "fail" &&
        observation(output, "optimizer.trace-replayed")?.status === "pass",
      observed: {
        converged: facts.groundStateResult.converged,
        acceptanceConvergence: observation(output, "vqe.converged")?.status,
      },
    };
  }
  if (id === "out-of-scope-rejected") {
    const qaoa = clone(protocol);
    qaoa.method.algorithm = "qaoa";
    const wrongUnit = clone(protocol);
    wrongUnit.hamiltonian.coefficientUnit = "electronvolt";
    const yPauli = clone(protocol);
    yPauli.hamiltonian.terms.find((term) => term.pauli === "XX").pauli = "YY";
    const leakage = clone(protocol);
    leakage.hamiltonian.terms.push({ pauli: "XI", coefficient: 0.1 });
    const codes = {
      qaoa: expectInputCode(qaoa, "INVALID_REQUEST"),
      wrongUnit: expectInputCode(wrongUnit, "INVALID_REQUEST"),
      yPauli: expectInputCode(yPauli, "UNSUPPORTED_PAULI"),
      sectorLeakage: expectInputCode(leakage, "SECTOR_LEAKAGE"),
    };
    return { passed: Object.values(codes).every(Boolean), observed: codes };
  }
  if (id === "metamorphic-invariants") {
    const base = solveGroundState(protocol);
    const shiftedRequest = clone(protocol);
    shiftedRequest.requestId = "qgs-eval-shifted";
    shiftedRequest.hamiltonian.terms.find((term) => term.pauli === "II").coefficient += 0.25;
    const shifted = solveGroundState(shiftedRequest);
    const permutedRequest = clone(protocol);
    permutedRequest.requestId = "qgs-eval-permuted";
    permutedRequest.hamiltonian.terms.reverse();
    const permuted = solveGroundState(permutedRequest);
    const observed = {
      energyShiftHartree:
        shifted.groundStateResult.energyHartree - base.groundStateResult.energyHartree,
      digestInvariant:
        permuted.hamiltonianManifest.hamiltonianDigest ===
        base.hamiltonianManifest.hamiltonianDigest,
      energyInvariant:
        permuted.groundStateResult.energyHartree === base.groundStateResult.energyHartree,
    };
    return {
      passed:
        closeTo(observed.energyShiftHartree, 0.25) &&
        observed.digestInvariant &&
        observed.energyInvariant,
      observed,
    };
  }
  if (id === "tamper-resistance") {
    const stateTamper = solveGroundState(protocol);
    stateTamper.groundStateResult.statevectorReal[1] += 1e-6;
    const traceTamper = solveGroundState(protocol);
    traceTamper.convergenceTrace.entries[1].energyHartree += 0.1;
    const matrixTamper = solveGroundState(protocol);
    matrixTamper.hamiltonianManifest.matrix[0][1] = 0.1;
    const digestTamper = solveGroundState(protocol);
    digestTamper.exactReference.hamiltonianDigest = "0".repeat(64);
    const nonFinite = solveGroundState(protocol);
    nonFinite.groundStateResult.energyHartree = Number.POSITIVE_INFINITY;
    const observed = {
      state:
        observation(validate(protocol, stateTamper, `${id}-state`), "result.ansatz-replayed")
          ?.status === "fail",
      trace:
        observation(validate(protocol, traceTamper, `${id}-trace`), "optimizer.trace-replayed")
          ?.status === "fail",
      matrix:
        observation(validate(protocol, matrixTamper, `${id}-matrix`), "hamiltonian.hermitian")
          ?.status === "fail",
      digest:
        observation(validate(protocol, digestTamper, `${id}-digest`), "provenance.complete")
          ?.status === "fail",
      nonFinite:
        observation(validate(protocol, nonFinite, `${id}-finite`), "result.finite-hartree")
          ?.status === "fail",
    };
    return { passed: Object.values(observed).every(Boolean), observed };
  }
  return { passed: false, observed: { error: `Unknown eval case ${id}` } };
}

export function runEvaluationSuite() {
  const suite = readJson("evals/suite.json");
  const cases = suite.cases.map((definition) => ({
    id: definition.id,
    ...evaluateCase(definition.id),
  }));
  const passedWeight = suite.cases.reduce(
    (total, definition) =>
      total + (cases.find((item) => item.id === definition.id)?.passed ? definition.weight : 0),
    0,
  );
  const totalWeight = suite.cases.reduce((total, definition) => total + definition.weight, 0);
  const hardGatePassed = suite.cases.every(
    (definition) =>
      !definition.hardGate || cases.find((item) => item.id === definition.id)?.passed,
  );
  return {
    schemaVersion: "1.0",
    evaluationSuite: { id: suite.id, version: suite.version },
    generatedAt: "2026-08-14T00:00:00.000Z",
    cases,
    scorePercent: (100 * passedWeight) / totalWeight,
    hardGatePassed,
  };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const report = runEvaluationSuite();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.hardGatePassed) process.exitCode = 1;
}
