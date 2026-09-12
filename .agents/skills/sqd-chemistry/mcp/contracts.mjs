import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
const counts = { type: "object", minProperties: 1, maxProperties: 16, patternProperties: { "^[01]{4}$": int(1, 4096) }, additionalProperties: false };
export const definition = defineScienceTool({
  name: "run_sqd_chemistry",
  description: "Run Qiskit SQD for H2/STO-3G at a chosen bond length, with supplied four-bit counts or explicitly synthetic samples, and compare with FCI. Local setup may download pinned dependencies.",
  source: { name: "qiskit-addon-sqd", version: "0.13.1", repository: "https://github.com/Qiskit/qiskit-addon-sqd" },
  inputSchema: obj({ bondLengthAngstrom: num(0.3, 3, 0.735), shots: int(64, 4096, 256), samplesPerBatch: int(4, 64, 16), iterations: int(1, 10, 3), seed: int(0, 2147483647, 7), counts }, ["bondLengthAngstrom", "shots", "samplesPerBatch", "iterations", "seed"]),
  checkInput(v) { if (v.counts && Object.values(v.counts).reduce((a,b) => a+b,0) > 4096) throw new Error("At most 4096 supplied counts"); },
  resultSchema: obj({ energyHartree: num(-100,100), fciEnergyHartree: num(-100,100), hfEnergyHartree: num(-100,100), errorHartree: num(-100,100), nuclearEnergyHartree: num(0,100), occupancies: arr(arr(num(-0.000001,1.000001),2,2),2,2), iterationEnergiesHartree: arr(num(-100,100),1,10), sampleSource: { enum: ["supplied_counts","synthetic_uniform"] }, totalShots: int(1,4096), spatialOrbitals: { const: 2 }, electrons: { const: [1,1] }, bitOrder: { const: "beta1 beta0 alpha1 alpha0" } }),
});
