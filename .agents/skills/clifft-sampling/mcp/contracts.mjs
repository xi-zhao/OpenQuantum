import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
import { countSchema as count, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
const resultSchema = referenceAwareResultSchema({ outcomes: list(obj({ bitstring: { type: "string", minLength: 1, pattern: "^[01]+$" }, count: count(0), probability: num(0,1), referenceProbability: nullable(num(-1e-10,1.000000001)) })), outcomesCoverage: { enum: ["complete", "observed_only"] }, shots: count(), totalVariationDistance: nullable(num(0,1)), referenceTraceError: nullable(num(0,1)), bitOrder: { const: "left-to-right q0,q1,..." }, circuit: { type: "string", minLength: 1, maxLength: Number.MAX_SAFE_INTEGER }, nonCliffordGates: count(0), peakActiveWidth: count(0) }, ["totalVariationDistance", "referenceTraceError"]);
resultSchema.allOf.push({
  if: { properties: { reference: { properties: { status: { const: "computed" } } } } },
  then: { properties: { outcomesCoverage: { const: "complete" }, outcomes: { items: { properties: { referenceProbability: { type: "number" } } } } } },
  else: { properties: { outcomesCoverage: { const: "observed_only" }, outcomes: { items: { properties: { referenceProbability: { type: "null" } } } } } },
});
export const definition = defineScienceTool({
  name: "sample_clifft_circuit",
  description: "Sample Clifford+T circuits with per-target depolarizing noise and final Z measurements. Return observed bitstrings and compiled active width, with optional independent density-matrix reference. Circuit and sampling size are chosen by the user; maxActiveWidth is an optional user limit.",
  source: { name: "clifft", version: "0.10.0", repository: "https://github.com/unitaryfoundation/clifft" },
  inputSchema: obj({ numQubits: count(1,2), gates: { ...list(obj({ gate: { type: "string", enum: ["H","S","T","X","Y","Z","CX","CZ"] }, targets: arr(count(0),1,2) })), default: [{ gate: "H", targets: [0] }, { gate: "T", targets: [0] }, { gate: "H", targets: [0] }, { gate: "CX", targets: [0,1] }] }, noiseProbability: num(0,0.2,0), shots: count(1,2048), seed: int(0,2147483647,7), maxActiveWidth: count(0), referenceMode: referenceModeSchema, execution: executionSchema }, ["numQubits","gates","noiseProbability","shots","seed","referenceMode","execution"]),
  checkInput(v) {
    for (const { gate, targets } of v.gates) {
      if (targets.length !== (["CX","CZ"].includes(gate) ? 2 : 1) || new Set(targets).size !== targets.length || targets.some(q => q >= v.numQubits)) throw new Error("Gate targets must be distinct, in range, and match gate arity");
    }
  },
  resultSchema,
});
