import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition, definitions } from "./contracts.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "classiq-synthesis", definition, definitions, credentialEnvironment: ["CLASSIQ_XCH_TOKEN"] });
