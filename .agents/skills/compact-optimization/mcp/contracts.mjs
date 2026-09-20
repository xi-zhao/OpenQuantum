import { defineScienceTool, objectSchema as obj } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";

import { circuitFields, checkCircuit, circuitMetrics } from "../../../../src/lib/candidate-circuit.mjs";
export const definition = defineScienceTool({
  name: "optimize_compact_circuit",
  description: "Optimize a unitary gate list with fixed Compact. Independently compare complete Qiskit unitaries up to global phase when requested; reject mismatches. Report native two-qubit counts and equal u/cx-basis cost separately. An unchecked candidate is not certified.",
  source: { name: "Compact", version: "0.2.1", repository: "https://github.com/Q-PROOF/Compact" },
  inputSchema: obj({ ...circuitFields, searchDepth: count(1, 2), objective: { enum: ["2q", "depth", "gate_count"], default: "2q" }, referenceMode: referenceModeSchema, execution: executionSchema }),
  checkInput: checkCircuit,
  resultSchema: referenceAwareResultSchema({ original: circuitMetrics, optimized: circuitMetrics, optimizedOpenQasm: { type: "string", minLength: 1 }, exportedBasis: { const: "OpenQASM 2 u3,cx; independently checked after parsing when reference runs" }, upstreamVerification: obj({ status: { enum: ["computed", "not_run"] }, equivalent: nullable({ type: "boolean" }), tier: nullable(count(0)), method: { type: "string" } }), independentEquivalent: nullable({ type: "boolean" }), processFidelity: nullable(finite(0)), maxUnitaryDeviation: nullable(finite(0)), commonBasis: { const: "u,cx; optimization_level=0; no hardware routing" }, globalPhaseIgnored: { const: true } }, ["independentEquivalent", "processFidelity", "maxUnitaryDeviation"]),
});
