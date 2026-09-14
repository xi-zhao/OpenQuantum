import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable, checkReferenceRequest } from "../../../../src/lib/science-reference.mjs";
const series = arr(arr(num(-1.0001,1.0001),3,81),2,128);
export const definition = defineScienceTool({
  name: "simulate_tjm_dynamics",
  description: "Run MQT YAQS tensor-jump trajectories for a 2–128 qubit open transverse-field Ising chain with local amplitude damping, within tensor and trajectory budgets. Dense Lindblad reference is optional and limited to 6 qubits.",
  source: { name: "mqt.yaqs", version: "0.6.0", repository: "https://github.com/munich-quantum-toolkit/yaqs" },
  inputSchema: obj({ numQubits: int(2,128,3), coupling: num(-2,2,1), field: num(-2,2,0.5), dampingRate: num(0,1,0.1), duration: num(0.01,2,0.5), steps: int(2,80,10), trajectories: int(8,128,32), maxBondDimension: int(2,64,16), seed: int(0,2147483647,7), referenceMode: referenceModeSchema }),
  checkInput(v) {
    checkReferenceRequest(v.referenceMode, v.numQubits, 6, "Dense Lindblad");
    if (v.steps * v.trajectories > 4096) throw new Error("steps times trajectories must not exceed 4096");
    if (v.numQubits * v.steps * v.trajectories * v.maxBondDimension ** 3 > 2147483648) throw new Error("Tensor trajectory work budget exceeded; reduce sites, steps, trajectories or bond dimension");
  },
  resultSchema: referenceAwareResultSchema({ times: arr(num(0,2.1),3,81), siteZ: series, referenceSiteZ: nullable(series), standardErrors: arr(arr(num(0,2),3,81),2,128), maxAbsoluteDeviation: nullable(num(0,2.001)), effectiveTrajectories: int(1,128), hamiltonian: { const: "-J sum Z_i Z_(i+1) - g sum X_i; hbar=1" }, jumpOperator: { const: "sqrt(gamma) |0><1| at every site" }, referenceTraceError: nullable(num(0,0.01)) }, ["referenceSiteZ", "maxAbsoluteDeviation", "referenceTraceError"]),
});
