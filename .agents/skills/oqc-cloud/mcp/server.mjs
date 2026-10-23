import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition, definitions } from "./contracts.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "oqc-cloud", definition, definitions, credentialEnvironment: ["OQC_API_TOKEN", "OQC_API_ENDPOINT"] });
