import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "simulate_qibo_circuit",
  description: "Simulate a structured ideal unitary circuit from |0...0> with Qibo NumPy complex128. H/S/T/X/Y/Z/CX/CZ and RX/RY/RZ in radians; return exact numerical amplitudes and probabilities with qubit zero leftmost. No cloud, credentials, sampling or hardware. Requires explicit dependency preparation.",
  source: {"name": "qibo", "version": "0.3.5", "repository": "https://github.com/qiboteam/qibo"},
  inputSchema: obj(circuitSchema(undefined, undefined, true)),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(),
    outcomes: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, probability: finite(0), amplitude: arr(finite(), 2, 2) }), 2),
    normError: finite(0), backend: { const: "Qibo NumPy complex128" },
    bitOrder: { const: "leftmost bit is qubit 0" },
  }),
});
