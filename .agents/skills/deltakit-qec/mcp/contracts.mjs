import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
export const definition = defineScienceTool({
  name: "run_deltakit_memory",
  description: "Construct a rectangular rotated planar-code memory circuit in Deltakit, apply its ToyNoise model locally, sample detectors with Stim and decode with PyMatching. Returns the actual generated circuit and fixed-shot logical error statistics. No cloud, leakage service or threshold claim.",
  source: { name: "deltakit", version: "0.10.0", repository: "https://github.com/Deltakit/deltakit" },
  inputSchema: obj({ width: { type: "integer", minimum: 3, default: 3 }, height: { type: "integer", minimum: 3, default: 3 }, rounds: int(1,undefined, 3), basis: { type: "string", enum: ["X", "Z"], default: "Z" }, noiseProbability: num(0, 1, 0.01), shots: int(128,undefined, 1024), seed: int(0, 2147483647, 7) }),
  checkInput(v) { if (v.width % 2 !== 1 || v.height % 2 !== 1) throw new Error("Rotated rectangular patch dimensions must be odd"); },
  resultSchema: obj({ numQubits: int(1,undefined), numDetectors: int(1,undefined), numObservables: int(1,undefined), shots: int(128,undefined), logicalFailures: int(0,undefined), logicalErrorRate: num(0, 1), wilson95: arr(num(0, 1), 2, 2), detectionEventFraction: num(0, 1), circuit: { type: "string", minLength: 1 }, circuitSha256: { type: "string", minLength: 64, maxLength: 64 }, noiseModel: { const: "Deltakit ToyNoise(p); synthetic local model" }, decoder: { const: "PyMatching 2.4.0 MWPM" }, simulator: { const: "Stim 1.16.0" } }),
});
