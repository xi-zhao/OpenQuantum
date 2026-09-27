import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

const stats = obj({ gates: count(0), depth: count(0), twoQubitGates: count(0), gateCounts: arr(obj({ gate: { type: "string" }, count: count() }), 0) });
export const definition = defineScienceTool({
  name: "compile_pytket_circuit",
  description: "Optimize a unitary structured gate circuit using Quantinuum pytket FullPeepholeOptimise, without implicit wire swaps, and rebase to CX/Rx/Ry/Rz. Input rotation angles use radians. Return OpenQASM 2, the separate global phase in radians and before/after gate resources. No routing, QPU or cloud. Requires explicitly prepared dependencies.",
  source: { name: "pytket", version: "2.18.4", repository: "https://github.com/Quantinuum/tket" },
  inputSchema: obj({ ...circuitSchema(undefined, undefined, true), optimize: { type: "boolean", default: true } }),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(), before: stats, after: stats,
    qasm: { type: "string", minLength: 1 }, globalPhaseRadians: finite(),
    nativeGates: arr({ type: "string", enum: ["CX", "Rx", "Ry", "Rz"] }, 4, 4),
    backend: { const: "pytket FullPeepholeOptimise + AutoRebase" },
    qubitMapping: { const: "q[i] retains input qubit i; implicit swaps disabled" },
  }),
});
