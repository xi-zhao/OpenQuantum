import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { computeReferenceAnalysis } from "../validators/state-math.mjs";
import { validateStateAnalysis } from "../validators/validate-state-analysis.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(skillRoot, relativePath), "utf8"));
}

function bellRequest() {
  return {
    matrixReal: [
      [0.5, 0, 0, 0.5],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0.5, 0, 0, 0.5],
    ],
    subsystemDimensions: [2, 2],
    transposeSubsystems: [0],
  };
}

function mixedRequest() {
  return {
    matrixReal: Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 4 }, (_, column) => (row === column ? 0.25 : 0)),
    ),
    subsystemDimensions: [2, 2],
    transposeSubsystems: [1],
  };
}

function toolAnalysis(request, overrides = {}) {
  const reference = computeReferenceAnalysis(request);
  return {
    ...reference,
    packageVersion: "1.3.1",
    state: {
      ...reference.state,
      toqitoDensity: reference.state.densityByReplayedCriteria,
      ...overrides.state,
    },
    partialTranspose: {
      ...reference.partialTranspose,
      ...overrides.partialTranspose,
    },
  };
}

function status(output, id) {
  return output.observations.find((item) => item.id === id)?.status;
}

function completedObservationsPass(output) {
  return output.observations.every(
    (item) => item.id === "provenance.complete" ? item.status === "not_checked" : item.status === "pass",
  );
}

function evaluateCase(id) {
  if (id === "bell-state-replayed") {
    const request = bellRequest();
    const analysis = toolAnalysis(request);
    const output = validateStateAnalysis({ request, analysis });
    return {
      passed:
        completedObservationsPass(output) &&
        Math.abs(analysis.partialTranspose.negativity - 0.5) <= 1e-12,
      observed: {
        negativity: analysis.partialTranspose.negativity,
        provenance: status(output, "provenance.complete"),
      },
    };
  }
  if (id === "maximally-mixed-replayed") {
    const request = mixedRequest();
    const analysis = toolAnalysis(request);
    const output = validateStateAnalysis({ request, analysis });
    return {
      passed:
        completedObservationsPass(output) &&
        Math.abs(analysis.state.purity.real - 0.25) <= 1e-12 &&
        analysis.partialTranspose.negativity === 0,
      observed: {
        purity: analysis.state.purity.real,
        negativity: analysis.partialTranspose.negativity,
      },
    };
  }
  if (id === "non-density-detected") {
    const request = mixedRequest();
    request.matrixReal[0][0] = 1.25;
    const output = validateStateAnalysis({ request, analysis: toolAnalysis(request) });
    return {
      passed:
        status(output, "state.trace-one") === "fail" &&
        status(output, "state.toqito-density") === "pass",
      observed: {
        trace: status(output, "state.trace-one"),
        upstreamAgreement: status(output, "state.toqito-density"),
      },
    };
  }
  if (id === "tampered-analysis-detected") {
    const request = bellRequest();
    const analysis = toolAnalysis(request, {
      state: {
        hermiticityResidual: 0.25,
        hermitianPartMinimumEigenvalue: -0.25,
        numericalRank: 4,
      },
      partialTranspose: { negativity: 0.25 },
    });
    const output = validateStateAnalysis({ request, analysis });
    return {
      passed:
        status(output, "state.hermitian") === "fail" &&
        status(output, "state.positive-semidefinite") === "fail" &&
        status(output, "state.purity-replayed") === "fail" &&
        status(output, "negativity.replayed") === "fail",
      observed: {
        hermiticityReplay: status(output, "state.hermitian"),
        eigenvalueReplay: status(output, "state.positive-semidefinite"),
        rankReplay: status(output, "state.purity-replayed"),
        negativityReplay: status(output, "negativity.replayed"),
      },
    };
  }
  if (id === "out-of-scope-rejected") {
    let rejected = false;
    try {
      computeReferenceAnalysis({
        matrixReal: [[1, 0], [0, 0]],
        subsystemDimensions: [2],
        transposeSubsystems: [0],
      });
    } catch (error) {
      rejected = error instanceof TypeError;
    }
    return { passed: rejected, observed: { rejected } };
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
    generatedAt: "2026-08-24T00:00:00.000Z",
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
