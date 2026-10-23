import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";

const mapping = arr(obj({ logical: count(0), physical: count(0) }), 1);
export const definition = defineScienceTool({
  name: "map_mqt_circuit",
  description: "Map a structured unitary circuit onto a caller-supplied directed CX coupling graph using MQT QMAP's local heuristic mapper, compacting active inputs before identity placement. Return routed OpenQASM 2, separate global phase, and explicit logical-to-physical input/output mappings including idle wires. Graph must be connected when direction is ignored. No calibration or hardware request.",
  source: { name: "mqt-qmap", version: "3.10.0", repository: "https://github.com/munich-quantum-toolkit/qmap" },
  inputSchema: obj({
    ...circuitSchema(undefined, undefined, true), numPhysicalQubits: count(1, 3),
    coupling: { ...arr(arr(count(0), 2, 2), 0), default: [[0, 1], [1, 0], [1, 2], [2, 1]] },
  }),
  checkInput(v) {
    checkCircuit(v);
    if (v.numPhysicalQubits < v.numQubits) throw new Error("The architecture must have at least numQubits physical sites");
    const seen = new Set(); const adjacency = new Map();
    for (const [a, b] of v.coupling) {
      if (a === b || a >= v.numPhysicalQubits || b >= v.numPhysicalQubits || seen.has(`${a}:${b}`)) throw new Error("Coupling edges must be distinct directed pairs of different in-range sites");
      seen.add(`${a}:${b}`);
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a).add(b); adjacency.get(b).add(a);
    }
    const reached = new Set([0]); const queue = [0];
    for (let i = 0; i < queue.length; i += 1) for (const next of adjacency.get(queue[i]) ?? []) if (!reached.has(next)) { reached.add(next); queue.push(next); }
    if (reached.size !== v.numPhysicalQubits) throw new Error("This mapper requires an architecture connected when edge direction is ignored");
  },
  resultSchema: obj({
    numLogicalQubits: count(), numPhysicalQubits: count(), qasm: { type: "string", minLength: 1 },
    globalPhaseRadians: finite(), initialMapping: mapping, finalMapping: mapping,
    resources: obj({ inputGates: count(0), mappedGates: count(0), mappedCXCount: count(0), insertedSwaps: count(0) }),
    method: { const: "MQT QMAP heuristic, compacted identity placement, no pre/post optimization" },
    mappingConvention: { const: "logical input/output qubit -> physical QASM wire; extra physical wires start in zero" },
  }),
});
