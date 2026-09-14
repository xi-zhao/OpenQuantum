import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const terms = arr(obj({ pauli: { type: "string", pattern: "^[IXYZ]{2,}$" }, coefficient: num(undefined,undefined) }),1);
export const definition = defineScienceTool({
  name: "train_flow_vqe",
  description: "Train the upstream Flow-VQE single-context sampler for Pauli Hamiltonians using a matrix-free RY/CNOT objective. Qubits, layers and evaluations follow user inputs. Optional dense reference and an equal-evaluation random baseline.",
  source: { name: "Flow-VQE", revision: "f7642afa330e5108ea5738d42fe80b551363733c", repository: "https://github.com/olsson-group/Flow-VQE" },
  inputSchema: obj({ numQubits: int(2,undefined,2), terms, layers: int(1,undefined,1), epochs: int(1,undefined,8), batchSize: int(4,undefined,8), seed: int(0,2147483647,7), referenceMode: referenceModeSchema }),
  checkInput(v) {
    if (!Number.isSafeInteger(v.epochs * v.batchSize) || !Number.isSafeInteger(v.numQubits * (v.layers + 1))) throw new Error("Evaluation and parameter counts must be exactly representable JSON integers");
    if (v.terms.some(term => term.pauli.length !== v.numQubits)) throw new Error("Pauli strings must match numQubits");
    if (new Set(v.terms.map(term => term.pauli)).size !== v.terms.length) throw new Error("Combine duplicate Pauli terms");
  },
  resultSchema: referenceAwareResultSchema({ bestEnergy: num(undefined,undefined), recomputedEnergy: num(undefined,undefined), exactGroundEnergy: nullable(num(undefined,undefined)), error: nullable(num(undefined,undefined)), randomSearchBestEnergy: num(undefined,undefined), evaluationsPerMethod: int(4,undefined), bestParameters: arr(num(undefined,undefined),4), energyHistory: arr(num(undefined,undefined),1), normError: num(0,undefined), ansatz: { const: "zero state; RY on every site, then layers of nearest-neighbor CNOT and RY; leftmost Pauli is q0" }, units: { const: "same energy units as input coefficients" } }, ["exactGroundEnergy", "error"]),
});
