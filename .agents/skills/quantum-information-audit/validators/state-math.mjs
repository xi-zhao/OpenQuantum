import { createHash } from "node:crypto";

export const MAX_DIMENSION = 16;
export const MAX_ABS_COEFFICIENT = 1e6;
export const STRUCTURAL_TOLERANCE = 1e-10;
export const REPLAY_TOLERANCE = 1e-9;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value, field) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > MAX_ABS_COEFFICIENT
  ) {
    throw new TypeError(
      `${field} must be a finite number within +/-${MAX_ABS_COEFFICIENT}`,
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

function normalizeMatrix(value, dimension, field) {
  if (!Array.isArray(value) || value.length !== dimension) {
    throw new TypeError(`${field} must be a ${dimension}x${dimension} matrix`);
  }
  return value.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== dimension) {
      throw new TypeError(`${field} must be a ${dimension}x${dimension} matrix`);
    }
    return row.map((cell, columnIndex) =>
      finiteNumber(cell, `${field}[${rowIndex}][${columnIndex}]`),
    );
  });
}

export function normalizeAuditRequest(value) {
  const allowed = new Set([
    "matrixReal",
    "matrixImag",
    "subsystemDimensions",
    "transposeSubsystems",
  ]);
  if (!isRecord(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError("density-matrix audit request is invalid");
  }
  if (
    !Array.isArray(value.subsystemDimensions) ||
    value.subsystemDimensions.length < 2 ||
    value.subsystemDimensions.some(
      (dimension) => !Number.isInteger(dimension) || dimension < 2,
    )
  ) {
    throw new TypeError("subsystemDimensions must contain at least two integers >= 2");
  }
  const dimension = value.subsystemDimensions.reduce((product, item) => product * item, 1);
  if (dimension > MAX_DIMENSION) {
    throw new TypeError(`total matrix dimension must not exceed ${MAX_DIMENSION}`);
  }
  const matrixReal = normalizeMatrix(value.matrixReal, dimension, "matrixReal");
  const matrixImag =
    value.matrixImag === undefined
      ? Array.from({ length: dimension }, () => Array(dimension).fill(0))
      : normalizeMatrix(value.matrixImag, dimension, "matrixImag");
  if (
    !Array.isArray(value.transposeSubsystems) ||
    value.transposeSubsystems.length < 1 ||
    value.transposeSubsystems.length >= value.subsystemDimensions.length ||
    value.transposeSubsystems.some(
      (index) =>
        !Number.isInteger(index) ||
        index < 0 ||
        index >= value.subsystemDimensions.length,
    ) ||
    new Set(value.transposeSubsystems).size !== value.transposeSubsystems.length
  ) {
    throw new TypeError(
      "transposeSubsystems must be a unique, non-empty proper subset of subsystem indices",
    );
  }
  return {
    matrixReal,
    matrixImag,
    subsystemDimensions: [...value.subsystemDimensions],
    transposeSubsystems: [...value.transposeSubsystems].sort((left, right) => left - right),
  };
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

export function requestDigest(request) {
  const canonical = JSON.stringify(canonicalValue(request));
  return createHash("sha256").update(canonical).digest("hex");
}

function complex(real = 0, imag = 0) {
  return { real, imag };
}

function add(left, right) {
  return complex(left.real + right.real, left.imag + right.imag);
}

function multiply(left, right) {
  return complex(
    left.real * right.real - left.imag * right.imag,
    left.real * right.imag + left.imag * right.real,
  );
}

function matrixFromRequest(request) {
  return request.matrixReal.map((row, i) =>
    row.map((real, j) => complex(real, request.matrixImag[i][j])),
  );
}

function trace(matrix) {
  return matrix.reduce((total, row, index) => add(total, row[index]), complex());
}

function purity(matrix) {
  let value = complex();
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = 0; j < matrix.length; j += 1) {
      value = add(value, multiply(matrix[i][j], matrix[j][i]));
    }
  }
  return value;
}

function hermiticityResidual(matrix) {
  let residual = 0;
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = 0; j < matrix.length; j += 1) {
      residual = Math.max(
        residual,
        Math.hypot(
          matrix[i][j].real - matrix[j][i].real,
          matrix[i][j].imag + matrix[j][i].imag,
        ),
      );
    }
  }
  return residual;
}

function hermitianPart(matrix) {
  return matrix.map((row, i) =>
    row.map((entry, j) =>
      complex(
        (entry.real + matrix[j][i].real) / 2,
        (entry.imag - matrix[j][i].imag) / 2,
      ),
    ),
  );
}

function toRealSymmetric(matrix) {
  const size = matrix.length;
  return Array.from({ length: 2 * size }, (_, row) =>
    Array.from({ length: 2 * size }, (_, column) => {
      const rowBlock = row >= size ? 1 : 0;
      const columnBlock = column >= size ? 1 : 0;
      const value = matrix[row % size][column % size];
      if (rowBlock === columnBlock) return value.real;
      return rowBlock === 0 ? -value.imag : value.imag;
    }),
  );
}

function jacobiEigenvalues(input) {
  const matrix = input.map((row) => [...row]);
  const size = matrix.length;
  const maxIterations = 100 * size * size;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let p = 0;
    let q = 1;
    let largest = 0;
    for (let i = 0; i < size; i += 1) {
      for (let j = i + 1; j < size; j += 1) {
        const candidate = Math.abs(matrix[i][j]);
        if (candidate > largest) {
          largest = candidate;
          p = i;
          q = j;
        }
      }
    }
    if (largest <= 1e-14) break;
    const angle = 0.5 * Math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const app = matrix[p][p];
    const aqq = matrix[q][q];
    const apq = matrix[p][q];
    matrix[p][p] = cosine * cosine * app - 2 * sine * cosine * apq + sine * sine * aqq;
    matrix[q][q] = sine * sine * app + 2 * sine * cosine * apq + cosine * cosine * aqq;
    matrix[p][q] = 0;
    matrix[q][p] = 0;
    for (let i = 0; i < size; i += 1) {
      if (i === p || i === q) continue;
      const aip = matrix[i][p];
      const aiq = matrix[i][q];
      matrix[i][p] = cosine * aip - sine * aiq;
      matrix[p][i] = matrix[i][p];
      matrix[i][q] = sine * aip + cosine * aiq;
      matrix[q][i] = matrix[i][q];
    }
  }
  return matrix.map((row, index) => row[index]).sort((left, right) => left - right);
}

function hermitianEigenvalues(matrix) {
  const doubled = jacobiEigenvalues(toRealSymmetric(hermitianPart(matrix)));
  return Array.from({ length: matrix.length }, (_, index) =>
    (doubled[2 * index] + doubled[2 * index + 1]) / 2,
  );
}

function coordinates(index, dimensions) {
  const result = Array(dimensions.length).fill(0);
  let remaining = index;
  for (let position = dimensions.length - 1; position >= 0; position -= 1) {
    result[position] = remaining % dimensions[position];
    remaining = Math.floor(remaining / dimensions[position]);
  }
  return result;
}

function linearIndex(values, dimensions) {
  return values.reduce((index, value, position) => index * dimensions[position] + value, 0);
}

function partialTranspose(matrix, dimensions, subsystems) {
  const result = Array.from({ length: matrix.length }, () =>
    Array.from({ length: matrix.length }, () => complex()),
  );
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      const sourceRow = coordinates(row, dimensions);
      const sourceColumn = coordinates(column, dimensions);
      for (const subsystem of subsystems) {
        [sourceRow[subsystem], sourceColumn[subsystem]] = [
          sourceColumn[subsystem],
          sourceRow[subsystem],
        ];
      }
      result[row][column] = matrix[linearIndex(sourceRow, dimensions)][
        linearIndex(sourceColumn, dimensions)
      ];
    }
  }
  return result;
}

export function computeReferenceAnalysis(value) {
  const request = normalizeAuditRequest(value);
  const matrix = matrixFromRequest(request);
  const stateEigenvalues = hermitianEigenvalues(matrix);
  const transposed = partialTranspose(
    matrix,
    request.subsystemDimensions,
    request.transposeSubsystems,
  );
  const transposeEigenvalues = hermitianEigenvalues(transposed);
  const stateTrace = trace(matrix);
  const statePurity = purity(matrix);
  const transposeTrace = trace(transposed);
  const stateResidual = hermiticityResidual(matrix);
  const transposeResidual = hermiticityResidual(transposed);
  const minimumEigenvalue = stateEigenvalues[0];
  return {
    schemaVersion: "1.0",
    requestDigest: requestDigest(request),
    state: {
      dimension: matrix.length,
      trace: stateTrace,
      hermiticityResidual: stateResidual,
      hermitianPartMinimumEigenvalue: minimumEigenvalue,
      purity: statePurity,
      numericalRank: stateEigenvalues.filter((value) => value > STRUCTURAL_TOLERANCE).length,
      densityByReplayedCriteria:
        stateResidual <= STRUCTURAL_TOLERANCE &&
        Math.hypot(stateTrace.real - 1, stateTrace.imag) <= STRUCTURAL_TOLERANCE &&
        minimumEigenvalue >= -STRUCTURAL_TOLERANCE,
    },
    partialTranspose: {
      subsystems: [...request.transposeSubsystems],
      trace: transposeTrace,
      hermiticityResidual: transposeResidual,
      eigenvalues: transposeEigenvalues,
      minimumEigenvalue: transposeEigenvalues[0],
      negativity: transposeEigenvalues.reduce(
        (total, value) => total + Math.max(0, -value),
        0,
      ),
    },
  };
}

export function numericDistance(left, right) {
  return Number.isFinite(left) && Number.isFinite(right)
    ? Math.abs(left - right)
    : Number.POSITIVE_INFINITY;
}

export function complexDistance(left, right) {
  if (!isRecord(left) || !isRecord(right)) return Number.POSITIVE_INFINITY;
  return Math.hypot(
    numericDistance(left.real, right.real),
    numericDistance(left.imag, right.imag),
  );
}
