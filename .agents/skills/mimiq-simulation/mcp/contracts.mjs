import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "simulate_mimiq_circuit",
  description: "Simulate a structured noiseless gate circuit locally with MIMIQ Exaqt; return exact probabilities/amplitudes and optional seeded samples. Leftmost output bit is qubit 0. No cloud connection, arbitrary code or credential input; dependencies require explicit setup.",
  source: { name: "mimiq-exaqt", version: "0.3.0", repository: "https://docs.qperfect.io/exaqt-python/" },
  inputSchema: obj({ ...circuitSchema(undefined, undefined, true), shots: count(0, 0), seed: count(0, 7) }),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(), bitOrder: { const: "leftmost bit is qubit 0" }, backend: { const: "MIMIQ ExaqtSV" },
    probabilities: arr(finite(0), 1), amplitudes: arr(obj({ real: finite(), imag: finite() }), 1),
    counts: arr(obj({ bitstring: { type: "string", pattern: "^[01]+$" }, count: count() }), 0),
    norm: finite(0),
  }),
});
