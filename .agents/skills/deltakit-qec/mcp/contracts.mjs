import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
export const definition = defineScienceTool({
  name: "run_deltakit_memory",
  description: "Construct a rectangular rotated planar-code memory circuit in Deltakit, apply its ToyNoise model locally, sample detectors with Stim and decode with PyMatching. Returns the actual generated circuit and fixed-shot logical error statistics. No cloud, leakage service or threshold claim.",
  source: { name: "deltakit", version: "0.10.0", repository: "https://github.com/Deltakit/deltakit" },
  inputSchema: obj({ width: { type: "integer", enum: [3, 5], default: 3 }, height: { type: "integer", enum: [3, 5], default: 3 }, rounds: int(1, 10, 3), basis: { type: "string", enum: ["X", "Z"], default: "Z" }, noiseProbability: num(0, 0.05, 0.01), shots: int(128, 8192, 1024), seed: int(0, 2147483647, 7) }),
  resultSchema: obj({ numQubits: int(1, 100), numDetectors: int(1, 1000), numObservables: int(1, 10), shots: int(128, 8192), logicalFailures: int(0, 8192), logicalErrorRate: num(0, 1), wilson95: arr(num(0, 1), 2, 2), detectionEventFraction: num(0, 1), circuit: { type: "string", minLength: 1, maxLength: 500000 }, circuitSha256: { type: "string", minLength: 64, maxLength: 64 }, noiseModel: { const: "Deltakit ToyNoise(p); synthetic local model" }, decoder: { const: "PyMatching 2.4.0 MWPM" }, simulator: { const: "Stim 1.16.0" } }),
});
