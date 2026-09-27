import { objectSchema as obj, arraySchema as arr } from "./bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "./science-execution.mjs";

export const positive = value => ({ ...finite(0, value), exclusiveMinimum: 0 });
export const seed = { type: "integer", minimum: 0, maximum: 4294967295, default: 7 };
export const operation = gates => obj({ gate: { enum: gates }, qubits: arr(count(0), 1, 3), angleRad: finite(-Number.MAX_VALUE, 0) });
export function checkOperations(v, arities, rotations = []) {
  for (const op of v.operations) {
    if (op.qubits.length !== arities[op.gate]) throw new Error(`${op.gate} requires ${arities[op.gate]} qubits`);
    if (new Set(op.qubits).size !== op.qubits.length || op.qubits.some(q => q >= v.numQubits)) throw new Error("Gate qubits must be distinct and within numQubits");
    if (!rotations.includes(op.gate) && op.angleRad !== 0) throw new Error("angleRad is only valid for rotation gates");
  }
}
export const circuitResult = {
  numQubits: count(), shots: count(),
  counts: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, count: count(1) }), 1),
  nativeGateNames: arr({ type: "string", minLength: 1 }, 1),
  compiledGateCounts: arr(obj({ gate: { type: "string", minLength: 1 }, count: count(1) }), 1),
  bitOrder: { const: "leftmost bit is input qubit 0" },
};
export const analogControls = {
  timeSteps: count(1, 20), atol: positive(1e-9), rtol: positive(1e-9),
  maxSolverSteps: count(1, 100000), solverMaxStepNs: positive(1),
};
export function checkPositions(positions) {
  const seen = new Set();
  for (const [x, y] of positions) {
    const key = `${x},${y}`;
    if (seen.has(key)) throw new Error("Atom positions must be distinct");
    seen.add(key);
  }
}
export const analogResult = {
  timesUs: arr(finite(0), 2), rydbergPopulations: arr(arr(finite(0), 1), 2),
  finalOutcomes: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, probability: finite(0), amplitude: arr(finite(), 2, 2) }), 2),
  maxNormError: finite(0), atomCount: count(), hilbertDimension: count(2),
  compiledDurationNs: count(4), compiledPositionsUm: arr(arr(finite(), 2, 2), 1),
  c6RadPerUsUm6: finite(0), backend: { const: "Pulser QutipEmulator" },
  bitOrder: { const: "leftmost bit is input atom 0; 0=ground, 1=Rydberg" },
  model: { type: "string", minLength: 1 },
  units: obj({ position: { const: "um" }, time: { const: "us" }, angularFrequency: { const: "rad/us" }, phase: { const: "rad" } }),
};
