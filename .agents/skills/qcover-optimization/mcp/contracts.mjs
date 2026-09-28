import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "evaluate_qcover_qaoa",
  description: "Evaluate an Ising graph QAOA parameter point with Qcover's p-neighbourhood decomposition and exact Qulacs backend. Input node fields, edge couplings and equally sized gamma/beta lists in radians; output energy and decomposition sizes. No optimizer, cloud or hardware; prepare dependencies explicitly.",
  source: { name: "Qcover", version: "2.6.0", repository: "https://github.com/BAQIS-Quantum/Qcover" },
  inputSchema: obj({
    fields: { ...arr(finite(), 1), default: [0, 0] },
    edges: { ...arr(obj({ source: count(0), target: count(0), coupling: finite() }), 0), default: [{ source: 0, target: 1, coupling: 1 }] },
    gammas: { ...arr(finite(), 1), default: [0.3] }, betas: { ...arr(finite(), 1), default: [0.2] },
  }),
  checkInput(v) {
    if (v.gammas.length !== v.betas.length) throw new Error("gammas and betas must have the same layer count");
    const seen = new Set();
    for (const edge of v.edges) {
      if (edge.source === edge.target || Math.max(edge.source, edge.target) >= v.fields.length) throw new Error("Edges must join distinct existing nodes");
      const key = [edge.source, edge.target].sort((a, b) => a - b).join(",");
      if (seen.has(key)) throw new Error("Duplicate undirected edge; combine its coupling before calling");
      seen.add(key);
    }
  },
  resultSchema: obj({
    numQubits: count(), layers: count(), energy: finite(), subgraphCount: count(), largestSubgraphQubits: count(),
    edgeExpectations: arr(obj({ source: count(0), target: count(0), zz: finite() }), 0),
    backend: { const: "Qcover CircuitByQulacs" },
    hamiltonianConvention: { const: "sum_i fields[i] Z_i + sum_edges coupling Z_source Z_target" },
  }),
});
