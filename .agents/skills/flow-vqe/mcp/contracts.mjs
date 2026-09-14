import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const terms = list(obj({ pauli: { type: "string", pattern: "^[IXYZ]+$", minLength: 2 }, coefficient: num(-10,10) }));
export const definition = defineScienceTool({
  name: "train_flow_vqe",
  description: "Learn low-energy RY/CNOT circuit parameters for Pauli Hamiltonians with upstream Flow-VQE and matrix-free statevector expectations. Compare equal-evaluation random search; optional exact diagonalization. Choose qubits, layers and training budget for your compute resources.",
  source: { name: "Flow-VQE", revision: "f7642afa330e5108ea5738d42fe80b551363733c", repository: "https://github.com/olsson-group/Flow-VQE" },
  inputSchema: obj({ numQubits: count(2,2), terms, layers: count(1,1), epochs: count(1,8), batchSize: count(4,8), seed: int(0,2147483647,7), referenceMode: referenceModeSchema, execution: executionSchema }),
  checkInput(v) {
    if (v.terms.some(term => term.pauli.length !== v.numQubits)) throw new Error("Pauli strings must match numQubits");
    if (new Set(v.terms.map(term => term.pauli)).size !== v.terms.length) throw new Error("Combine duplicate Pauli terms");
    if (!Number.isSafeInteger(v.epochs * v.batchSize) || !Number.isSafeInteger(v.numQubits * (v.layers + 1))) throw new Error("Evaluation and parameter counts must be exactly representable JSON integers");
  },
  resultSchema: referenceAwareResultSchema({ bestEnergy: finite(), recomputedEnergy: finite(), exactGroundEnergy: nullable(finite()), error: nullable(finite()), randomSearchBestEnergy: finite(), evaluationsPerMethod: count(4), bestParameters: list(finite(),4), energyHistory: list(finite()), normError: num(0,0.001), ansatz: { const: "zero state; RY on every site, then layers of nearest-neighbor CNOT and RY; leftmost Pauli is q0" }, units: { const: "same energy units as input coefficients" } }, ["exactGroundEnergy", "error"]),
});
