import { defineScienceTool, objectSchema as obj, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { nullable } from "../../../../src/lib/science-reference.mjs";
import { countSchema as count, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
const text = { type: "string" };
const digest = { type: "string", pattern: "^[a-f0-9]{64}$" };
export const definition = defineScienceTool({
  name: "inspect_qdmi_devices",
  description: "Query device metadata, site indices, operation arities and coupling through a locally configured, digest-pinned QDMI 1.3.3 client driver. Requires explicit setup. No job submission, arbitrary library paths or credentials are accepted.",
  source: { name: "QDMI", version: "1.3.3", repository: "https://github.com/Munich-Quantum-Software-Stack/QDMI", commit: "18cfb67fd9042761d3005c2f8655751c1758f9c5" },
  inputSchema: obj({ maxDevices: int(1, 256, 64), maxPropertyBytes: int(64, 16777216, 1048576), execution: executionSchema }),
  resultSchema: obj({
    driverKind: { enum: ["example", "configured"] }, driverSha256: digest, configurationSha256: digest,
    interfaceVersion: { const: "1.3.3" }, queriedAt: text, hardwareVerified: { const: false },
    devices: list(obj({
      index: count(0), name: nullable(text), version: nullable(text), qdmiVersion: nullable(text),
      numQubits: nullable(count(0)), sites: nullable(list(count(0), 0)),
      operations: nullable(list(obj({ name: nullable(text), numQubits: nullable(count(0)), numParameters: nullable(count(0)) }), 0)),
      coupling: nullable(list({ type: "array", items: count(0), minItems: 2, maxItems: 2 }, 0)),
    }), 0),
    jobsSubmitted: { const: 0 },
  }),
});
definition.tool.annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
