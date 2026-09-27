import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

const source = { name: "qiskit-superstaq", version: "0.5.69", repository: "https://github.com/Infleqtion/client-superstaq" };
const text = { type: "string", minLength: 1 };
const circuitResult = {
  numQubits: count(), depth: count(0),
  gates: arr(obj({ name: text, count: count() })),
  serializedCircuit: text,
  qasm: { anyOf: [text, { type: "null" }] },
};
const timeout = { ...finite(0, 60), exclusiveMinimum: 0 };
export const definition = defineScienceTool({
  name: "prepare_superstaq_circuit",
  description: "Prepare a structured unitary circuit with Infleqtion's official qiskit-superstaq QPY serializer. Returns a locally round-tripped circuit and gate metrics; requires no credentials and never contacts the cloud. Rotation angles use radians. This does not compile for a hardware target.",
  source, inputSchema: obj(circuitSchema(undefined, undefined, true)), checkInput: checkCircuit,
  resultSchema: obj({ ...circuitResult, networkUsed: { const: false }, serialization: { const: "qiskit-superstaq QPY" } }),
});
export const targetsDefinition = defineScienceTool({
  name: "list_superstaq_targets",
  description: "Query Infleqtion's official Superstaq service for compilation-capable targets using the configured SUPERSTAQ_API_KEY. Contacts the fixed official HTTPS endpoint and returns server-reported availability; does not submit or run quantum circuits. Missing credentials fail before network access.",
  source, inputSchema: obj({ requestTimeoutSeconds: timeout }),
  resultSchema: obj({
    targets: arr(obj({ target: text, supports_compile: { type: "boolean" }, available: { type: "boolean" }, accessible: { type: "boolean" }, retired: { type: "boolean" } })),
    networkUsed: { const: true }, endpoint: { const: "https://superstaq.infleqtion.com/v0.2.0" },
  }),
});
export const compileDefinition = defineScienceTool({
  name: "compile_superstaq_circuit",
  description: "Send a structured circuit to Infleqtion Superstaq for target-specific remote compilation. This external service operation transmits the circuit and may consume account quota or incur service charges. Requires configured SUPERSTAQ_API_KEY and an explicitly selected target. Does not submit shots or execute a QPU, and never retries automatically. Returns the server's compiled program and logical-to-physical maps; cloud availability is not inferred from local tests.",
  source,
  inputSchema: obj({ ...circuitSchema(undefined, undefined, true), target: { type: "string", pattern: "^[a-zA-Z0-9-]+_[a-zA-Z0-9_.-]+_(qpu|simulator)$" }, requestTimeoutSeconds: timeout }),
  checkInput: checkCircuit,
  resultSchema: obj({
    ...circuitResult, target: text,
    initialLogicalToPhysical: arr(arr(count(0), 2, 2)),
    finalLogicalToPhysical: arr(arr(count(0), 2, 2)),
    networkUsed: { const: true }, endpoint: { const: "https://superstaq.infleqtion.com/v0.2.0" },
    hardwareExecuted: { const: false },
  }),
});
// A remote compilation request has a server-side/account effect even without shots.
compileDefinition.tool.annotations.idempotentHint = false;
export const definitions = [definition, targetsDefinition, compileDefinition];
