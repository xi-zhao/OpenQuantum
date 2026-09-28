import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "compute_qrisp_modular_sum",
  description: "Compile and locally simulate Qrisp unsigned QuantumFloat with integer-preserving Gidney in-place addition modulo 2^bitWidth. Initialize A from a binary string or a uniform superposition, then add the classical binary-string addend. Return the exact numerical probability distribution and compiler resources. Binary strings are most-significant-bit first; no user code, cloud or hardware. Explicit setup required.",
  source: { name: "qrisp", version: "0.9.9", repository: "https://github.com/eclipse-qrisp/Qrisp" },
  inputSchema: obj({
    bitWidth: { ...count(), default: 3 },
    initialBits: { type: "string", pattern: "^[01]+$", default: "110" },
    addendBits: { type: "string", pattern: "^[01]+$", default: "011" },
    preparation: { enum: ["basis", "uniform"], default: "basis" },
  }),
  checkInput(v) {
    if (v.initialBits.length > v.bitWidth || v.addendBits.length > v.bitWidth) throw new Error("Binary operands must fit bitWidth");
    if (v.preparation === "uniform" && /1/.test(v.initialBits)) throw new Error("Uniform preparation requires initialBits to be zero");
  },
  resultSchema: obj({
    bitWidth: count(), outcomes: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, probability: finite(0) }), 1),
    totalProbability: finite(0), compiledQubits: count(), compiledDepth: count(0),
    gateCounts: arr(obj({ gate: { type: "string" }, count: count(0) }), 0),
    backend: { const: "Qrisp QuantumFloat local simulator" },
    arithmetic: { const: "unsigned addition modulo 2^bitWidth; most-significant bit first" },
  }),
});
