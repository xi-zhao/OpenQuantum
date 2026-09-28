import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition, definitions } from "./contracts.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "aqt-workbench", definition, definitions, credentialEnvironment: ["AQT_API_TOKEN"] });
