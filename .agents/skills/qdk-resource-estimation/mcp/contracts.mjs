import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

const probability = value => ({ type: "number", exclusiveMinimum: 0, exclusiveMaximum: 1, default: value });
const duration = value => ({ ...finite(0, value), exclusiveMinimum: 0 });
export const definition = defineScienceTool({
  name: "estimate_qdk_resources",
  description: "Compile a structured unitary gate circuit to Q# and estimate a physical-qubit/runtime Pareto frontier with modern qdk.qre, GateBased hardware, SurfaceCode and RoundBasedFactory models. Explicit physical error probability and times in ns; no arbitrary Q# source, Azure connection or hardware submission.",
  source: { name: "qdk[qre]", version: "1.32.3", repository: "https://github.com/microsoft/qdk" },
  inputSchema: obj({
    ...circuitSchema(undefined, undefined, true),
    physicalErrorRate: probability(0.0001), gateTimeNs: duration(100), measurementTimeNs: duration(500), maxError: probability(0.01),
  }),
  checkInput: checkCircuit,
  resultSchema: obj({
    numQubits: count(), feasible: { type: "boolean" },
    frontier: arr(obj({ physicalQubits: count(0), runtimeNs: finite(0), errorProbability: finite(0) }), 0),
    search: obj({ traces: count(0), instructionSets: count(0), jobs: count(0), successfulEstimates: count(0) }),
    architecture: { const: "GateBased + SurfaceCode + RoundBasedFactory" },
    application: { const: "QSharpApplication with terminal ResetAll" },
  }),
});
