import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
const metrics = obj({ gates: int(0), twoQubitGates: int(0), tCount: int(0) });
export const definition = defineScienceTool({
  name: "optimize_pyzx_circuit",
  description: "Optimize Clifford+T circuits through PyZX ZX rewriting and extraction. Return input/output OpenQASM 2 and gate counts. Independent full-unitary comparison is optional; circuit size is determined by the user's resources. No measurements, hardware routing or guaranteed gate-count improvement.",
  source: { name: "pyzx", version: "0.10.6", repository: "https://github.com/zxcalc/pyzx" },
  inputSchema: obj({ ...circuitSchema(), referenceMode: referenceModeSchema }),
  checkInput: checkCircuit,
  resultSchema: referenceAwareResultSchema({ inputQasm: { type: "string", minLength: 1 }, optimizedQasm: { type: "string", minLength: 1 }, before: metrics, after: metrics, unitaryMaxError: nullable(num(0, 2)), equivalenceTolerance: nullable({ const: 1e-8 }), equivalentUpToGlobalPhase: nullable({ type: "boolean" }), bitOrder: { const: "left-to-right q0,q1,..." } }, ["unitaryMaxError", "equivalenceTolerance", "equivalentUpToGlobalPhase"]),
});
