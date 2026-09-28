import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
const text = { type: "string", minLength: 1 };
const source = { name: "qiskit-aqt-provider", version: "1.15.0", repository: "https://github.com/qiskit-community/qiskit-aqt-provider" };
export const definition = defineScienceTool({
  name: "simulate_aqt_circuit", source,
  description: "Compile a structured circuit for AQT's native gate set and sample its official offline simulator, with optional SDK depolarizing noise. Angles in radians; bitstrings q[n-1]...q[0]. The SDK backend supports up to 20 qubits and 2000 shots per job. No credentials, cloud or QPU execution.",
  inputSchema: obj({ ...circuitSchema(undefined, undefined, true), shots: count(1, 100), seed: count(0, 42), noise: { type: "boolean", default: false } }), checkInput: checkCircuit,
  resultSchema: obj({ numQubits: count(), shots: count(), seed: count(0), noise: { type: "boolean" }, counts: arr(obj({ bitstring: { type: "string", pattern: "^[01]+$" }, count: count() })), nativeGates: arr(obj({ name: text, count: count() })), bitOrder: { const: "q[n-1]...q[0]" }, networkUsed: { const: false } }),
});
export const queryDefinition = defineScienceTool({
  name: "list_aqt_devices", source,
  description: "Query AQT Arnica workspaces and devices with user-configured AQT_API_TOKEN. Returns service-reported device metadata using the official SDK. No login, token persistence, job submission or polling. Missing credentials fail before network access.",
  inputSchema: obj({ requestTimeoutSeconds: { ...finite(0, 30), exclusiveMinimum: 0 } }),
  resultSchema: obj({ devices: arr(obj({ workspaceId: text, id: text, name: text, type: text, numQubits: count(0) })), endpoint: { const: "https://arnica.aqt.eu" }, networkUsed: { const: true } }),
});
export const definitions = [definition, queryDefinition];
