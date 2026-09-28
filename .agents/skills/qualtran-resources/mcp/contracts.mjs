import { defineScienceTool, objectSchema as obj } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count } from "../../../../src/lib/science-execution.mjs";

const exactCount = { anyOf: [count(0), { type: "string", pattern: "^(0|[1-9][0-9]*)$" }] };
export const definition = defineScienceTool({
  name: "estimate_qualtran_resources",
  description: "Compute Qualtran QECGatesCost and QubitCount for unsigned modular addition, a less-than-constant comparison, or a controlled register swap. Return primitive counts and configurable T-equivalent cost. Counts describe a library decomposition, not physical QEC/hardware resources. Qualtran 0.7.0 is beta.",
  source: { name: "qualtran", version: "0.7.0", repository: "https://github.com/quantumlib/Qualtran" },
  inputSchema: obj({
    operation: { type: "string", enum: ["add", "less_than_constant", "controlled_swap"], default: "add" },
    bitsize: count(1, 4), constant: count(0, 0),
    tCosts: { ...obj({ toffoli: count(0, 4), controlledSwap: count(0, 4), temporaryAnd: count(0, 4), rotation: count(0, 11) }), default: {} },
  }),
  checkInput(v) {
    if (v.operation !== "less_than_constant" && v.constant !== 0) throw new Error("constant is only meaningful for less_than_constant");
    if (v.operation === "less_than_constant" && v.constant !== 0 && v.constant.toString(2).length > v.bitsize) throw new Error("constant must fit the unsigned bitsize register");
  },
  resultSchema: obj({
    operation: { type: "string" }, bitsize: count(), qubitCount: exactCount, tEquivalentCount: exactCount,
    gateCounts: obj(Object.fromEntries(["t", "toffoli", "cswap", "and_bloq", "clifford", "rotation", "measurement"].map(key => [key, exactCount]))),
    model: { const: "Qualtran QECGatesCost and QubitCount" },
  }),
});
