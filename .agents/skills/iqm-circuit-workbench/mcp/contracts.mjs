import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count } from "../../../../src/lib/science-execution.mjs";
import { seed, operation, checkOperations, circuitResult } from "../../../../src/lib/sdk-devices.mjs";
const arities = { h: 1, x: 1, y: 1, z: 1, s: 1, t: 1, rx: 1, ry: 1, rz: 1, cx: 2, cz: 2, swap: 2 };
export const definition = defineScienceTool({
  name: "run_iqm_local_circuit",
  description: "Transpile a gate circuit against an IQM fake device, validate native gates/topology with iqm-client's Qiskit adapter, and sample locally with Qiskit Aer using the SDK noise model or an ideal model. No IQM server connection or QPU submission. Dependencies must be prepared explicitly.",
  source: { name: "iqm-client", version: "35.0.3", repository: "https://github.com/iqm-finland/iqm-client" },
  inputSchema: obj({
    numQubits: count(1, 2), backend: { enum: ["adonis", "apollo", "aphrodite"], default: "adonis" },
    operations: { ...arr(operation(Object.keys(arities)), 0), default: [{ gate: "h", qubits: [0], angleRad: 0 }, { gate: "cx", qubits: [0, 1], angleRad: 0 }] },
    shots: count(1, 1024), seed, simulationMode: { enum: ["ideal", "device-noise"], default: "device-noise" },
    optimizationLevel: { type: "integer", minimum: 0, maximum: 3, default: 1 },
  }),
  checkInput(v) { checkOperations(v, arities, ["rx", "ry", "rz"]); },
  resultSchema: obj({ ...circuitResult, backendName: { type: "string", minLength: 1 }, deviceQubits: count(),
    couplingMap: arr(arr(count(0), 2, 2), 0), simulationMode: { enum: ["ideal", "device-noise"] },
    sdkCircuitValidation: { const: "passed" }, simulator: { const: "Qiskit AerSimulator" },
  }),
});
