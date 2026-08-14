const GOLDEN_RATIO_CONJUGATE = (Math.sqrt(5) - 1) / 2;
const TWO_PI = 2 * Math.PI;

export function canonicalizePeriodicAngle(thetaRadians) {
  if (!Number.isFinite(thetaRadians)) {
    throw new Error("Optimizer angle must be finite");
  }
  const wrapped = ((thetaRadians + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

function unwrapNeighbour(coarseAngle, centreAngle, direction) {
  let delta = coarseAngle - centreAngle;
  if (direction < 0 && delta >= 0) {
    delta -= TWO_PI;
  }
  if (direction > 0 && delta <= 0) {
    delta += TWO_PI;
  }
  return centreAngle + delta;
}

export function minimizePeriodicAngle(energyAtTheta, options) {
  const { coarsePoints, angleToleranceRadians, maxEvaluations } = options;
  const uniqueCoarsePointCount = coarsePoints - 1;
  if (
    !Number.isSafeInteger(uniqueCoarsePointCount) ||
    uniqueCoarsePointCount < 3 ||
    !Number.isFinite(angleToleranceRadians) ||
    angleToleranceRadians <= 0 ||
    !Number.isSafeInteger(maxEvaluations) ||
    maxEvaluations < 1
  ) {
    throw new Error("Invalid deterministic optimizer options");
  }
  const trace = [];
  let best;

  function evaluate(thetaRadians, phase) {
    if (trace.length >= maxEvaluations) {
      return undefined;
    }
    const canonicalThetaRadians = canonicalizePeriodicAngle(thetaRadians);
    const energyHartree = energyAtTheta(canonicalThetaRadians);
    if (!Number.isFinite(energyHartree)) {
      throw new Error("Statevector expectation produced a non-finite energy");
    }
    if (!best || energyHartree < best.energyHartree) {
      best = { thetaRadians: canonicalThetaRadians, energyHartree };
    }
    const entry = {
      evaluation: trace.length + 1,
      phase,
      thetaRadians: canonicalThetaRadians,
      energyHartree,
      bestEnergyHartree: best.energyHartree,
    };
    trace.push(entry);
    return energyHartree;
  }

  const lowerBound = -Math.PI;
  const coarseStep = TWO_PI / uniqueCoarsePointCount;
  const coarseAngles = Array.from(
    { length: uniqueCoarsePointCount },
    (_, index) => lowerBound + index * coarseStep,
  );
  const coarseEnergies = [];
  for (const coarseAngle of coarseAngles) {
    const energy = evaluate(coarseAngle, "coarse");
    if (energy === undefined) {
      break;
    }
    coarseEnergies.push(energy);
  }

  if (coarseEnergies.length < uniqueCoarsePointCount) {
    return {
      best,
      trace,
      converged: false,
      terminationReason: "evaluation-budget",
      finalBracketWidthRadians: null,
      coarsePointsEvaluated: coarseEnergies.length,
      refinementEvaluations: 0,
    };
  }

  let bestCoarseIndex = 0;
  for (let index = 1; index < coarseEnergies.length; index += 1) {
    if (coarseEnergies[index] < coarseEnergies[bestCoarseIndex]) {
      bestCoarseIndex = index;
    }
  }
  const leftNeighbourIndex =
    (bestCoarseIndex - 1 + uniqueCoarsePointCount) % uniqueCoarsePointCount;
  const rightNeighbourIndex = (bestCoarseIndex + 1) % uniqueCoarsePointCount;
  const centre = coarseAngles[bestCoarseIndex];
  let left = unwrapNeighbour(coarseAngles[leftNeighbourIndex], centre, -1);
  let right = unwrapNeighbour(coarseAngles[rightNeighbourIndex], centre, 1);
  let innerLeft = right - GOLDEN_RATIO_CONJUGATE * (right - left);
  let innerRight = left + GOLDEN_RATIO_CONJUGATE * (right - left);
  let innerLeftEnergy = evaluate(innerLeft, "refine");
  let innerRightEnergy = evaluate(innerRight, "refine");

  while (
    right - left > angleToleranceRadians &&
    innerLeftEnergy !== undefined &&
    innerRightEnergy !== undefined &&
    trace.length < maxEvaluations
  ) {
    if (innerLeftEnergy < innerRightEnergy) {
      right = innerRight;
      innerRight = innerLeft;
      innerRightEnergy = innerLeftEnergy;
      innerLeft = right - GOLDEN_RATIO_CONJUGATE * (right - left);
      innerLeftEnergy = evaluate(innerLeft, "refine");
    } else {
      left = innerLeft;
      innerLeft = innerRight;
      innerLeftEnergy = innerRightEnergy;
      innerRight = left + GOLDEN_RATIO_CONJUGATE * (right - left);
      innerRightEnergy = evaluate(innerRight, "refine");
    }
  }

  const converged = right - left <= angleToleranceRadians;
  if (converged && trace.length < maxEvaluations) {
    evaluate((left + right) / 2, "final");
  }
  return {
    best,
    trace,
    converged,
    terminationReason: converged ? "angle-tolerance" : "evaluation-budget",
    finalBracketWidthRadians: right - left,
    coarsePointsEvaluated: uniqueCoarsePointCount,
    refinementEvaluations: trace.filter((entry) => entry.phase !== "coarse").length,
  };
}
