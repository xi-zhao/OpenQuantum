import { nullable, referenceAwareResultSchema, referenceModeSchema } from "../../../../src/lib/science-reference.mjs";
import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
const series = arr(num(-0.001, 1.001), 3);
export const definition = defineScienceTool({
  name: "simulate_dynamiqs_dynamics",
  description: "Simulate a driven amplitude-damped qubit, sweep drive amplitudes and differentiate final population with Dynamiqs. Sampling resolution and batch size follow user inputs; independent Lindblad and finite-difference references are optional.",
  source: { name: "dynamiqs", version: "0.3.6", repository: "https://github.com/dynamiqs/dynamiqs", commit: "a49b30fe5cacb5cf7c1d981f2e7ed03b18e05318" },
  inputSchema: obj({ referenceMode: referenceModeSchema, drives: { ...arr(num(undefined,undefined), 1), default: [0.5, 1] }, detuning: num(undefined,undefined,0), dampingRate: num(0,undefined,0.1), duration: num(0.01,undefined,1), steps: int(2,undefined, 20), initialState: { type: "string", enum: ["ground", "excited", "plus"], default: "ground" } }),
  resultSchema: referenceAwareResultSchema({ times: arr(num(0,undefined), 3), excitedPopulations: arr(series, 1), referencePopulations: nullable(arr(series, 1)), driveGradients: arr(num(undefined,undefined), 1), finiteDifferenceGradients: nullable(arr(num(undefined,undefined), 1)), maxPopulationDeviation: nullable(num(0)), maxGradientDeviation: nullable(num(0)), maxTraceError: num(0, 1), minimumEigenvalue: num(-1, 1), model: { const: "H=(drive X + detuning Z)/2; L=sqrt(gamma)|0><1|; hbar=1" }, device: { type: "string", minLength: 1 } }, ["referencePopulations", "finiteDifferenceGradients", "maxPopulationDeviation", "maxGradientDeviation"]),
});
