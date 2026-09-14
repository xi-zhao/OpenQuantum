import { arraySchema as arr, integerSchema as int, numberSchema as num, objectSchema as obj } from "./bounded-science-mcp.mjs";

export const CLIFFORD_T_GATES = ["H", "S", "T", "X", "Y", "Z", "CX", "CZ"];
export function circuitSchema(maxQubits, maxGates, rotations = false) {
  const properties = { gate: { type: "string", enum: [...CLIFFORD_T_GATES, ...(rotations ? ["RX", "RY", "RZ"] : [])] }, targets: arr(int(0, maxQubits === undefined ? undefined : maxQubits - 1), 1, 2) };
  if (rotations) properties.angle = num();
  return {
    numQubits: int(1, maxQubits, 2),
    gates: { ...arr(obj(properties, ["gate", "targets"]), 1, maxGates), default: [{ gate: "H", targets: [0] }, { gate: "T", targets: [0] }, { gate: "T", targets: [0] }, { gate: "CX", targets: [0, 1] }] },
  };
}
export function checkCircuit(v) {
  for (const { gate, targets, angle } of v.gates) {
    if (targets.length !== (["CX", "CZ"].includes(gate) ? 2 : 1) || new Set(targets).size !== targets.length || targets.some(q => q >= v.numQubits)) throw new Error("Gate targets must be distinct, in range, and match gate arity");
    if (["RX", "RY", "RZ"].includes(gate) !== (angle !== undefined)) throw new Error("Only rotation gates require an angle in radians");
  }
}
