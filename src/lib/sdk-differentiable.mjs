import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "./bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "./science-execution.mjs";

const rotations = new Set(["RX", "RY", "RZ"]);
const twoQubit = new Set(["CX", "CZ", "SWAP"]);
const gateNames = ["H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ", "CX", "CZ", "SWAP"];

// A common interchange convention; every backend computes with its own SDK.
export function differentiableCircuitDefinition({ name, source, backend, gradientMethod }) {
  return defineScienceTool({
    name, source,
    description: `Simulate a user-specified ideal qubit circuit and differentiate Pauli expectations using ${source.name}. All qubits start in |0>. Supports H/X/Y/Z/S/T/RX/RY/RZ/CX/CZ/SWAP; angles in radians. trainableGateIndices selects independent rotation angles; Jacobian rows follow observables and columns follow those indices. CPU local execution, no shots or cloud/QPU. Returns unmodified numerical state amplitudes/probabilities and expectations. Dependencies require explicit setup.`,
    inputSchema: obj({
      numQubits: count(1, 2),
      gates: { ...arr(obj({ gate: { enum: gateNames }, targets: arr(count(0), 1, 2), angle: finite() }, ["gate", "targets"]), 0), default: [{ gate: "RY", targets: [0], angle: 0.4 }, { gate: "CX", targets: [0, 1] }] },
      observables: { ...arr({ type: "string", pattern: "^[IXYZ]+$" }, 1), default: ["ZI", "IZ", "XX"] },
      trainableGateIndices: { ...arr(count(0), 0), default: [0] },
    }),
    checkInput(value) {
      for (const { gate, targets, angle } of value.gates) {
        if (targets.length !== (twoQubit.has(gate) ? 2 : 1) || new Set(targets).size !== targets.length || targets.some(q => q >= value.numQubits)) throw new Error("Gate targets must be distinct, in range, and match gate arity");
        if (rotations.has(gate) !== (angle !== undefined)) throw new Error("Only rotation gates require an angle in radians");
      }
      if (value.observables.some(word => word.length !== value.numQubits)) throw new Error("Every Pauli word must contain one character per qubit, left to right q0,q1,...");
      if (new Set(value.trainableGateIndices).size !== value.trainableGateIndices.length) throw new Error("trainableGateIndices must be distinct");
      if (value.trainableGateIndices.some(index => index >= value.gates.length || !rotations.has(value.gates[index].gate))) throw new Error("Every trainable index must select an RX, RY or RZ gate");
    },
    resultSchema: obj({
      numQubits: count(),
      amplitudes: arr(arr(finite(), 2, 2), 2),
      probabilities: arr(finite(0), 2),
      stateNormSquared: finite(0),
      expectations: arr(finite(), 1),
      jacobian: arr(arr(finite(), 0), 1),
      trainableGateIndices: arr(count(0), 0),
      bitOrder: { const: "lexicographic bitstrings q0 q1 ...; q0 is the leftmost, most significant bit" },
      angleUnit: { const: "rad" },
      backend: { const: backend },
      gradientMethod: { const: gradientMethod },
    }),
  });
}
