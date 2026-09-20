import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "openqarp-excited-states", definition });
