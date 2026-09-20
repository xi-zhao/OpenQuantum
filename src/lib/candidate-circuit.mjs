import { objectSchema as obj } from "./bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list } from "./science-execution.mjs";
export const circuitFields = {
  numQubits: count(1, 2),
  gates: list(obj({ gate: { enum: ["H", "X", "Y", "Z", "S", "SDG", "T", "TDG", "RX", "RY", "RZ", "CX", "CZ", "SWAP"] }, targets: list(count(0)), angle: finite() }, ["gate", "targets"]), 0),
};
export function checkCircuit(v) {
  for (const g of v.gates) {
    const arity = ["CX", "CZ", "SWAP"].includes(g.gate) ? 2 : 1;
    if (g.targets.length !== arity || new Set(g.targets).size !== arity || g.targets.some(q => q >= v.numQubits)) throw new Error("Gate targets must have correct arity, be distinct and lie inside the circuit");
    if (["RX", "RY", "RZ"].includes(g.gate) !== Object.hasOwn(g, "angle")) throw new Error("Exactly rotation gates require angle (radians)");
  }
}
export const pauliTerms = list(obj({ pauli: { type: "string", pattern: "^[IXYZ]+$" }, coefficient: finite() }));
export function checkPaulis(v, terms = v.terms) {
  if (terms.some(t => t.pauli.length !== v.numQubits)) throw new Error("Pauli length must equal numQubits; leftmost character is q0");
  if (new Set(terms.map(t => t.pauli)).size !== terms.length) throw new Error("Combine duplicate Pauli strings");
}
export const circuitMetrics = obj({ gates: count(0), depth: count(0), twoQubitGates: count(0), cxInCommonBasis: count(0) });
