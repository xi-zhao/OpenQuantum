import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { positive, seed, operation, checkOperations, circuitResult } from "../../../../src/lib/sdk-devices.mjs";
const arities = { x: 1, z: 1, rz: 1, h: 1, s: 1, sdg: 1, t: 1, tdg: 1, cx: 2, ccx: 3 };
export const definition = defineScienceTool({
  name: "run_alicebob_local_circuit",
  description: "Build an Alice & Bob local physical-cat, logical-cat or noiseless logical backend; transpile and sample an explicitly defined gate circuit. Cat noise uses SDK analytical error models, not a bosonic master-equation solve. No credentials, cloud, files or arbitrary code. Uses isolated Qiskit 1.x dependencies, prepared explicitly.",
  source: { name: "qiskit-alice-bob-provider", version: "1.3.0", repository: "https://github.com/Alice-Bob-SW/qiskit-alice-bob-provider" },
  inputSchema: obj({
    numQubits: count(1, 2), model: { enum: ["physical", "logical", "logical-noiseless"], default: "physical" },
    initialStates: { ...arr({ enum: ["0", "1", "+", "-"] }, 1), default: ["+", "0"] },
    operations: { ...arr(operation(Object.keys(arities)), 0), default: [{ gate: "cx", qubits: [0, 1], angleRad: 0 }] },
    modelParameters: { ...obj({ kappa1Hz: finite(10), kappa2Hz: positive(), averagePhotons: finite(4), distance: count(3) }, []), default: {} },
    shots: count(1, 1024), seed,
  }),
  checkInput(v) {
    checkOperations(v, arities, ["rz"]);
    if (v.initialStates.length !== v.numQubits) throw new Error("initialStates must contain exactly numQubits entries");
    if (v.model === "physical" && v.operations.some(op => !["x", "z", "rz", "cx"].includes(op.gate))) throw new Error("Physical-cat model supports x, z, rz and cx gates");
    if (v.model !== "physical" && v.operations.some(op => op.gate === "rz")) throw new Error("Logical-cat model exposes its discrete native gates; rz is not supported");
    const p = v.modelParameters;
    if (v.model === "logical-noiseless" && Object.keys(p).length) throw new Error("Noiseless model has fixed SDK parameters; modelParameters must be empty");
    if (v.model === "physical" && p.distance !== undefined) throw new Error("distance only applies to the logical-cat model");
    if (p.distance !== undefined && p.distance % 2 !== 1) throw new Error("Logical repetition-code distance must be odd");
    const ratio = (p.kappa1Hz ?? 100) / (p.kappa2Hz ?? 10000000);
    if (ratio < 1e-7 || ratio > 1e-1) throw new Error("SDK cat-noise model requires kappa1Hz/kappa2Hz between 1e-7 and 1e-1");
  },
  resultSchema: obj({ ...circuitResult, backendName: { type: "string", minLength: 1 }, model: { enum: ["physical", "logical", "logical-noiseless"] },
    resolvedModelParameters: obj({ kappa1Hz: finite(0), kappa2Hz: finite(0), averagePhotons: finite(0), distance: count(0) }),
    connectivity: { const: "SDK all-to-all local model" }, simulator: { const: "AliceBobLocalProvider ProcessorSimulator" },
  }),
});
