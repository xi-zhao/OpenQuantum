import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "simulate_quairkit_channel",
  description: "Use QuAIRKit on CPU complex128 to simulate a unitary structured circuit from |0...0>, followed by ordered local amplitude-damping, phase-damping or depolarizing channels. Return density matrix, probabilities, trace, purity and Hermiticity residual. Qubit zero is leftmost; rotations in radians. Explicit setup required; no hardware or cloud.",
  source: { name: "quairkit", version: "0.5.1", repository: "https://github.com/QuAIR/QuAIRKit" },
  inputSchema: obj({
    ...circuitSchema(undefined, undefined, true),
    channels: { ...arr(obj({ channel: { enum: ["amplitude_damping", "phase_damping", "depolarizing"] }, target: count(0), strength: { ...finite(0), maximum: 1 } }), 0), default: [] },
  }),
  checkInput(v) {
    checkCircuit(v);
    for (const c of v.channels) if (c.target >= v.numQubits) throw new Error("Channel target must be within numQubits");
  },
  resultSchema: obj({
    numQubits: count(), densityMatrix: arr(arr(arr(finite(), 2, 2), 2), 2),
    outcomes: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, probability: finite() }), 2),
    trace: arr(finite(), 2, 2), purity: finite(), hermiticityError: finite(0),
    backend: { const: "QuAIRKit CPU complex128 density matrix" }, bitOrder: { const: "leftmost bit is qubit 0" },
  }),
});
