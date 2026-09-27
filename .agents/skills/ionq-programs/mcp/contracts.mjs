import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

export const definition = defineScienceTool({
  name: "prepare_ionq_program",
  description: "Use IonQ's official qiskit-ionq SDK locally to encode a structured circuit as IonQ QIS gate instructions and OpenQASM 2, with terminal measurements and an explicit classical-bit mapping. This is program preparation, not native-pulse compilation, a cloud request or QPU execution. Rotation angles are radians; qubit indices are retained.",
  source: { name: "qiskit-ionq", version: "1.1.1", repository: "https://github.com/qiskit-community/qiskit-ionq" },
  inputSchema: obj(circuitSchema(undefined, undefined, true)),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(),
    gateset: { const: "qis" },
    instructions: arr(obj({ gate: { type: "string", enum: ["h", "s", "t", "x", "y", "z", "rx", "ry", "rz"] }, targets: arr(count(0), 1, 2), controls: arr(count(0), 1, 2), rotation: finite() }, ["gate", "targets"]), 1),
    measurementCount: count(),
    classicalToQubit: arr(count(0), 1),
    qasm: { type: "string", minLength: 1 },
    networkUsed: { const: false },
    interpretation: { const: "instruction indices are input qubit indices; classicalToQubit[c] is the qubit measured into classical bit c" },
  }),
});
