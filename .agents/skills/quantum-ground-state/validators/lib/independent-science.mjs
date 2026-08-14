import crypto from "node:crypto";

const BASIS_ORDER = ["00", "01", "10", "11"];
const SECTOR_INDICES = [1, 2];
const COMPLEMENT_INDICES = [0, 3];
const GOLDEN_RATIO_CONJUGATE = (Math.sqrt(5) - 1) / 2;
const TWO_PI = 2 * Math.PI;

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Canonical(value) {
  return crypto.createHash("sha256").update(stableStringify(value), "utf8").digest("hex");
}

function exactKeys(value, expected) {
  return (
    isPlainObject(value) &&
    Object.keys(value).sort().join("\u0000") === [...expected].sort().join("\u0000")
  );
}

function exactObject(value, expected) {
  if (typeof expected === "number") {
    return typeof value === "number" && value === expected;
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(value) &&
      value.length === expected.length &&
      value.every((item, index) => exactObject(item, expected[index]))
    );
  }
  if (isPlainObject(expected)) {
    return (
      exactKeys(value, Object.keys(expected)) &&
      Object.entries(expected).every(([key, item]) => exactObject(value[key], item))
    );
  }
  return value === expected;
}

function supportedTerm(term) {
  return (
    exactKeys(term, ["pauli", "coefficient"]) &&
    typeof term.pauli === "string" &&
    /^[IXZ]{2}$/.test(term.pauli) &&
    Number.isFinite(term.coefficient) &&
    term.coefficient >= -1_000_000 &&
    term.coefficient <= 1_000_000
  );
}

export function inspectRequestScope(request) {
  const mismatches = [];
  if (
    !exactKeys(request, [
      "schemaVersion",
      "requestId",
      "claim",
      "system",
      "hamiltonian",
      "method",
      "acceptanceProfile",
    ])
  ) {
    mismatches.push("request shape");
    return { inScope: false, mismatches };
  }

  if (request.schemaVersion !== "1.0") mismatches.push("schema version");
  if (
    typeof request.requestId !== "string" ||
    !/^[A-Za-z0-9]+(?:[._:-][A-Za-z0-9]+)*$/.test(request.requestId)
  ) {
    mismatches.push("request id");
  }
  if (request.claim !== "sector-ground-energy-of-supplied-hamiltonian") {
    mismatches.push("claim");
  }
  if (
    !exactObject(request.system, {
      kind: "qubit-model",
      label: request.system?.label,
      source: { kind: "supplied-pauli-sum" },
    }) ||
    typeof request.system?.label !== "string" ||
    request.system.label.length < 1 ||
    request.system.label.length > 240
  ) {
    mismatches.push("system source");
  }

  const hamiltonian = request.hamiltonian;
  if (
    !exactKeys(hamiltonian, [
      "format",
      "qubitCount",
      "qubitOrder",
      "basisOrder",
      "coefficientUnit",
      "sector",
      "terms",
    ]) ||
    hamiltonian.format !== "openquantum-pauli-sum-v1" ||
    hamiltonian.qubitCount !== 2 ||
    hamiltonian.qubitOrder !== "left-to-right-msb" ||
    hamiltonian.basisOrder !== "00-01-10-11" ||
    hamiltonian.coefficientUnit !== "hartree" ||
    !exactObject(hamiltonian.sector, { kind: "fixed-hamming-weight", value: 1 })
  ) {
    mismatches.push("Hamiltonian convention");
  }
  if (
    !Array.isArray(hamiltonian?.terms) ||
    hamiltonian.terms.length < 1 ||
    hamiltonian.terms.length > 32 ||
    !hamiltonian.terms.every(supportedTerm) ||
    new Set(hamiltonian.terms.map((term) => term.pauli)).size !== hamiltonian.terms.length ||
    hamiltonian.terms.every((term) => term.coefficient === 0)
  ) {
    mismatches.push("Pauli terms");
  }

  const method = request.method;
  const optimizer = method?.optimizer;
  if (
    !exactKeys(method, ["algorithm", "simulator", "ansatz", "optimizer", "randomness"]) ||
    method.algorithm !== "vqe" ||
    method.simulator !== "statevector" ||
    method.randomness !== "none" ||
    !exactObject(method.ansatz, {
      id: "two-qubit-single-excitation-givens",
      version: "1.0.0",
    }) ||
    !exactKeys(optimizer, [
      "id",
      "version",
      "coarsePoints",
      "angleToleranceRadians",
      "maxEvaluations",
    ]) ||
    optimizer.id !== "coarse-grid-golden-refine" ||
    optimizer.version !== "1.0.0" ||
    optimizer.coarsePoints !== 65 ||
    !Number.isFinite(optimizer.angleToleranceRadians) ||
    optimizer.angleToleranceRadians < 1e-14 ||
    optimizer.angleToleranceRadians > 0.01 ||
    !Number.isSafeInteger(optimizer.maxEvaluations) ||
    optimizer.maxEvaluations < 8 ||
    optimizer.maxEvaluations > 256
  ) {
    mismatches.push("VQE method");
  }
  if (
    !exactObject(request.acceptanceProfile, {
      id: "supplied-pauli-statevector",
      version: "1.0.0",
    })
  ) {
    mismatches.push("acceptance profile");
  }
  return { inScope: mismatches.length === 0, mismatches };
}

export function canonicalizeRequestIndependently(request) {
  const scope = inspectRequestScope(request);
  if (!scope.inScope) {
    return { ...scope };
  }
  const terms = request.hamiltonian.terms
    .map((term) => ({
      pauli: term.pauli,
      coefficient: Object.is(term.coefficient, -0) ? 0 : term.coefficient,
    }))
    .sort((left, right) => {
      if (left.pauli < right.pauli) return -1;
      if (left.pauli > right.pauli) return 1;
      return 0;
    });
  const hamiltonian = {
    format: request.hamiltonian.format,
    qubitCount: 2,
    qubitOrder: request.hamiltonian.qubitOrder,
    basisOrder: request.hamiltonian.basisOrder,
    coefficientUnit: request.hamiltonian.coefficientUnit,
    sector: { kind: request.hamiltonian.sector.kind, value: 1 },
    terms,
  };
  const normalized = {
    schemaVersion: "1.0",
    requestId: request.requestId,
    claim: request.claim,
    system: {
      kind: request.system.kind,
      label: request.system.label,
      source: { kind: request.system.source.kind },
    },
    hamiltonian,
    method: {
      algorithm: request.method.algorithm,
      simulator: request.method.simulator,
      ansatz: { ...request.method.ansatz },
      optimizer: { ...request.method.optimizer },
      randomness: request.method.randomness,
    },
    acceptanceProfile: { ...request.acceptanceProfile },
  };
  return {
    inScope: true,
    mismatches: [],
    normalized,
    hamiltonian,
    requestDigest: sha256Canonical(normalized),
    hamiltonianDigest: sha256Canonical(hamiltonian),
  };
}

function applyPauli(pauli, basisIndex) {
  let row = basisIndex;
  let phase = 1;
  for (let qubit = 0; qubit < 2; qubit += 1) {
    const mask = 1 << (1 - qubit);
    if (pauli[qubit] === "X") {
      row ^= mask;
    } else if (pauli[qubit] === "Z") {
      phase *= (row & mask) === 0 ? 1 : -1;
    }
  }
  return { row, phase };
}

export function reconstructHamiltonian(terms) {
  const matrix = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (const { pauli, coefficient } of terms) {
    for (let column = 0; column < 4; column += 1) {
      const { row, phase } = applyPauli(pauli, column);
      matrix[row][column] += coefficient * phase;
    }
  }
  return matrix;
}

export function matrixMaximumDifference(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return Number.POSITIVE_INFINITY;
  }
  let difference = 0;
  for (let row = 0; row < left.length; row += 1) {
    if (!Array.isArray(left[row]) || !Array.isArray(right[row]) || left[row].length !== right[row].length) {
      return Number.POSITIVE_INFINITY;
    }
    for (let column = 0; column < left[row].length; column += 1) {
      if (!Number.isFinite(left[row][column]) || !Number.isFinite(right[row][column])) {
        return Number.POSITIVE_INFINITY;
      }
      difference = Math.max(difference, Math.abs(left[row][column] - right[row][column]));
    }
  }
  return difference;
}

export function hermiticityResidual(matrix) {
  let residual = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      residual = Math.max(residual, Math.abs(matrix[row][column] - matrix[column][row]));
    }
  }
  return residual;
}

export function sectorLeakage(matrix) {
  let residual = 0;
  for (const inside of SECTOR_INDICES) {
    for (const outside of COMPLEMENT_INDICES) {
      residual = Math.max(
        residual,
        Math.abs(matrix[inside][outside]),
        Math.abs(matrix[outside][inside]),
      );
    }
  }
  return residual;
}

export function sectorMatrix(matrix) {
  return SECTOR_INDICES.map((row) => SECTOR_INDICES.map((column) => matrix[row][column]));
}

export function exactTwoByTwo(matrix) {
  const a = matrix[0][0];
  const b = (matrix[0][1] + matrix[1][0]) / 2;
  const d = matrix[1][1];
  const center = (a + d) / 2;
  const halfDifference = (a - d) / 2;
  const radius = Math.hypot(halfDifference, b);
  const groundEnergyHartree = center - radius;
  const excitedEnergyHartree = center + radius;
  const angle = radius === 0 ? 0 : Math.atan2(-b, -halfDifference);
  return {
    eigenvaluesHartree: [groundEnergyHartree, excitedEnergyHartree],
    groundEnergyHartree,
    groundStateSectorAmplitudes: [Math.cos(angle / 2), Math.sin(angle / 2)],
    spectralGapHartree: excitedEnergyHartree - groundEnergyHartree,
  };
}

export function vectorNormSquared(vector) {
  if (!Array.isArray(vector) || vector.some((value) => !Number.isFinite(value))) {
    return Number.POSITIVE_INFINITY;
  }
  return vector.reduce((sum, value) => sum + value * value, 0);
}

export function eigenResidual(matrix, vector, eigenvalue) {
  if (!Number.isFinite(eigenvalue) || vectorNormSquared(vector) === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }
  let squared = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    let value = -eigenvalue * vector[row];
    for (let column = 0; column < matrix[row].length; column += 1) {
      value += matrix[row][column] * vector[column];
    }
    squared += value * value;
  }
  return Math.sqrt(squared);
}

export function stateFromAnsatz(theta) {
  return [0, Math.cos(theta / 2), Math.sin(theta / 2), 0];
}

export function expectationFromMatrix(matrix, vector) {
  if (vectorNormSquared(vector) === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }
  let expectation = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix[row].length; column += 1) {
      expectation += vector[row] * matrix[row][column] * vector[column];
    }
  }
  return expectation;
}

export function expectationFromTerms(terms, vector) {
  if (vectorNormSquared(vector) === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }
  let expectation = 0;
  for (const { pauli, coefficient } of terms) {
    let termExpectation = 0;
    for (let column = 0; column < 4; column += 1) {
      const { row, phase } = applyPauli(pauli, column);
      termExpectation += vector[row] * phase * vector[column];
    }
    expectation += coefficient * termExpectation;
  }
  return expectation;
}

export function rerunOptimizerIndependently(terms, options) {
  const trace = [];
  let best;
  const energyAt = (theta) => expectationFromTerms(terms, stateFromAnsatz(theta));
  const evaluate = (thetaRadians, phase) => {
    if (trace.length >= options.maxEvaluations) return undefined;
    const wrapped = ((thetaRadians + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
    const canonicalThetaRadians = Object.is(wrapped, -0) ? 0 : wrapped;
    const energyHartree = energyAt(canonicalThetaRadians);
    if (!Number.isFinite(energyHartree)) return undefined;
    if (!best || energyHartree < best.energyHartree) {
      best = { thetaRadians: canonicalThetaRadians, energyHartree };
    }
    trace.push({
      evaluation: trace.length + 1,
      phase,
      thetaRadians: canonicalThetaRadians,
      energyHartree,
      bestEnergyHartree: best.energyHartree,
    });
    return energyHartree;
  };

  const uniqueCoarsePointCount = options.coarsePoints - 1;
  const step = TWO_PI / uniqueCoarsePointCount;
  const coarseAngles = Array.from(
    { length: uniqueCoarsePointCount },
    (_, index) => -Math.PI + index * step,
  );
  const coarseEnergies = [];
  for (const coarseAngle of coarseAngles) {
    const value = evaluate(coarseAngle, "coarse");
    if (value === undefined) break;
    coarseEnergies.push(value);
  }
  if (coarseEnergies.length < uniqueCoarsePointCount) {
    return {
      trace,
      best,
      converged: false,
      terminationReason: "evaluation-budget",
      finalBracketWidthRadians: null,
      coarsePointsEvaluated: coarseEnergies.length,
      refinementEvaluations: 0,
    };
  }

  let bestIndex = 0;
  for (let index = 1; index < coarseEnergies.length; index += 1) {
    if (coarseEnergies[index] < coarseEnergies[bestIndex]) bestIndex = index;
  }
  const leftIndex = (bestIndex - 1 + uniqueCoarsePointCount) % uniqueCoarsePointCount;
  const rightIndex = (bestIndex + 1) % uniqueCoarsePointCount;
  const centre = coarseAngles[bestIndex];
  let leftDelta = coarseAngles[leftIndex] - centre;
  if (leftDelta >= 0) leftDelta -= TWO_PI;
  let rightDelta = coarseAngles[rightIndex] - centre;
  if (rightDelta <= 0) rightDelta += TWO_PI;
  let left = centre + leftDelta;
  let right = centre + rightDelta;
  let innerLeft = right - GOLDEN_RATIO_CONJUGATE * (right - left);
  let innerRight = left + GOLDEN_RATIO_CONJUGATE * (right - left);
  let leftEnergy = evaluate(innerLeft, "refine");
  let rightEnergy = evaluate(innerRight, "refine");

  while (
    right - left > options.angleToleranceRadians &&
    leftEnergy !== undefined &&
    rightEnergy !== undefined &&
    trace.length < options.maxEvaluations
  ) {
    if (leftEnergy < rightEnergy) {
      right = innerRight;
      innerRight = innerLeft;
      rightEnergy = leftEnergy;
      innerLeft = right - GOLDEN_RATIO_CONJUGATE * (right - left);
      leftEnergy = evaluate(innerLeft, "refine");
    } else {
      left = innerLeft;
      innerLeft = innerRight;
      leftEnergy = rightEnergy;
      innerRight = left + GOLDEN_RATIO_CONJUGATE * (right - left);
      rightEnergy = evaluate(innerRight, "refine");
    }
  }
  const converged = right - left <= options.angleToleranceRadians;
  if (converged && trace.length < options.maxEvaluations) {
    evaluate((left + right) / 2, "final");
  }
  return {
    trace,
    best,
    converged,
    terminationReason: converged ? "angle-tolerance" : "evaluation-budget",
    finalBracketWidthRadians: right - left,
    coarsePointsEvaluated: uniqueCoarsePointCount,
    refinementEvaluations: trace.filter((entry) => entry.phase !== "coarse").length,
  };
}

export function hamiltonianScale(terms) {
  if (!Array.isArray(terms) || terms.some((term) => !Number.isFinite(term?.coefficient))) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(
    1,
    terms.reduce((sum, term) => sum + Math.abs(term.coefficient), 0),
  );
}

export function relativeResidual(actual, expected, scale = 1) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(actual - expected) / Math.max(scale, Math.abs(actual), Math.abs(expected));
}

export function angularResidual(actual, expected) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected))) / Math.PI;
}

export { BASIS_ORDER };
