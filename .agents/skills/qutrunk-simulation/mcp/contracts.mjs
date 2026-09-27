import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "simulate_qutrunk_circuit",
  description: "Simulate a user-defined unitary gate circuit with qutrunk's real local simulator. All-zero input, H/S/T/X/Y/Z/CX/CZ and RX/RY/RZ angles in radians. Return exact numerical amplitudes and probabilities with qubit zero leftmost, norm error and serialized native program. No cloud, QVM service or hardware. Requires explicitly prepared dependencies.",
  source: { name: "qutrunk", version: "0.2.2", repository: "https://github.com/qudoor/qutrunk" },
  inputSchema: obj(circuitSchema(undefined, undefined, true)),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(),
    outcomes: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, probability: finite(0), amplitude: arr(finite(), 2, 2) }), 2),
    normError: finite(0),
    backend: { const: "QuTrunk BackendLocal" },
    program: { type: "string", minLength: 1 },
    bitOrder: { const: "leftmost bit is qubit 0" },
  }),
});
