import { defineScienceTool, objectSchema as obj, arraySchema as arr, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const pair = obj({ i: count(0), j: count(0), bias: finite() });
const matrix = arr(arr(finite(), 1), 1);
export const definition = defineScienceTool({
  name: "build_kaiwu_qubo",
  description: "Build a symbolic QUBO with QBoson Kaiwu Community, add user-specified squared linear equality penalties, convert to the SDK's augmented Ising matrix, and evaluate given binary assignments. Return full coefficients and offsets with explicit Ising sign convention. Community modeling only, no optimizer, license, telemetry, cloud or hardware. Requires explicitly prepared dependencies.",
  source: { name: "kaiwu-community", version: "1.0.7", repository: "https://github.com/qboson/kaiwu_community" },
  inputSchema: obj({
    linear: { ...arr(finite(), 1), default: [-1, -1] },
    quadratic: { ...arr(pair, 0), default: [] }, offset: finite(undefined, 0),
    constraints: { ...arr(obj({ coefficients: arr(finite(), 1), rhs: finite(), penalty: { ...finite(0), exclusiveMinimum: 0 } }), 0), default: [] },
    assignments: { ...arr(arr(int(0, 1), 1), 0), default: [] },
  }),
  checkInput(v) {
    const seen = new Set();
    for (const { i, j } of v.quadratic) {
      if (i >= v.linear.length || j >= v.linear.length || i === j) throw new Error("Quadratic indices must be distinct and in range");
      const key = [i, j].sort((a, b) => a - b).join(",");
      if (seen.has(key)) throw new Error("Duplicate quadratic pair");
      seen.add(key);
    }
    for (const row of [...v.assignments, ...v.constraints.map(c => c.coefficients)]) {
      if (row.length !== v.linear.length) throw new Error("Assignment and constraint dimensions must match linear");
    }
  },
  resultSchema: obj({
    variableNames: arr({ type: "string", minLength: 1 }, 1),
    quboMatrix: matrix, quboOffset: finite(), isingMatrix: matrix, isingOffset: finite(),
    isingConvention: { const: "E(x) = -s^T J s + isingOffset; s_i=2*x_i-1, final auxiliary spin=+1" },
    evaluations: arr(obj({ values: arr(int(0, 1), 1), objective: finite(), constraintResiduals: arr(finite(), 0), penaltyEnergy: finite(0), energy: finite() }), 0),
    backend: { const: "kaiwu.core.QuboModel + qubo_matrix_to_ising_matrix" },
  }),
});
