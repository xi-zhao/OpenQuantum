import { failInput } from "./domain-error.mjs";

export const BASIS_ORDER = ["00", "01", "10", "11"];
export const SECTOR_INDICES = [1, 2];
const COMPLEMENT_INDICES = [0, 3];
const SUPPORTED_HAMILTONIAN_NORMALIZED_TOLERANCE = 1e-12;

function applyPauliToBasis(pauli, basisIndex) {
  let outputIndex = basisIndex;
  let phase = 1;
  for (let qubit = 0; qubit < 2; qubit += 1) {
    const operator = pauli[qubit];
    const bitMask = 1 << (1 - qubit);
    const bit = (outputIndex & bitMask) === 0 ? 0 : 1;
    if (operator === "Z") {
      phase *= bit === 0 ? 1 : -1;
    } else if (operator === "X") {
      outputIndex ^= bitMask;
    }
  }
  return { outputIndex, phase };
}

export function buildHamiltonianMatrix(terms) {
  const matrix = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (const term of terms) {
    for (let column = 0; column < 4; column += 1) {
      const { outputIndex: row, phase } = applyPauliToBasis(term.pauli, column);
      matrix[row][column] += term.coefficient * phase;
    }
  }
  return matrix;
}

export function maximumHermiticityResidual(matrix) {
  let residual = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      residual = Math.max(residual, Math.abs(matrix[row][column] - matrix[column][row]));
    }
  }
  return residual;
}

export function maximumSectorLeakage(matrix) {
  let leakage = 0;
  for (const sectorIndex of SECTOR_INDICES) {
    for (const complementIndex of COMPLEMENT_INDICES) {
      leakage = Math.max(
        leakage,
        Math.abs(matrix[sectorIndex][complementIndex]),
        Math.abs(matrix[complementIndex][sectorIndex]),
      );
    }
  }
  return leakage;
}

export function extractSectorMatrix(matrix) {
  return SECTOR_INDICES.map((row) => SECTOR_INDICES.map((column) => matrix[row][column]));
}

export function hamiltonianScale(terms) {
  return Math.max(
    1,
    terms.reduce((sum, term) => sum + Math.abs(term.coefficient), 0),
  );
}

export function assertSupportedHamiltonian(matrix, terms) {
  const scaleHartree = hamiltonianScale(terms);
  const hermiticityResidual = maximumHermiticityResidual(matrix);
  const normalizedHermiticityResidual = hermiticityResidual / scaleHartree;
  if (normalizedHermiticityResidual > SUPPORTED_HAMILTONIAN_NORMALIZED_TOLERANCE) {
    failInput("NON_HERMITIAN_HAMILTONIAN", "Hamiltonian must be Hermitian", {
      hermiticityResidualHartree: hermiticityResidual,
      hamiltonianScaleHartree: scaleHartree,
      normalizedHermiticityResidual,
      normalizedTolerance: SUPPORTED_HAMILTONIAN_NORMALIZED_TOLERANCE,
    });
  }
  const sectorLeakage = maximumSectorLeakage(matrix);
  const normalizedSectorLeakage = sectorLeakage / scaleHartree;
  if (normalizedSectorLeakage > SUPPORTED_HAMILTONIAN_NORMALIZED_TOLERANCE) {
    failInput(
      "SECTOR_LEAKAGE",
      "Hamiltonian does not preserve the declared fixed-hamming-weight=1 sector",
      {
        sectorLeakageHartree: sectorLeakage,
        hamiltonianScaleHartree: scaleHartree,
        normalizedSectorLeakage,
        normalizedTolerance: SUPPORTED_HAMILTONIAN_NORMALIZED_TOLERANCE,
      },
    );
  }
  return {
    hermiticityResidual,
    sectorLeakage,
    scaleHartree,
    normalizedHermiticityResidual,
    normalizedSectorLeakage,
  };
}

export function statevectorForTheta(thetaRadians) {
  return [0, Math.cos(thetaRadians / 2), Math.sin(thetaRadians / 2), 0];
}

export function vectorNormSquared(vector) {
  return vector.reduce((sum, value) => sum + value * value, 0);
}

export function expectationFromMatrix(matrix, statevector) {
  let expectation = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    let rowProduct = 0;
    for (let column = 0; column < matrix.length; column += 1) {
      rowProduct += matrix[row][column] * statevector[column];
    }
    expectation += statevector[row] * rowProduct;
  }
  return expectation;
}

export function expectationFromTerms(terms, statevector) {
  let expectation = 0;
  for (const term of terms) {
    let termExpectation = 0;
    for (let basisIndex = 0; basisIndex < 4; basisIndex += 1) {
      const { outputIndex, phase } = applyPauliToBasis(term.pauli, basisIndex);
      termExpectation += statevector[outputIndex] * phase * statevector[basisIndex];
    }
    expectation += term.coefficient * termExpectation;
  }
  return expectation;
}

export function residualNorm(matrix, vector, eigenvalue) {
  let squaredNorm = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    let value = -eigenvalue * vector[row];
    for (let column = 0; column < matrix.length; column += 1) {
      value += matrix[row][column] * vector[column];
    }
    squaredNorm += value * value;
  }
  return Math.sqrt(squaredNorm);
}
