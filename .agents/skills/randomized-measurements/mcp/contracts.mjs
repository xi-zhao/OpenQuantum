import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
export const definition = defineScienceTool({
  name: "estimate_randomized_purity",
  description: "Use pinned RandomMeas.jl to simulate local Haar randomized measurements of a small product or GHZ state and estimate subsystem purity against its analytic value. Requires prepared Julia environment.",
  source: { name: "RandomMeas.jl", version: "0.3.1", revision: "89c492bfb05508e5babe9c8c2c40697995be9e42", repository: "https://github.com/bvermersch/RandomMeas.jl" },
  inputSchema: obj({ numQubits: int(2,6,3), state: { enum: ["product","ghz"], default: "ghz" }, subsystem: { ...arr(int(0,5),1,4), uniqueItems: true, default: [0] }, settings: int(8,128,32), shotsPerSetting: int(4,256,64), seed: int(0,2147483647,7) }),
  checkInput(v) {
    if (v.subsystem.some(site => site >= v.numQubits)) throw new Error("subsystem sites must be within numQubits");
    if (v.settings*v.shotsPerSetting > 16384) throw new Error("At most 16384 total measurement shots");
  },
  resultSchema: obj({ purityEstimate: num(-100,100), analyticPurity: num(0,1), absoluteError: num(0,101), settingStandardError: num(0,100), settings: int(8,128), shotsPerSetting: int(4,256), totalShots: int(32,16384), subsystemZeroBased: arr(int(0,5),1,4), ensemble: { const: "independent local Haar unitaries" } }),
});
