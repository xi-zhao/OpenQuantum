import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
import { validateResult, referenceSpectrum } from "../validators/validate-result.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "symmer-tapering", definition,
  observeResult: async (value, signal) => {
    let reference;
    try { reference = await referenceSpectrum(value.input, value.result, signal); } catch (error) { if (signal?.aborted) throw error; }
    return validateResult({ request: value.input, result: value.result, reference });
  },
});
