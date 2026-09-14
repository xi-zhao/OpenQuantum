import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
export const definition = defineScienceTool({
  name: "simulate_oqupy_spin_boson",
  description: "Solve Ohmic spin-boson dynamics using OQuPy TEMPO, user-selected duration, time grid and memory length. Return Bloch components and numerical state checks; convergence is not presumed.",
  source: { name: "oqupy", version: "0.5.0", repository: "https://github.com/tempoCollaboration/OQuPy" },
  inputSchema: obj({ tunneling: num(undefined,undefined,0.5), bias: num(undefined,undefined,0), alpha: num(0,undefined,0.05), cutoff: num(0.5,undefined,2), temperature: num(0,undefined,0), duration: num(0.1,undefined,1), steps: int(8,undefined, 16), memorySteps: int(2,undefined, 8), initialState: { type: "string", enum: ["ground", "excited", "plus"], default: "plus" } }),
  checkInput(v) { if (v.memorySteps > v.steps) throw new Error("memorySteps must not exceed steps"); },
  resultSchema: obj({ times: arr(num(0,undefined), 9), bloch: arr(arr(num(-1.01, 1.01), 3, 3), 9), maxTraceError: num(0, 1), minimumEigenvalue: num(-1, 1), memoryTime: num(0,undefined), timestep: num(0,undefined), relativeSvdTolerance: { const: 1e-7 }, model: { const: "H=(tunneling X+bias Z)/2; bath coupling Z/2; J(w)=2 alpha w exp(-w/cutoff); hbar=kB=1" } }),
});
