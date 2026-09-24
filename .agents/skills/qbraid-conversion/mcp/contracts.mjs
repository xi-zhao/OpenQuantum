import { defineScienceTool, objectSchema as obj } from "../../../../src/lib/bounded-science-mcp.mjs";
import { circuitFields, checkCircuit } from "../../../../src/lib/candidate-circuit.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
export const definition = defineScienceTool({
  name: "convert_qbraid_circuit",
  description: "Convert a structured unitary gate circuit between Qiskit and Cirq using a fixed qBraid conversion path. Export OpenQASM 2, preserve idle wires, and independently compare complete unitaries including the parsed export when a reference is requested. No cloud providers or Python source inputs.",
  source: { name: "qBraid", version: "0.12.2", repository: "https://github.com/qBraid/qBraid" },
  inputSchema: obj({ ...circuitFields,
    direction: { enum: ["qiskit-to-cirq", "cirq-to-qiskit"], default: "qiskit-to-cirq" },
    referenceMode: referenceModeSchema, execution: executionSchema,
  }),
  checkInput: checkCircuit,
  resultSchema: referenceAwareResultSchema({
    numQubits: count(), direction: { enum: ["qiskit-to-cirq", "cirq-to-qiskit"] },
    conversionPath: list({ type: "string" }, 2), openQasm2: { type: "string", minLength: 1 },
    wireOrder: { const: "q[i] preserves input qubit i; comparison uses q0 as least significant bit" },
    independentEquivalent: nullable({ type: "boolean" }), maxUnitaryDeviation: nullable(finite(0)),
    globalPhaseIgnored: { const: true }, cloudSubmitted: { const: false },
  }, ["independentEquivalent", "maxUnitaryDeviation"]),
});
