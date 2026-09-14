import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const word = { type: "string", pattern: "^[IXYZ]+$", minLength: 1 };
const exactDimension = { anyOf: [int(1, Number.MAX_SAFE_INTEGER), { type: "string", pattern: "^[1-9][0-9]*$" }] };
const resultSchema = referenceAwareResultSchema({ dimension: exactDimension, referenceDimension: nullable(exactDimension), classification: { type: "string", minLength: 1 }, fullSpecialUnitaryDimension: exactDimension, generatesFullSpecialUnitary: { type: "boolean" }, closure: nullable(arr(word, 1)), closureStatus: { enum: ["computed", "not_run"] }, maxSpanResidual: nullable(num(0)), spanResidualTarget: nullable({ enum: ["closure", "generators"] }), bitOrder: { const: "left-to-right q0,q1,..." } }, ["referenceDimension", "maxSpanResidual", "spanResidualTarget"]);
resultSchema.allOf.push({
  if: { properties: { closureStatus: { const: "computed" } } },
  then: { properties: { closure: { type: "array" } } },
  else: { properties: { closure: { type: "null" } } },
});
export const definition = defineScienceTool({
  name: "analyze_paulie_algebra",
  description: "Classify the dynamical Lie algebra of independently controlled Pauli generators with PauLie. Return exact dimension and classification without requiring dense matrices or full closure enumeration. closureMode=full explicitly enumerates the Pauli closure; referenceMode=required attempts an independent dense check at the requested size. No adapter qubit limit.",
  source: { name: "paulie", version: "0.2.3", repository: "https://github.com/QPauLie/PauLie" },
  inputSchema: obj({ numQubits: int(1, undefined, 2), generators: { ...arr(word, 1), default: ["XI", "ZI", "IX", "IZ", "ZZ"] }, closureMode: { enum: ["auto", "full", "skip"], default: "auto" }, referenceMode: referenceModeSchema }),
  checkInput(v) {
    if (new Set(v.generators).size !== v.generators.length) throw new Error("Generators must be distinct");
    for (const word of v.generators) if (word.length !== v.numQubits || /^I+$/.test(word)) throw new Error("Use nonidentity Pauli words with numQubits characters");
  },
  resultSchema,
});
