import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable, checkReferenceRequest } from "../../../../src/lib/science-reference.mjs";
const terms = arr(obj({ pauli: { type: "string", pattern: "^[IXYZ]{2,20}$" }, coefficient: num(-10,10) }),1,128);
export const definition = defineScienceTool({
  name: "train_flow_vqe",
  description: "Train the upstream Flow-VQE single-context sampler for 2–20 qubit Pauli Hamiltonians using a matrix-free local RY/CNOT objective, within circuit-evaluation budgets. Optional dense reference through 10 qubits; equal-budget random baseline without advantage claims.",
  source: { name: "Flow-VQE", revision: "f7642afa330e5108ea5738d42fe80b551363733c", repository: "https://github.com/olsson-group/Flow-VQE" },
  inputSchema: obj({ numQubits: int(2,20,2), terms, layers: int(1,4,1), epochs: int(1,200,8), batchSize: int(4,64,8), seed: int(0,2147483647,7), referenceMode: referenceModeSchema }),
  checkInput(v) {
    if (v.terms.some(term => term.pauli.length !== v.numQubits)) throw new Error("Pauli strings must match numQubits");
    if (new Set(v.terms.map(term => term.pauli)).size !== v.terms.length) throw new Error("Combine duplicate Pauli terms");
    checkReferenceRequest(v.referenceMode, v.numQubits, 10, "Dense diagonalization");
    if (v.epochs * v.batchSize > 4096) throw new Error("At most 4096 training circuit evaluations");
    const work = 2 * v.epochs * v.batchSize * 2 ** v.numQubits * (v.numQubits * (2 * v.layers + 1) + v.terms.length);
    if (work > 536870912) throw new Error("Statevector work budget exceeded; reduce qubits, layers, terms or evaluations");
  },
  resultSchema: referenceAwareResultSchema({ bestEnergy: num(-1281,1281), recomputedEnergy: num(-1281,1281), exactGroundEnergy: nullable(num(-1281,1281)), error: nullable(num(-2562,2562)), randomSearchBestEnergy: num(-1281,1281), evaluationsPerMethod: int(4,4096), bestParameters: arr(num(-1e8,1e8),4,100), energyHistory: arr(num(-1281,1281),1,200), normError: num(0,0.001), ansatz: { const: "zero state; RY on every site, then layers of nearest-neighbor CNOT and RY; leftmost Pauli is q0" }, units: { const: "same energy units as input coefficients" } }, ["exactGroundEnergy", "error"]),
});
