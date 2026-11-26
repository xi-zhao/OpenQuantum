import { defineScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import requestContract from "../inputs/request.schema.json" with { type: "json" };
import resultContract from "../artifacts/result.schema.json" with { type: "json" };
import observationContract from "../artifacts/observations.schema.json" with { type: "json" };
const { $schema: requestDraft, ...inputSchema } = requestContract;
const { $schema: resultDraft, ...resultSchema } = resultContract;
void requestDraft; void resultDraft;
export const definition = defineScienceTool({
  name: "analyze_paulie_algebra",
  description: "Classify the dynamical Lie algebra of independently controlled Pauli generators with PauLie. Return exact dimension and classification without requiring dense matrices or full closure enumeration. closureMode=full explicitly enumerates the Pauli closure; referenceMode=required attempts an independent dense check at the requested size. No adapter qubit limit.",
  source: {"name":"paulie","version":"0.2.3","repository":"https://github.com/QPauLie/PauLie"},
  inputSchema, resultSchema, observationSchema: observationContract,
  checkInput(v) {
    if (new Set(v.generators).size !== v.generators.length) throw new Error("Generators must be distinct");
    for (const word of v.generators) if (word.length !== v.numQubits || /^I+$/.test(word)) throw new Error("Use nonidentity Pauli words with numQubits characters");
  },
});
