import { residualNorm } from "./pauli-statevector.mjs";

export function solveExactRealSymmetricTwoByTwo(sectorMatrix) {
  const a = sectorMatrix[0][0];
  const b = (sectorMatrix[0][1] + sectorMatrix[1][0]) / 2;
  const d = sectorMatrix[1][1];
  const center = (a + d) / 2;
  const diagonalHalfDifference = (a - d) / 2;
  const radius = Math.hypot(diagonalHalfDifference, b);
  const eigenvaluesHartree = [center - radius, center + radius];

  let thetaRadians = 0;
  if (radius > 0) {
    thetaRadians = Math.atan2(-b, -diagonalHalfDifference);
  }
  const groundStateSectorAmplitudes = [
    Math.cos(thetaRadians / 2),
    Math.sin(thetaRadians / 2),
  ];
  const groundEnergyHartree = eigenvaluesHartree[0];
  return {
    eigenvaluesHartree,
    groundEnergyHartree,
    groundStateSectorAmplitudes,
    eigenResidualHartree: residualNorm(
      sectorMatrix,
      groundStateSectorAmplitudes,
      groundEnergyHartree,
    ),
    spectralGapHartree: eigenvaluesHartree[1] - eigenvaluesHartree[0],
  };
}
