import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  BASIS_ORDER,
  angularResidual,
  canonicalizeRequestIndependently,
  eigenResidual,
  exactTwoByTwo,
  expectationFromMatrix,
  expectationFromTerms,
  hamiltonianScale,
  hermiticityResidual,
  matrixMaximumDifference,
  reconstructHamiltonian,
  relativeResidual,
  rerunOptimizerIndependently,
  sectorLeakage,
  sectorMatrix,
  stateFromAnsatz,
  vectorNormSquared,
} from "./lib/independent-science.mjs";

const FACT_TYPES = Object.freeze({
  problemSpec: "problem-spec",
  hamiltonianManifest: "hamiltonian-manifest",
  exactReference: "exact-reference",
  groundStateResult: "ground-state-result",
  convergenceTrace: "convergence-trace",
  resourceEstimate: "resource-estimate",
});

const CHECK_IDS = Object.freeze([
  "request.scope",
  "hamiltonian.canonical",
  "hamiltonian.hermitian",
  "sector.invariant",
  "reference.recomputed",
  "reference.eigen-residual",
  "result.finite-hartree",
  "result.state-normalized",
  "result.ansatz-replayed",
  "result.expectation-replayed",
  "vqe.variational-bound",
  "vqe.energy-accuracy",
  "vqe.converged",
  "optimizer.trace-replayed",
  "resources.within-budget",
  "provenance.complete",
]);

const DEFAULT_LIMITATIONS = Object.freeze([
  "Only the declared fixed-hamming-weight=1 sector is checked.",
  "The supplied Pauli Hamiltonian is not derived or validated from molecular geometry.",
  "Noise, finite shots, physical hardware, excited states, and QAOA are outside this validator.",
]);

const EMITTABLE_OBSERVATION_STATUSES = new Set(["pass", "fail", "not_checked"]);

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function safeObserved(value) {
  if (typeof value === "number") return finiteOrNull(value);
  if (Array.isArray(value)) return value.map(safeObserved);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, safeObserved(item)]),
    );
  }
  return value;
}

function containsOnlyFiniteNumbers(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(containsOnlyFiniteNumbers);
  if (value !== null && typeof value === "object") {
    return Object.values(value).every(containsOnlyFiniteNumbers);
  }
  return true;
}

function maximum(values) {
  return values.every(Number.isFinite) ? Math.max(...values) : Number.POSITIVE_INFINITY;
}

function profileChecks(profile) {
  if (!profile || !Array.isArray(profile.checks)) {
    throw new Error("Validator requires a loaded Acceptance Profile");
  }
  const definitions = new Map(profile.checks.map((check) => [check.id, check]));
  const ids = [...definitions.keys()];
  if (
    ids.length !== CHECK_IDS.length ||
    CHECK_IDS.some((id) => !definitions.has(id))
  ) {
    throw new Error(
      `Validator and Acceptance Profile check ids differ: expected ${CHECK_IDS.join(", ")}`,
    );
  }
  for (const id of [
    "hamiltonian.hermitian",
    "sector.invariant",
    "reference.recomputed",
    "reference.eigen-residual",
    "result.state-normalized",
    "result.ansatz-replayed",
    "result.expectation-replayed",
    "vqe.variational-bound",
    "vqe.energy-accuracy",
    "vqe.converged",
    "optimizer.trace-replayed",
    "resources.within-budget",
  ]) {
    if (!Number.isFinite(definitions.get(id)?.threshold)) {
      throw new Error(`Acceptance Profile check ${id} must define a finite threshold`);
    }
  }
  return definitions;
}

function evidenceFactory(resultPackage) {
  const value = resultPackage?.value;
  const input = value?.inputs?.[0];
  const artifacts = new Map();
  for (const reference of value?.artifacts ?? []) {
    if (!artifacts.has(reference.type)) artifacts.set(reference.type, reference);
  }
  const inputRef = () => (input ? [{ kind: "input", id: input.id }] : []);
  const artifactRefs = (...types) =>
    types
      .map((type) => artifacts.get(type))
      .filter(Boolean)
      .map((reference) => ({ kind: "artifact", id: reference.id }));
  return { input, artifacts, inputRef, artifactRefs };
}

function inlineEvidenceFactory(facts) {
  const input = { id: "inline-ground-state-request" };
  const artifacts = new Map(
    Object.entries(FACT_TYPES)
      .filter(([key, type]) => facts?.[key]?.artifactType === type)
      .map(([, type]) => [type, { id: `inline-${type}` }]),
  );
  const inputRef = () => [{ kind: "input", id: input.id }];
  const artifactRefs = (...types) =>
    types
      .map((type) => artifacts.get(type))
      .filter(Boolean)
      .map((reference) => ({ kind: "artifact", id: reference.id }));
  return { input, artifacts, inputRef, artifactRefs };
}

function makeObservation({ id, passed, status, observed, evidenceRefs, nextAction }) {
  const resolvedStatus = status ?? (passed ? "pass" : "fail");
  if (!EMITTABLE_OBSERVATION_STATUSES.has(resolvedStatus)) {
    throw new Error(`Unsupported observation status ${String(resolvedStatus)} for ${id}`);
  }
  return {
    id,
    status: resolvedStatus,
    observed: safeObserved(observed),
    evidenceRefs,
    ...(resolvedStatus !== "pass"
      ? {
          nextAction:
            nextAction ?? `Regenerate the result package and rerun validator check ${id}.`,
        }
      : {}),
  };
}

function canonicalFactConsistency(canonical, request, facts) {
  if (!canonical.inScope) return false;
  const problem = facts.problemSpec;
  const manifest = facts.hamiltonianManifest;
  return (
    problem?.requestId === canonical.normalized.requestId &&
    problem?.requestDigest === canonical.requestDigest &&
    problem?.claim === canonical.normalized.claim &&
    isDeepStrictEqual(problem?.system, canonical.normalized.system) &&
    isDeepStrictEqual(problem?.method, canonical.normalized.method) &&
    isDeepStrictEqual(problem?.acceptanceProfile, canonical.normalized.acceptanceProfile) &&
    problem?.hamiltonianDigest === canonical.hamiltonianDigest &&
    manifest?.hamiltonianDigest === canonical.hamiltonianDigest &&
    manifest?.format === canonical.hamiltonian.format &&
    manifest?.qubitCount === 2 &&
    manifest?.qubitOrder === canonical.hamiltonian.qubitOrder &&
    isDeepStrictEqual(manifest?.basisOrder, BASIS_ORDER) &&
    manifest?.coefficientUnit === "hartree" &&
    isDeepStrictEqual(manifest?.terms, canonical.hamiltonian.terms) &&
    request.acceptanceProfile.id === problem?.acceptanceProfile?.id
  );
}

function replayAnsatz(result) {
  const actual = result?.statevectorReal;
  const theta = result?.optimalThetaRadians;
  if (
    !Array.isArray(actual) ||
    actual.length !== 4 ||
    actual.some((value) => !Number.isFinite(value)) ||
    !Number.isFinite(theta)
  ) {
    return {
      outsideSectorProbability: Number.POSITIVE_INFINITY,
      infidelity: Number.POSITIVE_INFINITY,
      maximumAmplitudeResidual: Number.POSITIVE_INFINITY,
      metric: Number.POSITIVE_INFINITY,
    };
  }
  const expected = stateFromAnsatz(theta);
  const norm = vectorNormSquared(actual);
  const overlap = actual.reduce((sum, amplitude, index) => sum + amplitude * expected[index], 0);
  const fidelity = norm > 0 ? Math.min(1, (overlap * overlap) / norm) : 0;
  const phase = overlap < 0 ? -1 : 1;
  const maximumAmplitudeResidual = Math.max(
    ...actual.map((amplitude, index) => Math.abs(amplitude - phase * expected[index])),
  );
  const outsideSectorProbability =
    norm > 0 ? (actual[0] * actual[0] + actual[3] * actual[3]) / norm : 1;
  const infidelity = Math.max(0, 1 - fidelity);
  return {
    outsideSectorProbability,
    infidelity,
    maximumAmplitudeResidual,
    metric: Math.max(outsideSectorProbability, infidelity, maximumAmplitudeResidual),
  };
}

function replayOptimizer(canonical, facts, scale) {
  const trace = facts.convergenceTrace;
  const result = facts.groundStateResult;
  const entries = Array.isArray(trace?.entries) ? trace.entries : [];
  const expected = canonical.inScope
    ? rerunOptimizerIndependently(
        canonical.hamiltonian.terms,
        canonical.normalized.method.optimizer,
      )
    : undefined;
  let structurallyConsistent = Boolean(expected);
  let maximumNormalizedEnergyResidual = 0;
  let maximumAngularResidual = 0;
  let previousBest = Number.POSITIVE_INFINITY;

  if (!expected || entries.length !== expected.trace.length) structurallyConsistent = false;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const expectedEntry = expected?.trace[index];
    if (
      entry?.evaluation !== index + 1 ||
      !["coarse", "refine", "final"].includes(entry?.phase) ||
      !Number.isFinite(entry?.thetaRadians) ||
      !Number.isFinite(entry?.energyHartree) ||
      !Number.isFinite(entry?.bestEnergyHartree) ||
      entry.bestEnergyHartree > previousBest
    ) {
      structurallyConsistent = false;
    }
    previousBest = Math.min(previousBest, entry?.bestEnergyHartree ?? previousBest);
    if (!expectedEntry) continue;
    if (entry.phase !== expectedEntry.phase) structurallyConsistent = false;
    maximumAngularResidual = Math.max(
      maximumAngularResidual,
      angularResidual(entry.thetaRadians, expectedEntry.thetaRadians),
    );
    const replayedAtActualTheta = expectationFromTerms(
      canonical.hamiltonian.terms,
      stateFromAnsatz(entry.thetaRadians),
    );
    maximumNormalizedEnergyResidual = Math.max(
      maximumNormalizedEnergyResidual,
      relativeResidual(entry.energyHartree, expectedEntry.energyHartree, scale),
      relativeResidual(entry.energyHartree, replayedAtActualTheta, scale),
      relativeResidual(entry.bestEnergyHartree, expectedEntry.bestEnergyHartree, scale),
    );
  }

  const coarseEntries = entries.filter((entry) => entry?.phase === "coarse");
  const periodicKeys = new Set(
    coarseEntries.map((entry) => {
      const wrapped = Math.atan2(Math.sin(entry.thetaRadians), Math.cos(entry.thetaRadians));
      const normalized = wrapped === Math.PI ? -Math.PI : wrapped;
      return normalized.toPrecision(15);
    }),
  );
  const fullCoarseGrid = expected?.coarsePointsEvaluated === 64;
  if (fullCoarseGrid && (coarseEntries.length !== 64 || periodicKeys.size !== 64)) {
    structurallyConsistent = false;
  }
  if (!fullCoarseGrid && coarseEntries.length !== expected?.coarsePointsEvaluated) {
    structurallyConsistent = false;
  }

  if (expected) {
    if (
      trace?.coarsePointsEvaluated !== expected.coarsePointsEvaluated ||
      trace?.refinementEvaluations !== expected.refinementEvaluations ||
      trace?.finalBracketWidthRadians !== expected.finalBracketWidthRadians ||
      trace?.bestThetaRadians !== expected.best?.thetaRadians ||
      trace?.optimizer?.id !== canonical.normalized.method.optimizer.id ||
      trace?.optimizer?.version !== canonical.normalized.method.optimizer.version ||
      trace?.optimizer?.coarsePointsRequested !== canonical.normalized.method.optimizer.coarsePoints ||
      trace?.optimizer?.angleToleranceRadians !==
        canonical.normalized.method.optimizer.angleToleranceRadians ||
      trace?.optimizer?.maxEvaluations !== canonical.normalized.method.optimizer.maxEvaluations ||
      result?.converged !== expected.converged ||
      result?.terminationReason !== expected.terminationReason ||
      result?.evaluationCount !== expected.trace.length ||
      result?.optimalThetaRadians !== expected.best?.thetaRadians
    ) {
      structurallyConsistent = false;
    }
    maximumNormalizedEnergyResidual = Math.max(
      maximumNormalizedEnergyResidual,
      relativeResidual(trace?.bestEnergyHartree, expected.best?.energyHartree, scale),
      relativeResidual(result?.energyHartree, expected.best?.energyHartree, scale),
    );
    maximumAngularResidual = Math.max(
      maximumAngularResidual,
      angularResidual(trace?.bestThetaRadians, expected.best?.thetaRadians),
      angularResidual(result?.optimalThetaRadians, expected.best?.thetaRadians),
    );
  }
  if (maximumAngularResidual !== 0) structurallyConsistent = false;
  return {
    structurallyConsistent,
    maximumNormalizedEnergyResidual,
    maximumAngularResidual,
    evaluationCount: entries.length,
    uniquePeriodicCoarseNodes: periodicKeys.size,
    independentRerunConverged: expected?.converged ?? false,
  };
}

function provenanceState(resultPackage, request, facts, canonical, evidence) {
  const value = resultPackage?.value;
  const expectedTypes = Object.values(FACT_TYPES);
  const typeCounts = new Map(
    expectedTypes.map((type) => [
      type,
      (value?.artifacts ?? []).filter((reference) => reference.type === type).length,
    ]),
  );
  const commonDigest = canonical.hamiltonianDigest;
  const artifactDigestsMatch = Object.values(facts).every(
    (fact) => fact?.hamiltonianDigest === commonDigest,
  );
  const artifactTypesMatch = Object.entries(FACT_TYPES).every(
    ([key, type]) => facts[key]?.artifactType === type,
  );
  const refsComplete =
    value?.inputs?.length === 1 &&
    expectedTypes.every((type) => typeCounts.get(type) === 1) &&
    value.artifacts.length === expectedTypes.length;
  const digestsPresent = [...(value?.inputs ?? []), ...(value?.artifacts ?? [])].every(
    (reference) => /^[a-f0-9]{64}$/.test(reference?.sha256 ?? ""),
  );
  const packageIdentityPresent =
    resultPackage?.kind === "openquantum-result-package-v1.1" &&
    value?.schemaVersion === "1.1" &&
    value?.capability?.id === "quantum-ground-state" &&
    value?.capability?.version === "0.2.0" &&
    typeof value?.executionRef?.sessionId === "string" &&
    value.executionRef.sessionId.length > 0 &&
    Number.isSafeInteger(value?.executionRef?.eventRange?.from) &&
    Number.isSafeInteger(value?.executionRef?.eventRange?.to) &&
    value.executionRef.eventRange.from <= value.executionRef.eventRange.to;
  const profileMatches =
    value?.acceptanceProfile?.id === request?.acceptanceProfile?.id &&
    value?.acceptanceProfile?.version === request?.acceptanceProfile?.version &&
    /^[a-f0-9]{64}$/.test(value?.acceptanceProfile?.sha256 ?? "");
  const versionedDigestsValid = (items) =>
    items.every(
      (item) =>
        typeof item?.id === "string" &&
        item.id.length > 0 &&
        typeof item?.version === "string" &&
        item.version.length > 0 &&
        /^[a-f0-9]{64}$/.test(item?.digest ?? ""),
    );
  const provenancePresent =
    Array.isArray(value?.provenance?.tools) &&
    value.provenance.tools.length > 0 &&
    versionedDigestsValid(value.provenance.tools) &&
    Array.isArray(value?.provenance?.environment) &&
    value.provenance.environment.length > 0 &&
    versionedDigestsValid(value.provenance.environment) &&
    Array.isArray(value?.provenance?.dependencies) &&
    value.provenance.dependencies.every(
      (dependency) =>
        typeof dependency?.id === "string" &&
        typeof dependency?.kind === "string" &&
        typeof dependency?.version === "string" &&
        /^[a-f0-9]{64}$/.test(dependency?.digest ?? ""),
    );
  const requestDigestMatches = facts.problemSpec?.requestDigest === canonical.requestDigest;
  const evidenceComplete =
    Boolean(evidence.input) && expectedTypes.every((type) => evidence.artifacts.has(type));
  const complete =
    canonical.inScope &&
    artifactDigestsMatch &&
    artifactTypesMatch &&
    refsComplete &&
    digestsPresent &&
    packageIdentityPresent &&
    profileMatches &&
    provenancePresent &&
    requestDigestMatches &&
    evidenceComplete;
  return {
    complete,
    artifactDigestsMatch,
    artifactTypesMatch,
    refsComplete,
    digestsPresent,
    packageIdentityPresent,
    profileMatches,
    provenancePresent,
    requestDigestMatches,
  };
}

function evaluateGroundStateFacts({
  resultPackage,
  profile,
  request,
  facts,
  evidence,
  provenanceMode,
}) {
  const definitions = profileChecks(profile);
  const canonical = canonicalizeRequestIndependently(request);
  const scale = canonical.inScope
    ? hamiltonianScale(canonical.hamiltonian.terms)
    : Number.POSITIVE_INFINITY;
  const matrix = canonical.inScope
    ? reconstructHamiltonian(canonical.hamiltonian.terms)
    : Array.from({ length: 4 }, () => Array(4).fill(Number.NaN));
  const reducedMatrix = sectorMatrix(matrix);
  const exact = canonical.inScope ? exactTwoByTwo(reducedMatrix) : undefined;
  const manifest = facts.hamiltonianManifest;
  const reference = facts.exactReference;
  const result = facts.groundStateResult;
  const trace = facts.convergenceTrace;
  const resources = facts.resourceEstimate;
  const observations = new Map();

  const scopeMismatches = [...canonical.mismatches];
  if (
    canonical.inScope &&
    hermiticityResidual(matrix) / scale >
      definitions.get("hamiltonian.hermitian").threshold
  ) {
    scopeMismatches.push("non-Hermitian Hamiltonian");
  }
  if (
    canonical.inScope &&
    sectorLeakage(matrix) / scale > definitions.get("sector.invariant").threshold
  ) {
    scopeMismatches.push("Hamiltonian does not preserve the declared sector");
  }
  const scopePassed = canonical.inScope && scopeMismatches.length === 0;
  observations.set(
    "request.scope",
    makeObservation({
      id: "request.scope",
      passed: scopePassed,
      observed: { inScope: scopePassed, mismatches: scopeMismatches },
      evidenceRefs: evidence.inputRef(),
      nextAction: "Submit a supplied two-qubit real Pauli Hamiltonian in the declared VQE scope.",
    }),
  );

  const canonicalFactsMatch =
    canonicalFactConsistency(canonical, request, facts) &&
    matrixMaximumDifference(manifest?.matrix, matrix) === 0 &&
    matrixMaximumDifference(manifest?.sector?.matrix, reducedMatrix) === 0;
  observations.set(
    "hamiltonian.canonical",
    makeObservation({
      id: "hamiltonian.canonical",
      passed: canonicalFactsMatch,
      observed: {
        canonicalFactsMatch,
        requestDigest: canonical.requestDigest ?? null,
        hamiltonianDigest: canonical.hamiltonianDigest ?? null,
      },
      evidenceRefs: [
        ...evidence.inputRef(),
        ...evidence.artifactRefs("problem-spec", "hamiltonian-manifest"),
      ],
    }),
  );

  const reconstructedHermiticity = hermiticityResidual(matrix);
  const artifactHermiticity = hermiticityResidual(manifest?.matrix ?? []);
  const normalizedHermiticity = maximum([
    reconstructedHermiticity / scale,
    artifactHermiticity / scale,
    relativeResidual(manifest?.hermiticityResidualHartree, reconstructedHermiticity, scale),
  ]);
  observations.set(
    "hamiltonian.hermitian",
    makeObservation({
      id: "hamiltonian.hermitian",
      passed:
        Number.isFinite(normalizedHermiticity) &&
        normalizedHermiticity <= definitions.get("hamiltonian.hermitian").threshold,
      observed: {
        normalizedResidual: normalizedHermiticity,
        scaleHartree: scale,
      },
      evidenceRefs: evidence.artifactRefs("hamiltonian-manifest"),
    }),
  );

  const reconstructedLeakage = sectorLeakage(matrix);
  const artifactLeakage = sectorLeakage(manifest?.matrix ?? []);
  const normalizedLeakage = maximum([
    reconstructedLeakage / scale,
    artifactLeakage / scale,
    relativeResidual(manifest?.sectorLeakageHartree, reconstructedLeakage, scale),
  ]);
  observations.set(
    "sector.invariant",
    makeObservation({
      id: "sector.invariant",
      passed:
        Number.isFinite(normalizedLeakage) &&
        normalizedLeakage <= definitions.get("sector.invariant").threshold,
      observed: { normalizedResidual: normalizedLeakage, scaleHartree: scale },
      evidenceRefs: evidence.artifactRefs("hamiltonian-manifest"),
    }),
  );

  const referenceMetric = maximum([
    relativeResidual(reference?.groundEnergyHartree, exact?.groundEnergyHartree, scale),
    relativeResidual(reference?.eigenvaluesHartree?.[0], exact?.eigenvaluesHartree[0], scale),
    relativeResidual(reference?.eigenvaluesHartree?.[1], exact?.eigenvaluesHartree[1], scale),
    relativeResidual(reference?.spectralGapHartree, exact?.spectralGapHartree, scale),
  ]);
  const referenceMatrixMatches =
    matrixMaximumDifference(reference?.sectorMatrix, reducedMatrix) === 0 &&
    matrixMaximumDifference(manifest?.sector?.matrix, reducedMatrix) === 0;
  observations.set(
    "reference.recomputed",
    makeObservation({
      id: "reference.recomputed",
      passed:
        referenceMatrixMatches &&
        Number.isFinite(referenceMetric) &&
        referenceMetric <= definitions.get("reference.recomputed").threshold,
      observed: {
        normalizedResidual: referenceMetric,
        sectorMatrixMatches: referenceMatrixMatches,
        recomputedGroundEnergyHartree: exact?.groundEnergyHartree ?? null,
      },
      evidenceRefs: evidence.artifactRefs("hamiltonian-manifest", "exact-reference"),
    }),
  );

  const recomputedEigenResidual = eigenResidual(
    reducedMatrix,
    reference?.groundStateSectorAmplitudes ?? [],
    reference?.groundEnergyHartree,
  );
  const eigenMetric = maximum([
    recomputedEigenResidual / scale,
    relativeResidual(reference?.eigenResidualHartree, recomputedEigenResidual, scale),
    Math.abs(vectorNormSquared(reference?.groundStateSectorAmplitudes ?? []) - 1),
  ]);
  observations.set(
    "reference.eigen-residual",
    makeObservation({
      id: "reference.eigen-residual",
      passed:
        Number.isFinite(eigenMetric) &&
        eigenMetric <= definitions.get("reference.eigen-residual").threshold,
      observed: {
        normalizedResidual: eigenMetric,
        recomputedResidualHartree: recomputedEigenResidual,
        scaleHartree: scale,
      },
      evidenceRefs: evidence.artifactRefs("exact-reference", "hamiltonian-manifest"),
    }),
  );

  const allFactNumbersFinite = containsOnlyFiniteNumbers(facts);
  const finiteHartree =
    Number.isFinite(result?.energyHartree) &&
    result?.energyUnit === "hartree" &&
    allFactNumbersFinite;
  observations.set(
    "result.finite-hartree",
    makeObservation({
      id: "result.finite-hartree",
      passed: finiteHartree,
      observed: {
        energyHartree: result?.energyHartree,
        energyUnit: result?.energyUnit ?? null,
        allFactNumbersFinite,
      },
      evidenceRefs: evidence.artifactRefs(...Object.values(FACT_TYPES)),
    }),
  );

  const recomputedNorm = vectorNormSquared(result?.statevectorReal ?? []);
  const normalizationMetric = maximum([
    Math.abs(recomputedNorm - 1),
    Math.abs((result?.stateNorm ?? Number.NaN) - recomputedNorm),
  ]);
  observations.set(
    "result.state-normalized",
    makeObservation({
      id: "result.state-normalized",
      passed:
        Number.isFinite(normalizationMetric) &&
        normalizationMetric <= definitions.get("result.state-normalized").threshold,
      observed: { normSquared: recomputedNorm, maximumResidual: normalizationMetric },
      evidenceRefs: evidence.artifactRefs("ground-state-result"),
    }),
  );

  const ansatzReplay = replayAnsatz(result);
  observations.set(
    "result.ansatz-replayed",
    makeObservation({
      id: "result.ansatz-replayed",
      passed:
        Number.isFinite(ansatzReplay.metric) &&
        ansatzReplay.metric <= definitions.get("result.ansatz-replayed").threshold,
      observed: ansatzReplay,
      evidenceRefs: evidence.artifactRefs("ground-state-result"),
    }),
  );

  const matrixEnergy = expectationFromMatrix(matrix, result?.statevectorReal ?? []);
  const termEnergy = canonical.inScope
    ? expectationFromTerms(canonical.hamiltonian.terms, result?.statevectorReal ?? [])
    : Number.POSITIVE_INFINITY;
  const expectationMetric = maximum([
    relativeResidual(result?.energyHartree, matrixEnergy, scale),
    relativeResidual(result?.energyHartree, termEnergy, scale),
    relativeResidual(matrixEnergy, termEnergy, scale),
  ]);
  observations.set(
    "result.expectation-replayed",
    makeObservation({
      id: "result.expectation-replayed",
      passed:
        Number.isFinite(expectationMetric) &&
        expectationMetric <= definitions.get("result.expectation-replayed").threshold,
      observed: {
        normalizedResidual: expectationMetric,
        matrixEnergyHartree: matrixEnergy,
        termEnergyHartree: termEnergy,
        scaleHartree: scale,
      },
      evidenceRefs: evidence.artifactRefs("ground-state-result", "hamiltonian-manifest"),
    }),
  );

  const exactEnergy = exact?.groundEnergyHartree;
  const variationalViolation =
    Number.isFinite(exactEnergy) && Number.isFinite(result?.energyHartree)
      ? Math.max(0, exactEnergy - result.energyHartree) /
        Math.max(scale, Math.abs(exactEnergy), Math.abs(result.energyHartree))
      : Number.POSITIVE_INFINITY;
  const recordedGapResidual = relativeResidual(
    result?.variationalGapHartree,
    result?.energyHartree - exactEnergy,
    scale,
  );
  const variationalMetric = Math.max(variationalViolation, recordedGapResidual);
  observations.set(
    "vqe.variational-bound",
    makeObservation({
      id: "vqe.variational-bound",
      passed:
        Number.isFinite(variationalMetric) &&
        variationalMetric <= definitions.get("vqe.variational-bound").threshold,
      observed: {
        normalizedLowerBoundViolation: variationalViolation,
        normalizedRecordedGapResidual: recordedGapResidual,
      },
      evidenceRefs: evidence.artifactRefs("ground-state-result", "exact-reference"),
    }),
  );

  const energyError =
    Number.isFinite(exactEnergy) && Number.isFinite(result?.energyHartree)
      ? Math.abs(result.energyHartree - exactEnergy)
      : Number.POSITIVE_INFINITY;
  observations.set(
    "vqe.energy-accuracy",
    makeObservation({
      id: "vqe.energy-accuracy",
      passed:
        Number.isFinite(energyError) &&
        energyError <= definitions.get("vqe.energy-accuracy").threshold,
      observed: { absoluteErrorHartree: energyError },
      evidenceRefs: evidence.artifactRefs("ground-state-result", "exact-reference"),
    }),
  );

  const converged =
    result?.converged === true &&
    result?.terminationReason === "angle-tolerance" &&
    Number.isFinite(trace?.finalBracketWidthRadians) &&
    trace.finalBracketWidthRadians <= definitions.get("vqe.converged").threshold &&
    result.evaluationCount < trace?.optimizer?.maxEvaluations;
  observations.set(
    "vqe.converged",
    makeObservation({
      id: "vqe.converged",
      passed: converged,
      observed: {
        converged: result?.converged === true,
        terminationReason: result?.terminationReason ?? null,
        finalBracketWidthRadians: trace?.finalBracketWidthRadians ?? null,
        evaluationCount: result?.evaluationCount ?? null,
        maxEvaluations: trace?.optimizer?.maxEvaluations ?? null,
      },
      evidenceRefs: evidence.artifactRefs("ground-state-result", "convergence-trace"),
      nextAction: "Increase the evaluation budget or tighten the optimizer configuration, then rerun.",
    }),
  );

  const optimizerReplay = replayOptimizer(canonical, facts, scale);
  observations.set(
    "optimizer.trace-replayed",
    makeObservation({
      id: "optimizer.trace-replayed",
      passed:
        optimizerReplay.structurallyConsistent &&
        Number.isFinite(optimizerReplay.maximumNormalizedEnergyResidual) &&
        optimizerReplay.maximumNormalizedEnergyResidual <=
          definitions.get("optimizer.trace-replayed").threshold,
      observed: optimizerReplay,
      evidenceRefs: evidence.artifactRefs("convergence-trace", "ground-state-result"),
    }),
  );

  const resourceCountsMatch =
    resources?.logicalQubits === 2 &&
    resources?.sectorDimension === 2 &&
    resources?.statevectorDimension === 4 &&
    resources?.pauliTermCount === canonical.hamiltonian?.terms?.length &&
    resources?.ansatzParameterCount === 1 &&
    resources?.expectationEvaluations === trace?.entries?.length &&
    resources?.expectationEvaluations === result?.evaluationCount &&
    resources?.pauliTermEvaluations ===
      resources?.expectationEvaluations * resources?.pauliTermCount &&
    resources?.shots === 0 &&
    resources?.maxEvaluations === canonical.normalized?.method?.optimizer?.maxEvaluations;
  const withinBudget =
    resourceCountsMatch &&
    resources.expectationEvaluations <= definitions.get("resources.within-budget").threshold &&
    resources.expectationEvaluations <= resources.maxEvaluations;
  observations.set(
    "resources.within-budget",
    makeObservation({
      id: "resources.within-budget",
      passed: withinBudget,
      observed: {
        resourceCountsMatch,
        expectationEvaluations: resources?.expectationEvaluations ?? null,
        requestedMaxEvaluations: resources?.maxEvaluations ?? null,
      },
      evidenceRefs: evidence.artifactRefs(
        "resource-estimate",
        "convergence-trace",
        "ground-state-result",
      ),
    }),
  );

  if (provenanceMode === "materialized") {
    const provenance = provenanceState(
      resultPackage,
      request,
      facts,
      canonical,
      evidence,
    );
    observations.set(
      "provenance.complete",
      makeObservation({
        id: "provenance.complete",
        passed: provenance.complete,
        observed: provenance,
        evidenceRefs: [
          ...evidence.inputRef(),
          ...evidence.artifactRefs(...Object.values(FACT_TYPES)),
        ],
      }),
    );
  } else {
    observations.set(
      "provenance.complete",
      makeObservation({
        id: "provenance.complete",
        status: "not_checked",
        observed: {
          materializedResultPackage: false,
          reason:
            "The computation is still an execution-local Tool result, not a Harness-materialized Result Package.",
        },
        evidenceRefs: [],
        nextAction:
          "Materialize the input and six facts as a validated Result Package, then run the full Validator before deriving Acceptance.",
      }),
    );
  }

  const computationalOnly = provenanceMode !== "materialized";

  return {
    scopeMatch: {
      status: scopePassed ? "in_scope" : "out_of_scope",
      statement: scopePassed
        ? "The request matches the supplied two-qubit, fixed-hamming-weight=1 statevector VQE scope."
        : `The request is outside this validator scope: ${scopeMismatches.join(", ")}.`,
      evidenceRefs: evidence.inputRef(),
    },
    observations: profile.checks.map((check) => observations.get(check.id)),
    limitations: [
      ...DEFAULT_LIMITATIONS,
      ...(computationalOnly
        ? [
            "Execution provenance is not checked until Harness materializes a validated Result Package.",
          ]
        : []),
    ],
    statement:
      computationalOnly
        ? "Deterministic computational observations were produced; provenance remains not checked and no Acceptance decision may be derived from this output alone."
        : "Deterministic scientific observations were produced for the supplied two-qubit sector-ground-state result.",
  };
}

function assertExactKeys(value, keys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(`${label} must contain exactly: ${expected.join(", ")}`);
  }
}

export function validateValidationBundle(bundle) {
  assertExactKeys(
    bundle,
    ["schemaVersion", "resultPackage", "profile", "request", "facts"],
    "validation bundle",
  );
  if (bundle.schemaVersion !== "1.0") {
    throw new Error('validation bundle schemaVersion must equal "1.0"');
  }
  const { resultPackage, profile, request, facts } = bundle;
  if (
    resultPackage?.kind !== "openquantum-result-package-v1.1" ||
    resultPackage?.value?.schemaVersion !== "1.1"
  ) {
    throw new Error("Validator requires a materialized Result Package v1.1 contract");
  }
  if (resultPackage.value.inputs.length !== 1) {
    throw new Error("Quantum ground-state validation requires exactly one input snapshot");
  }
  assertExactKeys(facts, Object.keys(FACT_TYPES), "validation bundle facts");
  for (const [key, type] of Object.entries(FACT_TYPES)) {
    const references = resultPackage.value.artifacts.filter(
      (reference) => reference.type === type,
    );
    if (references.length !== 1) {
      throw new Error(`Quantum ground-state validation requires exactly one ${type} artifact`);
    }
    if (facts[key]?.artifactType !== type) {
      throw new Error(`validation bundle facts.${key} must be a ${type} artifact`);
    }
  }
  return evaluateGroundStateFacts({
    resultPackage,
    profile,
    request,
    facts,
    evidence: evidenceFactory(resultPackage),
    provenanceMode: "materialized",
  });
}

export function validateGroundStateComputation(value) {
  assertExactKeys(
    value,
    ["profile", "request", "facts"],
    "ground-state computation",
  );
  const { profile, request, facts } = value;
  assertExactKeys(facts, Object.keys(FACT_TYPES), "ground-state computation facts");
  for (const [key, type] of Object.entries(FACT_TYPES)) {
    if (facts[key]?.artifactType !== type) {
      throw new Error(`ground-state computation facts.${key} must be a ${type} artifact`);
    }
  }
  return evaluateGroundStateFacts({
    resultPackage: undefined,
    profile,
    request,
    facts,
    evidence: inlineEvidenceFactory(facts),
    provenanceMode: "execution-local",
  });
}

function runCli() {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error("Usage: node validators/validate-result.mjs <validation-bundle.json>");
    process.exitCode = 2;
    return;
  }
  try {
    const bundle = JSON.parse(fs.readFileSync(path.resolve(bundlePath), "utf8"));
    const output = validateValidationBundle(bundle);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  runCli();
}
