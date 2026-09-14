import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
const vector = arr(arr(num(-1.00000001, 1.00000001), 2, 2), 2, 8);
export const definition = defineScienceTool({
  name: "simulate_graphix_pattern",
  description: "Transpile a 1–3 qubit gate circuit into a Graphix MBQC pattern and simulate corrected outputs for several sampled measurement branches. Return resource graph, executable command description and independent dense statevector comparison. Bound to 12 gates, 64 graph nodes and 10 simultaneously live qubits; pure product input, no noise or hardware.",
  source: { name: "graphix", version: "0.3.5", repository: "https://github.com/TeamGraphix/graphix" },
  inputSchema: obj({ ...circuitSchema(3, 12, true), initialState: { type: "string", enum: ["zero", "plus"], default: "zero" }, branches: int(1, 8, 4), seed: int(0, 2147483639, 7) }),
  checkInput: checkCircuit,
  resultSchema: obj({ nodes: arr(int(0, 1000), 1, 64), edges: arr(arr(int(0, 1000), 2, 2), 0, 512), inputNodes: arr(int(0, 1000), 1, 3), outputNodes: arr(int(0, 1000), 1, 3), maxSpace: int(1, 10), pattern: { type: "string", minLength: 1, maxLength: 32000 }, referenceStatevector: vector, branches: arr(obj({ seed: int(0, 2147483647), statevector: vector, fidelity: num(0, 1.00000001), normError: num(0, 1), measurements: arr(obj({ node: int(0, 1000), outcome: int(0, 1) }), 0, 64) }), 1, 8), maxInfidelity: num(0, 1), bitOrder: { const: "left-to-right logical q0,q1,... mapped by outputNodes" } }),
});
