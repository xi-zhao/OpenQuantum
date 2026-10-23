import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "simulate_qcompute_circuit",
  description: "Simulate a structured ideal unitary circuit from |0...0> with QCompute local_baidu_sim2 output_state. H/S/T/X/Y/Z/CX/CZ and RX/RY/RZ in radians; return exact numerical amplitudes and probabilities with qubit zero leftmost. No cloud, credentials, sampling or hardware. Requires explicit dependency preparation.",
  source: {"name": "QCompute", "version": "3.3.5", "repository": "https://github.com/baidu/QCompute"},
  inputSchema: obj(circuitSchema(undefined, undefined, true)),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(),
    outcomes: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, probability: finite(0), amplitude: arr(finite(), 2, 2) }), 2),
    globalPhaseCorrectionRadians: finite(), normError: finite(0), backend: { const: "QCompute local_baidu_sim2 output_state" },
    bitOrder: { const: "leftmost bit is qubit 0" },
  }),
});
