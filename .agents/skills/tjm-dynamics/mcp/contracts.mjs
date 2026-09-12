import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
const series = arr(arr(num(-1.0001,1.0001),2,81),2,6);
export const definition = defineScienceTool({
  name: "simulate_tjm_dynamics",
  description: "Run bounded MQT YAQS tensor-jump trajectories for an open transverse-field Ising chain with local amplitude damping; compare site Z expectations with dense Lindblad integration.",
  source: { name: "mqt.yaqs", version: "0.6.0", repository: "https://github.com/munich-quantum-toolkit/yaqs" },
  inputSchema: obj({ numQubits: int(2,6,3), coupling: num(-2,2,1), field: num(-2,2,0.5), dampingRate: num(0,1,0.1), duration: num(0.01,2,0.5), steps: int(2,80,10), trajectories: int(8,128,32), maxBondDimension: int(2,32,16), seed: int(0,2147483647,7) }),
  checkInput(v) { if (v.steps * v.trajectories > 4096) throw new Error("steps times trajectories must not exceed 4096"); },
  resultSchema: obj({ times: arr(num(0,2.1),2,81), siteZ: series, referenceSiteZ: series, standardErrors: arr(arr(num(0,2),2,81),2,6), maxAbsoluteDeviation: num(0,2.001), effectiveTrajectories: int(1,128), hamiltonian: { const: "-J sum Z_i Z_(i+1) - g sum X_i; hbar=1" }, jumpOperator: { const: "sqrt(gamma) |0><1| at every site" }, referenceTraceError: num(0,0.01) }),
});
