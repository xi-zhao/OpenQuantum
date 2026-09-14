import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const series = arr(arr(num(-1.0001,1.0001),3),2);
export const definition = defineScienceTool({
  name: "simulate_tjm_dynamics",
  description: "Run MQT YAQS tensor-jump trajectories for an open transverse-field Ising chain with local amplitude damping. Chain, trajectory, time-grid and bond dimensions follow user inputs. Dense Lindblad reference is optional.",
  source: { name: "mqt.yaqs", version: "0.6.0", repository: "https://github.com/munich-quantum-toolkit/yaqs" },
  inputSchema: obj({ numQubits: int(2,undefined,3), coupling: num(undefined,undefined,1), field: num(undefined,undefined,0.5), dampingRate: num(0,undefined,0.1), duration: num(0.01,undefined,0.5), steps: int(2,undefined,10), trajectories: int(8,undefined,32), maxBondDimension: int(2,undefined,16), seed: int(0,2147483647,7), referenceMode: referenceModeSchema }),
  resultSchema: referenceAwareResultSchema({ times: arr(num(0,undefined),3), siteZ: series, referenceSiteZ: nullable(series), standardErrors: arr(arr(num(0,undefined),3),2), maxAbsoluteDeviation: nullable(num(0,undefined)), effectiveTrajectories: int(1,undefined), hamiltonian: { const: "-J sum Z_i Z_(i+1) - g sum X_i; hbar=1" }, jumpOperator: { const: "sqrt(gamma) |0><1| at every site" }, referenceTraceError: nullable(num(0,undefined)) }, ["referenceSiteZ", "maxAbsoluteDeviation", "referenceTraceError"]),
});
