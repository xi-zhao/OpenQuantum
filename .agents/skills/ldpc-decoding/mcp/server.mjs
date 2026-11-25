import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
import { replayDecoding, validateDecoding } from "../validators/validate-result.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "ldpc-decoding", definition,
  observeResult: async (value, signal) => {
    let reference;
    try { reference = await replayDecoding(value.input, signal); } catch (error) { if (signal?.aborted) throw error; }
    return validateDecoding({ request: value.input, result: value.result, reference });
  },
});
