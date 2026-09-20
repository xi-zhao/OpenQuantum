import { defineScienceTool, objectSchema as obj, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { nullable } from "../../../../src/lib/science-reference.mjs";
const label = int(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
export const definition = defineScienceTool({
  name: "fit_cqlib_angle_kernel",
  description: "Fit the fixed cqlib-qml angle-kernel QSVM adaptation on explicit train/test arrays. Executes the pinned Rust cqlib statevector SDK and checks its kernel against product cos²(x-y); discloses training jitter and classical baseline. No gradients, amplitude encoding or hardware calls.",
  source: { name: "cqlib-qml kernel adaptation", revision: "b3aeb784cf50150f7bb39c86a3a16e397d52ea50", sdkRevision: "1d0a2c49ac32712d995f46147dfc5e3c4f4ac8e6", repository: "https://github.com/cq-lib/cqlib-qml" },
  inputSchema: obj({ trainX: list(list(finite()), 2), trainY: list(label, 2), testX: list(list(finite())), testY: { ...list(label, 0), default: [] }, regularization: finite(0, 1), execution: executionSchema }),
  checkInput(v) {
    const width = v.trainX[0].length;
    if ([...v.trainX, ...v.testX].some(row => row.length !== width)) throw new Error("Feature arrays must have the same nonzero width");
    if (v.trainX.length !== v.trainY.length || (v.testY.length && v.testX.length !== v.testY.length)) throw new Error("Labels must match their explicitly supplied train/test rows");
    if (new Set(v.trainY).size < 2 || v.regularization <= 0) throw new Error("QSVM needs two training classes and positive regularization");
  },
  resultSchema: obj({ trainFidelityKernel: list(list(finite())), testKernel: list(list(finite())), predictions: list(label), analyticPredictions: list(label), rbfPredictions: list(label), testAccuracy: nullable(finite(0)), rbfTestAccuracy: nullable(finite(0)), maxAnalyticKernelError: finite(0), minimumGramEigenvalue: finite(), trainingDiagonalJitter: { const: 1e-8 }, encoder: { const: "tensor product RY(2*x_i); raw features in radians; no implicit scaling" }, sourceTreeSha256: { type: "string", pattern: "^[a-f0-9]{64}$" } }),
});
