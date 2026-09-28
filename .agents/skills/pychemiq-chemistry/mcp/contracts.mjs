import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";

const coefficient = obj({ real: finite(undefined, 1), imaginary: finite(undefined, 0) });
export const definition = defineScienceTool({
  name: "map_pychemiq_fermions",
  description: "Use pyChemiQ's Jordan-Wigner transformation to map ordered products of fermionic creation/annihilation operators to complex Pauli terms. Leftmost Pauli letter is mode/qubit 0. No molecule solver, VQE, credentials or external service; explicit dependency preparation required.",
  source: { name: "pyChemiQ", version: "1.1.4", repository: "https://github.com/OriginQ/pyChemiQ" },
  inputSchema: obj({
    numModes: count(1, 2),
    terms: { ...arr(obj({
      coefficient: { ...coefficient, default: { real: 1, imaginary: 0 } },
      operators: arr(obj({ mode: count(0), action: { enum: ["create", "annihilate"] } }), 0),
    }), 1), default: [{ coefficient: { real: 2, imaginary: 0 }, operators: [{ mode: 0, action: "create" }, { mode: 0, action: "annihilate" }] }] },
  }),
  checkInput(v) {
    if (v.terms.some(term => term.operators.some(operator => operator.mode >= v.numModes))) throw new Error("Each fermionic mode must be below numModes");
  },
  resultSchema: obj({
    numModes: count(), mapping: { const: "Jordan-Wigner" },
    terms: arr(obj({ pauli: { type: "string", pattern: "^[IXYZ]+$" }, coefficient: obj({ real: finite(), imaginary: finite() }) }), 0),
    pauliConvention: { const: "leftmost letter is mode/qubit 0" },
  }),
});
