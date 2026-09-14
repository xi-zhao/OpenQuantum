import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable, checkReferenceRequest } from "../../../../src/lib/science-reference.mjs";
const resultSchema = referenceAwareResultSchema({ outcomes: arr(obj({ bitstring: { type: "string", minLength: 1, maxLength: 128, pattern: "^[01]+$" }, count: int(0,8192), probability: num(0,1), referenceProbability: nullable(num(-1e-10,1.000000001)) }),1,8192), outcomesCoverage: { enum: ["complete", "observed_only"] }, shots: int(128,8192), totalVariationDistance: nullable(num(0,1)), referenceTraceError: nullable(num(0,1)), bitOrder: { const: "left-to-right q0,q1,..." }, circuit: { type: "string", minLength: 1, maxLength: 100000 }, nonCliffordGates: int(0,2048), peakActiveWidth: int(0,128) }, ["totalVariationDistance", "referenceTraceError"]);
resultSchema.allOf.push({
  if: { properties: { reference: { properties: { status: { const: "computed" } } } } },
  then: { properties: { outcomesCoverage: { const: "complete" }, outcomes: { items: { properties: { referenceProbability: { type: "number" } } } } } },
  else: { properties: { outcomesCoverage: { const: "observed_only" }, outcomes: { items: { properties: { referenceProbability: { type: "null" } } } } } },
});
export const definition = defineScienceTool({
  name: "sample_clifft_circuit",
  description: "Sample 1–128 qubit Clifford+T circuits with per-target depolarizing noise, subject to compiled active-width and sampling budgets. Return observed final bitstrings; optional dense reference through 6 qubits also returns the complete distribution. Final Z measurements only.",
  source: { name: "clifft", version: "0.10.0", repository: "https://github.com/unitaryfoundation/clifft" },
  inputSchema: obj({ numQubits: int(1,128,2), gates: { ...arr(obj({ gate: { type: "string", enum: ["H","S","T","X","Y","Z","CX","CZ"] }, targets: arr(int(0,127),1,2) }),1,2048), default: [{ gate: "H", targets: [0] }, { gate: "T", targets: [0] }, { gate: "H", targets: [0] }, { gate: "CX", targets: [0,1] }] }, noiseProbability: num(0,0.2,0), shots: int(128,8192,2048), seed: int(0,2147483647,7), maxActiveWidth: int(0,24,16), referenceMode: referenceModeSchema }),
  checkInput(v) {
    checkReferenceRequest(v.referenceMode, v.numQubits, 6, "Dense density-matrix");
    if (v.numQubits * v.shots > 524288) throw new Error("numQubits times shots exceeds the output budget (524288)");
    for (const { gate, targets } of v.gates) {
      if (targets.length !== (["CX","CZ"].includes(gate) ? 2 : 1) || new Set(targets).size !== targets.length || targets.some(q => q >= v.numQubits)) throw new Error("Gate targets must be distinct, in range, and match gate arity");
    }
  },
  resultSchema,
});
