import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
export const definition = defineScienceTool({
  name: "sample_clifft_circuit",
  description: "Sample a bounded Clifford+T circuit with Clifft and independent per-target depolarizing noise after each gate. Return all final bitstring frequencies and a dense density-matrix reference. Final Z measurements only; no loss, leakage, feedback, arbitrary Stim text or hardware.",
  source: { name: "clifft", version: "0.10.0", repository: "https://github.com/unitaryfoundation/clifft" },
  inputSchema: obj({ numQubits: int(1, 6, 2), gates: { ...arr(obj({ gate: { type: "string", enum: ["H", "S", "T", "X", "Y", "Z", "CX", "CZ"] }, targets: arr(int(0, 5), 1, 2) }), 1, 64), default: [{ gate: "H", targets: [0] }, { gate: "T", targets: [0] }, { gate: "H", targets: [0] }, { gate: "CX", targets: [0, 1] }] }, noiseProbability: num(0, 0.2, 0), shots: int(128, 8192, 2048), seed: int(0, 2147483647, 7) }),
  checkInput(v) {
    for (const { gate, targets } of v.gates) {
      if (targets.length !== (["CX", "CZ"].includes(gate) ? 2 : 1) || new Set(targets).size !== targets.length || targets.some(q => q >= v.numQubits)) throw new Error("Gate targets must be distinct, in range, and match gate arity");
    }
  },
  resultSchema: obj({ outcomes: arr(obj({ bitstring: { type: "string", minLength: 1, maxLength: 6, pattern: "^[01]+$" }, count: int(0, 8192), probability: num(0, 1), referenceProbability: num(-1e-10, 1.000000001) }), 2, 64), shots: int(128, 8192), totalVariationDistance: num(0, 1), referenceTraceError: num(0, 1), bitOrder: { const: "left-to-right q0,q1,..." }, circuit: { type: "string", minLength: 1, maxLength: 10000 }, nonCliffordGates: int(0, 64) }),
});
