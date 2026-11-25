import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
import { referenceSimulation, validateSimulation } from "../validators/validate-result.mjs";

await serveScienceTool({
  entrypoint: import.meta.url, id: "hamiltonian-simulation", definition,
  observeResult: async (value, signal) => validateSimulation({
    request: value.input, result: value.result,
    reference: await referenceSimulation(value.input, signal),
  }),
});
