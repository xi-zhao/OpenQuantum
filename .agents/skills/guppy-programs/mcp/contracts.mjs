import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const operation = obj({
  gate: { enum: ["H", "X", "Y", "Z", "S", "T", "CX", "RX", "RY", "RZ", "MEASURE_RESET"] },
  targets: arr(count(0), 1, 2), angleRadians: finite(-Number.MAX_VALUE, 0),
  conditionMeasurement: count(-1, -1), conditionValue: { type: "boolean", default: true },
});
export const definition = defineScienceTool({
  name: "simulate_guppy_feedback",
  description: "Compile a structured gate/measurement-feedback program with Guppy and emulate it with Selene's ideal QuEST backend. MEASURE_RESET measures and reallocates a qubit in |0>; subsequent gates may depend on earlier measurement indices. Angles are radians; output bits are ordered by measurement occurrence and then q0,q1,... . No Python/QIR input or cloud service is accepted.",
  source: { name: "guppylang", version: "1.1.1", repository: "https://github.com/Quantinuum/guppylang", simulator: "selene-sim==0.3.2" },
  inputSchema: obj({
    numQubits: count(1, 2),
    operations: { ...arr(operation, 0), default: [{ gate: "H", targets: [0] }, { gate: "MEASURE_RESET", targets: [0] }, { gate: "X", targets: [1], conditionMeasurement: 0 }] },
    shots: count(1, 64), seed: count(0, 42),
  }),
  checkInput(v) {
    let measured = 0;
    for (const operation of v.operations) {
      const arity = operation.gate === "CX" ? 2 : 1;
      if (operation.targets.length !== arity || new Set(operation.targets).size !== arity || operation.targets.some(q => q >= v.numQubits)) throw new Error("Each gate requires distinct, in-range qubit targets with its stated arity");
      if (!["RX", "RY", "RZ"].includes(operation.gate) && operation.angleRadians !== 0) throw new Error("angleRadians is only supported for RX, RY and RZ");
      if (operation.conditionMeasurement >= measured) throw new Error("conditionMeasurement must refer to an earlier MEASURE_RESET result");
      if (operation.gate === "MEASURE_RESET") {
        if (operation.conditionMeasurement !== -1) throw new Error("MEASURE_RESET must be unconditional so all measurement indices are defined");
        measured += 1;
      }
    }
  },
  resultSchema: obj({
    programSource: { type: "string", minLength: 1 }, hugrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, hugrBytes: count(),
    measurementCount: count(0), shots: count(),
    counts: arr(obj({ measurementBits: { anyOf: [{ const: "" }, { type: "string", pattern: "^[01]+$" }] }, finalBits: { type: "string", pattern: "^[01]+$" }, count: count() }), 1),
    simulator: { const: "Selene QuEST ideal statevector" }, networkUsed: { const: false }, hardwareExecuted: { const: false },
  }),
});
