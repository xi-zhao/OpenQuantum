import { defineScienceTool, objectSchema as obj, arraySchema as arr, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
export const definition = defineScienceTool({
  name: "simulate_cudaq_circuit",
  description: "Build a structured unitary circuit with NVIDIA CUDA-Q and simulate it using the explicitly selected qpp-cpu backend. Return exact probabilities and optional seeded measurement counts in qubit-index order q0,q1,... . Angles use radians; shots=0 skips sampling. No GPU, remote backend or executable-code input. Requires explicitly prepared fixed dependencies.",
  source: { name: "cuda-quantum-cu13", version: "0.16.0", repository: "https://github.com/NVIDIA/cuda-quantum" },
  inputSchema: obj({ ...circuitSchema(undefined, undefined, true), shots: { ...count(0), default: 1024 }, seed: int(0, 4294967295, 42) }),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(1), shots: count(0), seed: int(0, 4294967295),
    backend: { const: "qpp-cpu" }, bitOrder: { const: "q0,q1,... from left to right" },
    outcomes: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, probability: { ...finite(0), maximum: 1 }, count: count(0) }), 1),
    normError: finite(0), networkUsed: { const: false },
  }),
});
