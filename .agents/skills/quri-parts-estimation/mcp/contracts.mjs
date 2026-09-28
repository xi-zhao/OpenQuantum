import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "estimate_quri_observable",
  description: "Evaluate a real Pauli Hamiltonian on a structured unitary circuit using QURI Parts and the exact local Qulacs state-vector estimator. Pauli strings put qubit 0 on the left; angles are radians. No shots, optimizer, cloud or hardware. Dependencies require explicit preparation.",
  source: { name: "quri-parts + qulacs", version: "0.27.0 + 0.6.14", repository: "https://github.com/QunaSys/quri-sdk" },
  inputSchema: obj({
    ...circuitSchema(undefined, undefined, true),
    terms: { ...arr(obj({ pauli: { type: "string", pattern: "^[IXYZ]+$" }, coefficient: finite(undefined, 1) }), 1), default: [{ pauli: "ZZ", coefficient: 1 }] },
  }),
  checkInput(v) {
    checkCircuit(v);
    if (v.terms.some(term => term.pauli.length !== v.numQubits)) throw new Error("Every Pauli string must have numQubits letters, with qubit 0 on the left");
  },
  resultSchema: obj({
    numQubits: count(), expectation: finite(), imaginaryResidual: finite(0),
    estimatorError: { const: 0 }, backend: { const: "QURI Parts Qulacs vector estimator" },
    pauliConvention: { const: "leftmost letter is qubit 0" },
  }),
});
