import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition, definitions } from "./contracts.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "qctrl-workbench", definition, definitions, credentialEnvironment: ["QCTRL_API_KEY"] });
