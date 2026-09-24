import { defineScienceTool, objectSchema as obj, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";

import { definition } from "./contracts.mjs";
const bits = { type: "string", pattern: "^[01]*$" };
export const qecDefinition = defineScienceTool({
  name: "sample_clifft_qec",
  description: "Sample fixed-shot CPU Clifft circuits in the documented Stim-format subset, including T gates, resets, repeat blocks, detectors and observables. Return aligned raw measurement, detector and observable records, not decoded logical errors or a detector error model.",
  source: definition.source,
  inputSchema: obj({
    stimCircuit: { type: "string", minLength: 1 },
    shots: count(1, 1024), seed: int(0, 2147483647, 7),
    maxActiveWidth: count(0), execution: executionSchema,
  }, ["stimCircuit", "shots", "seed", "execution"]),
  resultSchema: obj({
    measurements: list(bits, 0), detectors: list(bits, 0), observables: list(bits, 0),
    shots: count(), numQubits: count(0), numMeasurements: count(0), numDetectors: count(0),
    numObservables: count(0), peakActiveWidth: count(0), circuitSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    recordOrder: { const: "left-to-right measurement record index / detector declaration index / observable id" },
    detectorConvention: { const: "raw parity of referenced measurement records; no automatic reference-sample subtraction" },
    decoded: { const: false },
  }),
});
