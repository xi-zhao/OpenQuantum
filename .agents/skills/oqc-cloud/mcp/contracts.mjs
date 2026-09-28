import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
const source = { name: "oqc-qcaas-client", version: "3.23.0", repository: "https://docs.oqc.app/" };
const text = { type: "string", minLength: 1 };
const identifier = { type: "string", pattern: "^[A-Za-z0-9_:-]+$", minLength: 1 };
const nullable = schema => ({ anyOf: [schema, { type: "null" }] });
const timeout = { ...finite(0, 30), exclusiveMinimum: 0 };
const program = { ...circuitSchema(undefined, undefined, true), shots: count(1, 100), qpuId: identifier };
export const definition = defineScienceTool({
  name: "prepare_oqc_task", source,
  description: "Serialize a structured circuit and terminal measurements to an OQC QCaaS task using the official SDK. Returns OpenQASM2 and the SDK task payload; no network, account, submission or hardware execution. qpuId is explicit and not inferred to be available.",
  inputSchema: obj(program), checkInput: checkCircuit,
  resultSchema: obj({ qasm: text, taskJson: text, qpuId: text, shots: count(), networkUsed: { const: false }, submitted: { const: false } }),
});
export const queryDefinition = defineScienceTool({
  name: "query_oqc_service", source,
  description: "Read active OQC devices or an existing task status with configured OQC_API_TOKEN and optional OQC_API_ENDPOINT. Official HTTPS service only; no submission, cancellation, polling or login. Credentials stay outside tool arguments and results.",
  inputSchema: obj({ action: { enum: ["devices", "task_status"], default: "devices" }, qpuId: identifier, taskId: identifier, requestTimeoutSeconds: timeout }, ["action", "requestTimeoutSeconds"]),
  checkInput(v) { if (v.action === "task_status" && (!v.qpuId || !v.taskId)) throw new Error("task_status requires qpuId and taskId"); if (v.action === "devices" && (v.qpuId || v.taskId)) throw new Error("devices does not accept task identifiers"); },
  resultSchema: obj({ action: { enum: ["devices", "task_status"] }, devices: arr(obj({ id: text, name: text, active: { type: "boolean" } })), taskId: nullable(text), status: nullable(text), endpoint: text, networkUsed: { const: true } }),
});
export const submitDefinition = defineScienceTool({
  name: "submit_oqc_task", source,
  description: "Submit one structured circuit as an OQC cloud task using configured OQC_API_TOKEN. External write: transmits circuit, queues hardware/emulator work and may incur charges. Requires explicit qpuId; shots defaults to 100. Exactly one submission attempt; never poll or retry an uncertain outcome. Return task ID only when acknowledged.",
  inputSchema: obj({ ...program, requestTimeoutSeconds: timeout }), checkInput: checkCircuit,
  resultSchema: obj({ taskId: text, qpuId: text, shots: count(), endpoint: text, networkUsed: { const: true }, submissionAcknowledged: { const: true } }),
});
submitDefinition.tool.annotations.idempotentHint = false;
export const definitions = [definition, queryDefinition, submitDefinition];
