import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "simulate_mqt_ddsim",
  description: "Simulate a structured unitary circuit locally with MQT DDSIM decision diagrams and sample terminal computational-basis measurements. Optional explicit dense state vector. Angles are radians; result bitstrings run from q[n-1] to q[0]. No noise approximation, arbitrary QASM input, cloud or QPU.",
  source: { name: "mqt-ddsim", version: "2.6.0", repository: "https://github.com/munich-quantum-toolkit/ddsim" },
  inputSchema: obj({
    ...circuitSchema(undefined, undefined, true), shots: count(1, 1024), seed: count(0, 42),
    includeStatevector: { type: "boolean", default: false },
  }),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(), shots: count(), seed: count(0),
    counts: arr(obj({ bitstring: { type: "string", pattern: "^[01]+$" }, count: count() }), 1),
    statevector: { anyOf: [arr(obj({ real: finite(), imag: finite() }), 1), { type: "null" }] },
    backend: { const: "MQT DDSIM exact decision-diagram circuit simulator" },
    bitOrder: { const: "q[n-1]...q[0]; statevector index is the bitstring's binary value" },
  }),
});
