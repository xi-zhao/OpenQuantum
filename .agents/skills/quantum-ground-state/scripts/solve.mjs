import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalizeRequest } from "./lib/canonicalize.mjs";
import { minimizePeriodicAngle } from "./lib/deterministic-optimizer.mjs";
import { solveExactRealSymmetricTwoByTwo } from "./lib/exact-sector-reference.mjs";
import {
  BASIS_ORDER,
  assertSupportedHamiltonian,
  buildHamiltonianMatrix,
  expectationFromMatrix,
  expectationFromTerms,
  extractSectorMatrix,
  hamiltonianScale,
  statevectorForTheta,
  vectorNormSquared,
} from "./lib/pauli-statevector.mjs";

const FACT_FILES = {
  problemSpec: "problem-spec.json",
  hamiltonianManifest: "hamiltonian-manifest.json",
  exactReference: "exact-reference.json",
  groundStateResult: "ground-state-result.json",
  convergenceTrace: "convergence-trace.json",
  resourceEstimate: "resource-estimate.json",
};

const REPLAY_RELATIVE_TOLERANCE = 128 * Number.EPSILON;

function normalizedEnergyDifference(left, right, hamiltonianScale) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(left - right) / Math.max(hamiltonianScale, Math.abs(left), Math.abs(right));
}

function assertFiniteNumericalFacts(value, location = "facts") {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`Scientific artifact contains a non-finite number at ${location}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteNumericalFacts(item, `${location}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertFiniteNumericalFacts(item, `${location}.${key}`);
    }
  }
}

export function solveGroundState(request) {
  const { normalized, requestDigest, hamiltonianDigest } = canonicalizeRequest(request);
  const matrix = buildHamiltonianMatrix(normalized.hamiltonian.terms);
  const { hermiticityResidual, sectorLeakage } = assertSupportedHamiltonian(
    matrix,
    normalized.hamiltonian.terms,
  );
  const sectorMatrix = extractSectorMatrix(matrix);
  const exact = solveExactRealSymmetricTwoByTwo(sectorMatrix);

  const energyAtTheta = (thetaRadians) =>
    expectationFromTerms(
      normalized.hamiltonian.terms,
      statevectorForTheta(thetaRadians),
    );
  const optimization = minimizePeriodicAngle(energyAtTheta, normalized.method.optimizer);
  const optimalThetaRadians = optimization.best.thetaRadians;
  const statevectorReal = statevectorForTheta(optimalThetaRadians);
  const energyHartree = optimization.best.energyHartree;
  const matrixReplayEnergy = expectationFromMatrix(matrix, statevectorReal);
  const replayResidual = normalizedEnergyDifference(
    matrixReplayEnergy,
    energyHartree,
    hamiltonianScale(normalized.hamiltonian.terms),
  );
  if (replayResidual > REPLAY_RELATIVE_TOLERANCE) {
    throw new Error("Independent matrix and Pauli-term expectations disagree");
  }

  const problemSpec = {
    schemaVersion: "1.0",
    artifactType: "problem-spec",
    requestId: normalized.requestId,
    requestDigest,
    claim: normalized.claim,
    system: normalized.system,
    hamiltonianDigest,
    method: normalized.method,
    acceptanceProfile: normalized.acceptanceProfile,
    limitations: [
      "Only the declared fixed-hamming-weight=1 sector is solved.",
      "The supplied Pauli Hamiltonian is not derived or validated from molecular geometry.",
      "Noise, finite shots, physical hardware, excited states, and QAOA are outside this version.",
    ],
  };
  const hamiltonianManifest = {
    schemaVersion: "1.0",
    artifactType: "hamiltonian-manifest",
    hamiltonianDigest,
    format: normalized.hamiltonian.format,
    qubitCount: normalized.hamiltonian.qubitCount,
    qubitOrder: normalized.hamiltonian.qubitOrder,
    basisOrder: BASIS_ORDER,
    coefficientUnit: normalized.hamiltonian.coefficientUnit,
    terms: normalized.hamiltonian.terms,
    matrix,
    sector: {
      kind: normalized.hamiltonian.sector.kind,
      value: normalized.hamiltonian.sector.value,
      basisStates: ["01", "10"],
      basisIndices: [1, 2],
      matrix: sectorMatrix,
    },
    hermiticityResidualHartree: hermiticityResidual,
    sectorLeakageHartree: sectorLeakage,
  };
  const exactReference = {
    schemaVersion: "1.0",
    artifactType: "exact-reference",
    hamiltonianDigest,
    method: {
      id: "closed-form-real-symmetric-2x2",
      version: "1.0.0",
    },
    energyUnit: "hartree",
    sectorMatrix,
    eigenvaluesHartree: exact.eigenvaluesHartree,
    groundEnergyHartree: exact.groundEnergyHartree,
    groundStateSectorAmplitudes: exact.groundStateSectorAmplitudes,
    eigenResidualHartree: exact.eigenResidualHartree,
    spectralGapHartree: exact.spectralGapHartree,
  };
  const groundStateResult = {
    schemaVersion: "1.0",
    artifactType: "ground-state-result",
    hamiltonianDigest,
    algorithm: {
      id: normalized.method.algorithm,
      simulator: normalized.method.simulator,
      ansatz: normalized.method.ansatz,
      optimizer: {
        id: normalized.method.optimizer.id,
        version: normalized.method.optimizer.version,
      },
    },
    energyUnit: "hartree",
    energyHartree,
    optimalThetaRadians,
    statevectorReal,
    stateNorm: vectorNormSquared(statevectorReal),
    variationalGapHartree: energyHartree - exact.groundEnergyHartree,
    converged: optimization.converged,
    terminationReason: optimization.terminationReason,
    evaluationCount: optimization.trace.length,
  };
  const convergenceTrace = {
    schemaVersion: "1.0",
    artifactType: "convergence-trace",
    hamiltonianDigest,
    optimizer: {
      id: normalized.method.optimizer.id,
      version: normalized.method.optimizer.version,
      coarsePointsRequested: normalized.method.optimizer.coarsePoints,
      angleToleranceRadians: normalized.method.optimizer.angleToleranceRadians,
      maxEvaluations: normalized.method.optimizer.maxEvaluations,
    },
    entries: optimization.trace,
    coarsePointsEvaluated: optimization.coarsePointsEvaluated,
    refinementEvaluations: optimization.refinementEvaluations,
    finalBracketWidthRadians: optimization.finalBracketWidthRadians,
    bestThetaRadians: optimalThetaRadians,
    bestEnergyHartree: energyHartree,
  };
  const resourceEstimate = {
    schemaVersion: "1.0",
    artifactType: "resource-estimate",
    hamiltonianDigest,
    logicalQubits: 2,
    sectorDimension: 2,
    statevectorDimension: 4,
    pauliTermCount: normalized.hamiltonian.terms.length,
    ansatzParameterCount: 1,
    expectationEvaluations: optimization.trace.length,
    pauliTermEvaluations: optimization.trace.length * normalized.hamiltonian.terms.length,
    shots: 0,
    maxEvaluations: normalized.method.optimizer.maxEvaluations,
  };

  const facts = {
    problemSpec,
    hamiltonianManifest,
    exactReference,
    groundStateResult,
    convergenceTrace,
    resourceEstimate,
  };
  assertFiniteNumericalFacts(facts);
  return facts;
}

export function writeFactArtifacts(facts, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const destinations = Object.values(FACT_FILES).map((filename) =>
    path.join(outputDirectory, filename),
  );
  const existing = destinations.filter((destination) => fs.existsSync(destination));
  if (existing.length > 0) {
    throw new Error(`Refusing to overwrite existing fact artifacts: ${existing.join(", ")}`);
  }
  const written = [];
  for (const [key, filename] of Object.entries(FACT_FILES)) {
    const destination = path.join(outputDirectory, filename);
    fs.writeFileSync(destination, `${JSON.stringify(facts[key], null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    written.push(destination);
  }
  return written;
}

function runCli() {
  const [, , requestPath, outputDirectory] = process.argv;
  if (!requestPath || !outputDirectory) {
    console.error("Usage: node scripts/solve.mjs <request.json> <new-output-directory>");
    process.exitCode = 2;
    return;
  }
  try {
    const request = JSON.parse(fs.readFileSync(path.resolve(requestPath), "utf8"));
    const facts = solveGroundState(request);
    for (const filename of writeFactArtifacts(facts, path.resolve(outputDirectory))) {
      console.log(filename);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  runCli();
}
