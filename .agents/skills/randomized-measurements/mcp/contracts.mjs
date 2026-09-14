import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
export const definition = defineScienceTool({
  name: "estimate_randomized_purity",
  description: "Simulate local Haar randomized measurements of product or GHZ states using RandomMeas.jl. User-selected qubits, settings and shots; return subsystem purity and an inexpensive analytic reference.",
  source: { name: "RandomMeas.jl", version: "0.3.1", revision: "89c492bfb05508e5babe9c8c2c40697995be9e42", repository: "https://github.com/bvermersch/RandomMeas.jl" },
  inputSchema: obj({ numQubits: int(2,undefined,3), state: { enum: ["product","ghz"], default: "ghz" }, subsystem: { ...arr(int(0,undefined),1), uniqueItems: true, default: [0] }, settings: int(8,undefined,32), shotsPerSetting: int(4,undefined,64), seed: int(0,2147483647,7) }),
  checkInput(v) {
    if (v.subsystem.some(site => site >= v.numQubits)) throw new Error("subsystem sites must be within numQubits");
  },
  resultSchema: obj({ purityEstimate: num(undefined,undefined), analyticPurity: num(0,1), absoluteError: num(0,undefined), settingStandardError: num(0,undefined), settings: int(8,undefined), shotsPerSetting: int(4,undefined), totalShots: int(32,undefined), subsystemZeroBased: arr(int(0,undefined),1), ensemble: { const: "independent local Haar unitaries" } }),
});
