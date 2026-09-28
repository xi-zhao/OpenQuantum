import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "qcarchive-query", definition, credentialEnvironment: ["QCPORTAL_ADDRESS", "QCPORTAL_USERNAME", "QCPORTAL_PASSWORD"] });
