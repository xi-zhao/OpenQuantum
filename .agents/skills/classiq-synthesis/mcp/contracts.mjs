import { defineScienceTool, objectSchema as obj } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

const text = { type: "string", minLength: 1 };
const source = { name: "classiq", version: "1.29.1", repository: "https://docs.classiq.io/" };
export const definition = defineScienceTool({
  name: "prepare_classiq_model",
  description: "Build and serialize a Classiq Qmod model from structured unitary gates using the official SDK. Angles are radians. Returns a locally validated model with preserved qubit indices. Does not invoke synthesis, authenticate, open a browser or contact the cloud.",
  source, inputSchema: obj(circuitSchema(undefined, undefined, true)), checkInput: checkCircuit,
  resultSchema: obj({ modelJson: text, numQubits: count(), gateCount: count(), networkUsed: { const: false } }),
});
export const synthesisDefinition = defineScienceTool({
  name: "synthesize_classiq_circuit",
  description: "Synthesize a structured gate model using Classiq's official cloud SDK and user-configured CLASSIQ_XCH_TOKEN. Transmits the model to Classiq and service-provided signed object-storage URLs; may consume account quota or incur service charges. No quantum execution is requested. No automatic resubmission, interactive authentication or credential persistence. A timeout does not prove the remote synthesis stopped.",
  source, inputSchema: obj({ ...circuitSchema(undefined, undefined, true), requestTimeoutSeconds: { ...finite(0, 60), exclusiveMinimum: 0 } }), checkInput: checkCircuit,
  resultSchema: obj({ quantumProgramJson: text, networkUsed: { const: true }, hardwareExecuted: { const: false }, endpoint: { const: "https://platform.classiq.io" } }),
});
synthesisDefinition.tool.annotations.idempotentHint = false;
export const definitions = [definition, synthesisDefinition];
