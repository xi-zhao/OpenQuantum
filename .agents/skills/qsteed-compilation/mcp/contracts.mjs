import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "compile_qsteed_circuit",
  description: "Compile a structured PyQuafu unitary circuit using QSteed UnrollToBasis into CX/RX/RY/RZ. Angles are radians. Return OpenQASM 2, structured output gates, resources and phase satisfying U_input = exp(i*globalPhaseRadians)*U_output. No routing, resource database, cloud or hardware. Explicit dependency preparation required.",
  source: { name: "qsteed + pyquafu", version: "0.2.3 + 0.4.4", repository: "https://github.com/BAQIS-Quantum/qsteed" },
  inputSchema: obj(circuitSchema(undefined, undefined, true)),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(), inputGateCount: count(0), outputGateCount: count(0),
    gates: arr(obj({ gate: { enum: ["CX", "RX", "RY", "RZ"] }, targets: arr(count(0), 1, 2), angle: finite() }, ["gate", "targets"]), 0),
    qasm: { type: "string", minLength: 1 }, globalPhaseRadians: finite(),
    backend: { const: "QSteed Transpiler + UnrollToBasis; PyQuafu QuantumCircuit" },
    qubitMapping: { const: "input qubit i remains output qubit i; no layout or routing" },
  }),
});
