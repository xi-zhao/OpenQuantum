import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
import { validateResult } from "../validators/validate-result.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "pyzx-optimization", definition,
  observeResult: value => validateResult({ request: value.input, result: value.result }),
});
