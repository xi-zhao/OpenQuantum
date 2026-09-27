import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { positive, analogControls, analogResult, checkPositions } from "../../../../src/lib/sdk-devices.mjs";
export const definition = defineScienceTool({
  name: "simulate_qoolqit_analog",
  description: "Build a dimensionless QoolQit QuantumProgram, compile it with the real default-profile compiler to a virtual Pulser device, and simulate the compiled sequence locally. User energy scale fixes time/distance conversion; return conversion factors, actual ns duration, populations and amplitudes. Global constant phase, no cloud/QPU. Optional opt-in capability with upstream MIT-derived patent restrictions; explicit setup required.",
  source: { name: "qoolqit", version: "1.4.0", repository: "https://github.com/pasqal-io/qoolqit" },
  inputSchema: obj({ atomPositions: { ...arr(arr(finite(), 2, 2), 1), default: [[0, 0], [1, 0]] },
    durations: { ...arr(positive(), 1), default: [0.5, 0.5] },
    rabiAmplitude: { ...arr(finite(0), 2), default: [0, 4, 0] },
    detuning: { ...arr(finite(), 2), default: [0, 0, 0] }, phaseRad: finite(-Number.MAX_VALUE, 0), energyScaleRadPerUs: positive(1), ...analogControls }),
  checkInput(v) {
    checkPositions(v.atomPositions);
    if (!Number.isFinite(v.durations.reduce((a, b) => a + b, 0))) throw new Error("Total dimensionless duration must be finite");
    for (const key of ["rabiAmplitude", "detuning"]) if (v[key].length !== v.durations.length + 1) throw new Error(`${key} needs one value at every segment endpoint`);
  },
  resultSchema: obj({ ...analogResult, qoolqitCompiled: { const: true }, compilerProfile: { const: "default" },
    conversionFactors: obj({ timeNs: finite(0), energyRadPerUs: finite(0), distanceUm: finite(0) }),
    dimensionlessDuration: finite(0),
    compiledSegmentDurationsNs: arr(count(1), 1),
  }),
});
