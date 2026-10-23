import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "simulate_myqlm_circuit",
  description: "Simulate a structured noiseless gate circuit with myQLM's explicit local PyLinalg backend. Return full probabilities and complex amplitudes, leftmost bit qubit 0. No default QPU discovery, Qaptiva server or remote execution; explicit environment preparation is required.",
  source: { name: "myqlm", version: "1.13.7", repository: "https://myqlm.github.io/" },
  inputSchema: obj(circuitSchema(undefined, undefined, true)),
  checkInput: checkCircuit,
  resultSchema: obj({ numQubits: count(), bitOrder: { const: "leftmost bit is qubit 0" }, backend: { const: "myQLM PyLinalg" },
    probabilities: arr(finite(0), 1), amplitudes: arr(obj({ real: finite(), imag: finite() }), 1), norm: finite(0),
  }),
});
