import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
import { qecDefinition } from "./qec-contracts.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "clifft-sampling", definitions: [definition, qecDefinition] });
