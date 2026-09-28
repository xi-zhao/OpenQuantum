import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
const text = { type: "string", minLength: 1 };
const nullable = s => ({ anyOf: [s, { type: "null" }] });
export const definition = defineScienceTool({
  name: "query_quantum_inspire",
  description: "Read one page of Quantum Inspire backend types or one existing job's status using the official Quantum Inspire ResourceManager and API client. Requires user-configured QUANTUMINSPIRE_API_TOKEN. No interactive login, refresh-token files, submission, cancellation or polling. An expired token fails and must be updated by the user.",
  source: { name: "quantuminspire", version: "4.1.0", repository: "https://github.com/QuTech-Delft/quantuminspire" },
  inputSchema: obj({ action: { enum: ["backends", "job_status"], default: "backends" }, page: count(1, 1), pageSize: { ...count(1, 10), maximum: 100 }, jobId: count(1), requestTimeoutSeconds: { ...finite(0, 30), exclusiveMinimum: 0 } }, ["action", "page", "pageSize", "requestTimeoutSeconds"]),
  checkInput(v) { if (v.action === "job_status" && !v.jobId) throw new Error("job_status requires jobId"); if (v.action === "backends" && v.jobId !== undefined) throw new Error("backends does not accept jobId"); },
  resultSchema: obj({
    action: { enum: ["backends", "job_status"] }, page: count(1), pageSize: count(1), total: nullable(count(0)),
    backends: arr(obj({ id: count(1), name: text, numQubits: count(0), isHardware: { type: "boolean" }, status: text, enabled: { type: "boolean" } })),
    job: nullable(obj({ id: count(1), status: text, shots: nullable(count(0)) })),
    endpoint: { const: "https://api.quantum-inspire.com" }, networkUsed: { const: true },
  }),
});
