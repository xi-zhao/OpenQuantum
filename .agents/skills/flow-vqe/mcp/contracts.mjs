import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
const terms = arr(obj({ pauli: { type: "string", pattern: "^[IXYZ]{2,4}$" }, coefficient: num(-10,10) }),1,32);
export const definition = defineScienceTool({
  name: "train_flow_vqe",
  description: "Train the upstream Flow-VQE single-context normalizing-flow sampler for a bounded 2–4 qubit Pauli Hamiltonian using a local RY/CNOT ansatz. Report exact energy and equal-budget random search without claiming an advantage.",
  source: { name: "Flow-VQE", revision: "f7642afa330e5108ea5738d42fe80b551363733c", repository: "https://github.com/olsson-group/Flow-VQE" },
  inputSchema: obj({ numQubits: int(2,4,2), terms, layers: int(1,2,1), epochs: int(1,30,8), batchSize: int(4,32,8), seed: int(0,2147483647,7) }),
  checkInput(v) {
    if (v.terms.some(term => term.pauli.length !== v.numQubits)) throw new Error("Pauli strings must match numQubits");
    if (new Set(v.terms.map(term => term.pauli)).size !== v.terms.length) throw new Error("Combine duplicate Pauli terms");
    if (v.epochs*v.batchSize > 512) throw new Error("At most 512 training circuit evaluations");
  },
  resultSchema: obj({ bestEnergy: num(-321,321), recomputedEnergy: num(-321,321), exactGroundEnergy: num(-321,321), error: num(-642,642), randomSearchBestEnergy: num(-321,321), evaluationsPerMethod: int(4,512), bestParameters: arr(num(-1e8,1e8),4,12), energyHistory: arr(num(-321,321),1,30), normError: num(0,0.001), ansatz: { const: "zero state; RY on every site, then layers of nearest-neighbor CNOT and RY; leftmost Pauli is q0" }, units: { const: "same energy units as input coefficients" } }),
});
