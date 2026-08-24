#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

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

function materializedEvidence(resultPackage) {
  const value = resultPackage?.value;
  const input = value?.inputs?.[0];
  const artifacts = new Map(
    (value?.artifacts ?? []).map((artifact) => [artifact.type, artifact]),
  );
  const inputRefs = input ? [{ kind: "input", id: input.id }] : [];
  const artifactRefs = (...types) =>
    types
      .map((type) => artifacts.get(type))
      .filter(Boolean)
      .map((artifact) => ({ kind: "artifact", id: artifact.id }));
  return { input, artifacts, inputRefs, artifactRefs };
}

/**
 * Rerun the density-matrix Validator after Harness has materialized and loaded
 * the exact Result Package bytes. This is the only QI path allowed to turn
 * provenance.complete into a checked observation for central Acceptance.
 */
export function validateMaterializedStateAnalysis({
  request,
  analysis,
  computationalValidation,
  resultPackage,
  profile,
}) {
  const computational = validateStateAnalysis({ request, analysis });
  const evidence = materializedEvidence(resultPackage);
  const expectedIds = computational.observations.map((item) => item.id);
  const profileIds = profile?.checks?.map((item) => item.id);
  if (!isDeepStrictEqual(profileIds, expectedIds)) {
    throw new Error(
      "Density-matrix Validator and Acceptance Profile check ids differ",
    );
  }

  const analysisRefs = evidence.artifactRefs("state-analysis");
  const allArtifactRefs = evidence.artifactRefs(
    "state-analysis",
    "validation-bundle",
  );
  const provenanceChecks = {
    loadedResultPackage:
      resultPackage?.kind === "openquantum-result-package-v1.1",
    capabilityMatches:
      resultPackage?.value?.capability?.id === "quantum-information-audit",
    oneInput:
      resultPackage?.value?.inputs?.length === 1 && Boolean(evidence.input),
    requiredArtifacts:
      resultPackage?.value?.artifacts?.length === 2 &&
      evidence.artifacts.has("state-analysis") &&
      evidence.artifacts.has("validation-bundle"),
    packageVersionMatches: analysis?.packageVersion === "1.3.1",
    validationBundleMatches: isDeepStrictEqual(
      computationalValidation,
      computational,
    ),
    executionBound:
      typeof resultPackage?.value?.executionRef?.sessionId === "string" &&
      resultPackage.value.executionRef.sessionId.length > 0,
  };
  const provenanceComplete = Object.values(provenanceChecks).every(Boolean);

  const observations = computational.observations.map((item) => {
    if (item.id === "provenance.complete") {
      return {
        id: item.id,
        status: provenanceComplete ? "pass" : "fail",
        observed: provenanceChecks,
        evidenceRefs: [...evidence.inputRefs, ...allArtifactRefs],
        ...(!provenanceComplete
          ? {
              nextAction:
                "Regenerate the Harness Result Package with one input, both declared artifacts and a valid Session event range.",
            }
          : {}),
      };
    }
    const evidenceRefs =
      item.id === "request.scope"
        ? evidence.inputRefs
        : item.id === "state.digest"
          ? [...evidence.inputRefs, ...analysisRefs]
          : analysisRefs;
    return {
      id: item.id,
      status: item.status,
      observed: {
        ...(item.metric !== undefined ? { metric: item.metric } : {}),
        detail: item.detail,
      },
      evidenceRefs,
      ...(item.status !== "pass"
        ? {
            nextAction:
              `Inspect the materialized request and state-analysis artifact, then rerun ${item.id}.`,
          }
        : {}),
    };
  });

  return {
    scopeMatch: {
      status: computational.scopeMatch.status,
      statement:
        "The supplied matrix matches the bounded multipartite density-matrix audit scope.",
      evidenceRefs: evidence.inputRefs,
    },
    observations,
    limitations: [
      "This is a bounded local numerical audit of a supplied density matrix, not state tomography or experimental validation.",
      "Partial-transpose negativity supports only the selected bipartition and is not a universal entanglement classification.",
      "No cloud service or physical quantum hardware was used.",
    ],
    statement:
      "Pinned toqito facts were materialized by Harness and independently replayed against the persisted request and artifacts.",
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
