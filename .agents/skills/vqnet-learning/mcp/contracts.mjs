import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "differentiate_vqnet_circuit",
  description: "Evaluate a structured unitary circuit with VQNet's CPU VQC simulator, return a real Pauli-Hamiltonian expectation, computational probabilities and SDK autograd derivatives for every RX/RY/RZ angle. Radians; leftmost Pauli/bit is qubit 0. No training, cloud or hardware. Prepare dependencies explicitly.",
  source: { name: "VQNet (pyvqnet)", version: "2.18.1", repository: "https://vqnet20-tutorial.readthedocs.io/en/main/index.html" },
  inputSchema: obj({
    ...circuitSchema(undefined, undefined, true),
    terms: { ...arr(obj({ pauli: { type: "string", pattern: "^[IXYZ]+$" }, coefficient: finite(undefined, 1) }), 1), default: [{ pauli: "ZZ", coefficient: 1 }] },
  }),
  checkInput(v) {
    checkCircuit(v);
    if (v.terms.some(term => term.pauli.length !== v.numQubits)) throw new Error("Each Pauli string must have numQubits letters; leftmost is qubit 0");
  },
  resultSchema: obj({
    numQubits: count(), expectation: finite(), probabilities: arr(finite(0), 1),
    gradients: arr(obj({ gateIndex: count(0), derivative: finite() }), 0),
    backend: { const: "VQNet VQC CPU complex128 autograd" },
    bitOrder: { const: "leftmost bit and Pauli letter is qubit 0" },
  }),
});
