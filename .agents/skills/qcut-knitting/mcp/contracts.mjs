import { defineScienceTool, objectSchema as obj, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";

import { circuitFields, checkCircuit, circuitMetrics } from "../../../../src/lib/candidate-circuit.mjs";
export const definition = defineScienceTool({
  name: "knit_qcut_circuit",
  description: "Cut two-qubit gates with QCut and reconstruct Pauli expectations using local Aer shots. Explicit cuts preserve operand order; automatic gate cuts first normalize to symmetric CZ. Report gamma-squared overhead and actual backend shots separately. No hardware submission.",
  source: { name: "QCut", version: "2.2.0", repository: "https://github.com/FiQCI/QCut" },
  inputSchema: obj({ ...circuitFields, observables: list({ type: "string", pattern: "^[IXYZ]+$" }), strategy: { enum: ["automatic", "explicit"], default: "automatic" }, gateCuts: { ...list(count(0), 0), uniqueItems: true, default: [] }, partitions: count(2, 2), shots: count(1, 4096), maxBatchSize: count(1, 32), seed: int(0, 2147483647, 3), referenceMode: referenceModeSchema, execution: executionSchema }),
  checkInput(v) {
    checkCircuit(v);
    if (!v.gates.some(g => g.targets.length === 2)) throw new Error("Gate cutting needs at least one two-qubit gate");
    if (v.numQubits < 2 || v.partitions > v.numQubits) throw new Error("Gate cutting needs at least two qubits and partitions no greater than numQubits");
    if (v.observables.some(p => p.length !== v.numQubits)) throw new Error("Observable length must equal numQubits; leftmost character is q0");
    if (v.strategy === "automatic" && v.gateCuts.length) throw new Error("Automatic strategy does not accept explicit gateCuts");
    if (v.strategy === "explicit" && (!v.gateCuts.length || v.gateCuts.some(i => !v.gates[i] || v.gates[i].targets.length !== 2))) throw new Error("Explicit cuts require valid two-qubit gate indices in the original gate list");
  },
  resultSchema: referenceAwareResultSchema({ estimates: list(finite()), exactExpectations: nullable(list(finite())), maxAbsoluteError: nullable(finite(0)), gamma: finite(1), theoreticalSamplingOverhead: finite(1), cutCount: count(0), subcircuitWidths: list(count(1)), generatedCircuits: count(1), original: circuitMetrics, prepared: circuitMetrics, preprocessing: { enum: ["u,cz at Qiskit level 0; symmetric gate cuts only", "explicit original gate indices and operand order"] }, executionCost: obj({ jobs: count(1), submittedCircuits: count(1), completedCircuits: count(1), actualShots: count(1) }), expansion: { const: "exact QPD; finite-shot Aer execution; no wire communication or consolidation" }, observableConvention: { const: "leftmost Pauli is q0" } }, ["exactExpectations", "maxAbsoluteError"]),
});
