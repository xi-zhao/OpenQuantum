#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  REPLAY_TOLERANCE,
  STRUCTURAL_TOLERANCE,
  complexDistance,
  computeReferenceAnalysis,
  normalizeAuditRequest,
  numericDistance,
} from "./state-math.mjs";

function observation(id, status, metric, threshold, detail) {
  const result = { id, status, detail };
  if (metric !== undefined) result.metric = metric;
  if (threshold !== undefined) result.threshold = threshold;
  return result;
}

function maximumDistance(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return Number.POSITIVE_INFINITY;
  }
  return left.reduce(
    (maximum, value, index) => Math.max(maximum, numericDistance(value, right[index])),
    0,
  );
}

export function validateStateAnalysis({ request: requestValue, analysis }) {
  const request = normalizeAuditRequest(requestValue);
  const reference = computeReferenceAnalysis(request);
  const state = analysis?.state ?? {};
  const transpose = analysis?.partialTranspose ?? {};
  const traceError = complexDistance(state.trace, reference.state.trace);
  const purityError = complexDistance(state.purity, reference.state.purity);
  const transposeTraceError = complexDistance(
    transpose.trace,
    reference.partialTranspose.trace,
  );
  const transposeSpectrumError = maximumDistance(
    transpose.eigenvalues,
    reference.partialTranspose.eigenvalues,
  );
  const negativityError = numericDistance(
    transpose.negativity,
    reference.partialTranspose.negativity,
  );
  const stateHermiticityReplayError = numericDistance(
    state.hermiticityResidual,
    reference.state.hermiticityResidual,
  );
  const stateMinimumEigenvalueReplayError = numericDistance(
    state.hermitianPartMinimumEigenvalue,
    reference.state.hermitianPartMinimumEigenvalue,
  );
  const stateRankReplayError =
    state.numericalRank === reference.state.numericalRank ? 0 : 1;
  const transposeHermiticityReplayError = numericDistance(
    transpose.hermiticityResidual,
    reference.partialTranspose.hermiticityResidual,
  );
  const transposeMinimumEigenvalueReplayError = numericDistance(
    transpose.minimumEigenvalue,
    reference.partialTranspose.minimumEigenvalue,
  );
  const transposeSubsystemsMatch =
    JSON.stringify(transpose.subsystems) ===
    JSON.stringify(reference.partialTranspose.subsystems);
  const digestMatches = analysis?.requestDigest === reference.requestDigest;
  const toqitoDensityMatches = state.toqitoDensity === reference.state.densityByReplayedCriteria;
  const observations = [
    observation("request.scope", "pass", 0, 0, "Request is inside the bounded multipartite density-matrix audit scope."),
    observation(
      "state.digest",
      digestMatches ? "pass" : "fail",
      digestMatches ? 0 : 1,
      0,
      "Canonical request digest was independently replayed.",
    ),
    observation(
      "state.hermitian",
      Math.max(reference.state.hermiticityResidual, stateHermiticityReplayError) <=
        STRUCTURAL_TOLERANCE
        ? "pass"
        : "fail",
      Math.max(reference.state.hermiticityResidual, stateHermiticityReplayError),
      STRUCTURAL_TOLERANCE,
      "Hermiticity was independently recomputed from the supplied matrix.",
    ),
    observation(
      "state.trace-one",
      Math.hypot(reference.state.trace.real - 1, reference.state.trace.imag) <=
        STRUCTURAL_TOLERANCE
        ? "pass"
        : "fail",
      Math.hypot(reference.state.trace.real - 1, reference.state.trace.imag),
      STRUCTURAL_TOLERANCE,
      "Unit trace was independently recomputed.",
    ),
    observation(
      "state.positive-semidefinite",
      Math.max(
        Math.max(0, -reference.state.hermitianPartMinimumEigenvalue),
        stateMinimumEigenvalueReplayError,
      ) <= STRUCTURAL_TOLERANCE
        ? "pass"
        : "fail",
      Math.max(
        Math.max(0, -reference.state.hermitianPartMinimumEigenvalue),
        stateMinimumEigenvalueReplayError,
      ),
      STRUCTURAL_TOLERANCE,
      "The Hermitian-part minimum eigenvalue was independently recomputed.",
    ),
    observation(
      "state.toqito-density",
      toqitoDensityMatches ? "pass" : "fail",
      toqitoDensityMatches ? 0 : 1,
      0,
      "toqito is_density agrees with the independent physical-state criteria.",
    ),
    observation(
      "state.purity-replayed",
      Math.max(traceError, purityError, stateRankReplayError) <= REPLAY_TOLERANCE
        ? "pass"
        : "fail",
      Math.max(traceError, purityError, stateRankReplayError),
      REPLAY_TOLERANCE,
      "State trace and purity were independently replayed.",
    ),
    observation(
      "partial-transpose.replayed",
      Math.max(
        transposeTraceError,
        transposeSpectrumError,
        transposeHermiticityReplayError,
        transposeMinimumEigenvalueReplayError,
        transposeSubsystemsMatch ? 0 : 1,
      ) <= REPLAY_TOLERANCE
        ? "pass"
        : "fail",
      Math.max(
        transposeTraceError,
        transposeSpectrumError,
        transposeHermiticityReplayError,
        transposeMinimumEigenvalueReplayError,
        transposeSubsystemsMatch ? 0 : 1,
      ),
      REPLAY_TOLERANCE,
      "Partial-transpose trace and complete spectrum were independently replayed.",
    ),
    observation(
      "negativity.replayed",
      negativityError <= REPLAY_TOLERANCE ? "pass" : "fail",
      negativityError,
      REPLAY_TOLERANCE,
      "Negativity was independently recomputed from the partial-transpose spectrum.",
    ),
    observation(
      "provenance.complete",
      "not_checked",
      undefined,
      undefined,
      "The MCP call does not materialize a Result Package or verify Session Event Log provenance.",
    ),
  ];
  return {
    schemaVersion: "1.0",
    profile: { id: "density-matrix-audit", version: "1.0.0" },
    scopeMatch: { status: "in_scope" },
    observations,
  };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    const input = JSON.parse(fs.readFileSync(0, "utf8"));
    process.stdout.write(`${JSON.stringify(validateStateAnalysis(input), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
