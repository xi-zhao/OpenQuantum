import { defineScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
import requestContract from "../inputs/request.schema.json" with { type: "json" };
import resultContract from "../artifacts/result.schema.json" with { type: "json" };
import observationContract from "../artifacts/observations.schema.json" with { type: "json" };
const { $schema: requestDraft, ...inputSchema } = requestContract;
const { $schema: resultDraft, ...resultSchema } = resultContract;
void requestDraft; void resultDraft;
export const definition = defineScienceTool({
  name: "simulate_graphix_pattern",
  description: "Generate and optimize a Graphix MBQC pattern, resource graph and measurement order. simulate=false generates the pattern without state simulation. Optional statevector simulation returns corrected sampled branches; independent gate-model reference is separately selectable. Size is determined by the user's resources.",
  source: {"name":"graphix","version":"0.4.1","repository":"https://github.com/TeamGraphix/graphix"},
  inputSchema, resultSchema, observationSchema: observationContract,
  checkInput(v) {
    checkCircuit(v);
    if (!Number.isSafeInteger(v.seed + v.branches - 1)) throw new Error("Branch seeds must be exactly representable integers");
    if (!v.simulate && v.referenceMode === "required") throw new Error("An output-state reference requires simulate=true");
  },
});
