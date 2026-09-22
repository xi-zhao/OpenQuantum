import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const resultSchema = referenceAwareResultSchema({ outcomes: arr(obj({ bitstring: { type: "string", minLength: 1, pattern: "^[01]+$" }, count: int(0,undefined), probability: num(0,1), referenceProbability: nullable(num(-1e-10,1.000000001)) }),1), outcomesCoverage: { enum: ["complete", "observed_only"] }, shots: int(1,undefined), totalVariationDistance: nullable(num(0,1)), referenceTraceError: nullable(num(0,1)), bitOrder: { const: "left-to-right q0,q1,..." }, circuit: { type: "string", minLength: 1 }, nonCliffordGates: int(0,undefined), peakActiveWidth: int(0,undefined) }, ["totalVariationDistance", "referenceTraceError"]);
resultSchema.allOf.push({
  if: { properties: { reference: { properties: { status: { const: "computed" } } } } },
  then: { properties: { outcomesCoverage: { const: "complete" }, outcomes: { items: { properties: { referenceProbability: { type: "number" } } } } } },
  else: { properties: { outcomesCoverage: { const: "observed_only" }, outcomes: { items: { properties: { referenceProbability: { type: "null" } } } } } },
});
export const definition = defineScienceTool({
  name: "sample_clifft_circuit",
  description: "Sample Clifford+T circuits with per-target depolarizing noise using Clifft. Return observed final bitstrings and compiled active width. No adapter size limit; an optional user-specified maxActiveWidth and independent density-matrix reference are supported.",
  source: { name: "clifft", version: "0.10.1", repository: "https://github.com/unitaryfoundation/clifft" },
  inputSchema: obj({ numQubits: int(1,undefined,2), gates: { ...arr(obj({ gate: { type: "string", enum: ["H","S","T","X","Y","Z","CX","CZ"] }, targets: arr(int(0,undefined),1,2) }),1), default: [{ gate: "H", targets: [0] }, { gate: "T", targets: [0] }, { gate: "H", targets: [0] }, { gate: "CX", targets: [0,1] }] }, noiseProbability: num(0,1,0), shots: int(1,undefined,2048), seed: int(0,2147483647,7), maxActiveWidth: { ...nullable(int(0)), default: null }, referenceMode: referenceModeSchema }),
  checkInput(v) {
    for (const { gate, targets } of v.gates) {
      if (targets.length !== (["CX","CZ"].includes(gate) ? 2 : 1) || new Set(targets).size !== targets.length || targets.some(q => q >= v.numQubits)) throw new Error("Gate targets must be distinct, in range, and match gate arity");
    }
  },
  resultSchema,
});
