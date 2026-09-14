import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
const series = arr(num(-0.001, 1.001), 3, 101);
export const definition = defineScienceTool({
  name: "simulate_dynamiqs_dynamics",
  description: "Simulate a driven amplitude-damped qubit using pinned Dynamiqs on CPU. Sweep drive amplitudes and differentiate final excited population with respect to drive; compare against an independent dense Lindblad integration and finite differences. No hardware or arbitrary code.",
  source: { name: "dynamiqs", version: "0.3.6", repository: "https://github.com/dynamiqs/dynamiqs", commit: "a49b30fe5cacb5cf7c1d981f2e7ed03b18e05318" },
  inputSchema: obj({ drives: { ...arr(num(-3, 3), 1, 8), default: [0.5, 1] }, detuning: num(-3, 3, 0), dampingRate: num(0, 2, 0.1), duration: num(0.01, 5, 1), steps: int(2, 100, 20), initialState: { type: "string", enum: ["ground", "excited", "plus"], default: "ground" } }),
  resultSchema: obj({ times: arr(num(0, 5), 3, 101), excitedPopulations: arr(series, 1, 8), referencePopulations: arr(series, 1, 8), driveGradients: arr(num(-20, 20), 1, 8), finiteDifferenceGradients: arr(num(-20, 20), 1, 8), maxPopulationDeviation: num(0, 2), maxGradientDeviation: num(0, 40), maxTraceError: num(0, 1), minimumEigenvalue: num(-1, 1), model: { const: "H=(drive X + detuning Z)/2; L=sqrt(gamma)|0><1|; hbar=1" }, device: { const: "cpu" } }),
});
