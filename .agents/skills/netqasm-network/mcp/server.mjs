import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition, definitions } from "./contracts.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "netqasm-network", definition, definitions });
