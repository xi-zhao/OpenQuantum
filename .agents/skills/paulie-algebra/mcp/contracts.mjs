import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
const word = { type: "string", pattern: "^[IXYZ]+$", minLength: 1, maxLength: 4 };
export const definition = defineScienceTool({
  name: "analyze_paulie_algebra",
  description: "Compute the Pauli Lie closure of 1–4 qubit nonidentity Pauli generators with PauLie, and compare its dimension and span with independent dense commutator closure. Assumes each generator has an independent real control coefficient. No claims about finite-depth ansatz performance, trainability or real hardware controllability.",
  source: { name: "paulie", version: "0.2.3", repository: "https://github.com/QPauLie/PauLie" },
  inputSchema: obj({ numQubits: int(1, 4, 2), generators: { ...arr(word, 1, 16), default: ["XI", "ZI", "IX", "IZ", "ZZ"] } }),
  checkInput(v) {
    if (new Set(v.generators).size !== v.generators.length) throw new Error("Generators must be distinct");
    for (const word of v.generators) if (word.length !== v.numQubits || /^I+$/.test(word)) throw new Error("Use nonidentity Pauli words with numQubits characters");
  },
  resultSchema: obj({ dimension: int(1, 255), referenceDimension: int(1, 255), classification: { type: "string", minLength: 1, maxLength: 1024 }, fullSpecialUnitaryDimension: int(3, 255), generatesFullSpecialUnitary: { type: "boolean" }, closure: arr(word, 1, 255), maxSpanResidual: num(0, 100), bitOrder: { const: "left-to-right q0,q1,..." } }),
});
