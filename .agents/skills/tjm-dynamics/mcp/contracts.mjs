import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const series = list(list(num(-1.0001,1.0001),3),2);
const standardErrors = list(list(num(0,2),3),2);
const resultSchema = referenceAwareResultSchema({ times: list(finite(0),3), siteZ: series, referenceSiteZ: nullable(series), standardErrors: nullable(standardErrors), standardErrorStatus: { enum: ["estimated", "deterministic", "insufficient_trajectories"] }, maxAbsoluteDeviation: nullable(num(0,2.001)), effectiveTrajectories: count(), hamiltonian: { const: "-J sum Z_i Z_(i+1) - g sum X_i; hbar=1" }, jumpOperator: { const: "sqrt(gamma) |0><1| at every site" }, referenceTraceError: nullable(num(0,0.01)) }, ["referenceSiteZ", "maxAbsoluteDeviation", "referenceTraceError"]);
resultSchema.allOf.push({
  if: { properties: { standardErrorStatus: { const: "insufficient_trajectories" } } },
  then: { properties: { standardErrors: { type: "null" }, effectiveTrajectories: { const: 1 } } },
  else: { properties: { standardErrors } },
});
export const definition = defineScienceTool({
  name: "simulate_tjm_dynamics",
  description: "Simulate open transverse-field Ising dynamics with MQT YAQS tensor-jump trajectories and local amplitude damping. Return site observables and trajectory statistics, with optional independent Lindblad evolution. Choose chain size and numerical resolution for your compute resources.",
  source: { name: "mqt.yaqs", version: "0.6.0", repository: "https://github.com/munich-quantum-toolkit/yaqs" },
  inputSchema: obj({ numQubits: count(2,3), coupling: num(-2,2,1), field: num(-2,2,0.5), dampingRate: num(0,1,0.1), duration: finite(Number.MIN_VALUE,0.5), steps: count(2,10), trajectories: count(1,32), maxBondDimension: count(2,16), seed: int(0,2147483647,7), referenceMode: referenceModeSchema, execution: executionSchema }),
  resultSchema,
});
