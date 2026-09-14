import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
export const definition = defineScienceTool({
  name: "simulate_oqupy_spin_boson",
  description: "Run bounded OQuPy TEMPO spin-boson dynamics with an Ohmic exponential-cutoff bath, finite memory and fixed SVD tolerance. Return Bloch components, bath conventions and numerical state checks. No Markovian approximation is imposed; convergence is not presumed.",
  source: { name: "oqupy", version: "0.5.0", repository: "https://github.com/tempoCollaboration/OQuPy" },
  inputSchema: obj({ tunneling: num(-2, 2, 0.5), bias: num(-2, 2, 0), alpha: num(0, 0.2, 0.05), cutoff: num(0.5, 5, 2), temperature: num(0, 2, 0), duration: num(0.1, 2, 1), steps: int(8, 40, 16), memorySteps: int(2, 12, 8), initialState: { type: "string", enum: ["ground", "excited", "plus"], default: "plus" } }),
  checkInput(v) { if (v.memorySteps > v.steps) throw new Error("memorySteps must not exceed steps"); },
  resultSchema: obj({ times: arr(num(0, 2.001), 9, 41), bloch: arr(arr(num(-1.01, 1.01), 3, 3), 9, 41), maxTraceError: num(0, 1), minimumEigenvalue: num(-1, 1), memoryTime: num(0, 3), timestep: num(0, 0.25), relativeSvdTolerance: { const: 1e-7 }, model: { const: "H=(tunneling X+bias Z)/2; bath coupling Z/2; J(w)=2 alpha w exp(-w/cutoff); hbar=kB=1" } }),
});
