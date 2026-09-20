import { defineScienceTool, objectSchema as obj, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";

import { pauliTerms, checkPaulis } from "../../../../src/lib/candidate-circuit.mjs";
const parameter = obj({ name: { type: "string" }, value: finite() });
export const definition = defineScienceTool({
  name: "solve_openqarp_vqd",
  description: "Find variational ground and excited states with fixed OpenQARP VQD and complex RY/RZ/CX ansatz. Independently reconstruct energies, residual variances and state overlaps; optionally compare the exact spectrum. Preserve optimizer failures and nonconvergence as observations.",
  source: { name: "OpenQARP", version: "0.1.0", repository: "https://github.com/OpenQARP/openqarp" },
  inputSchema: obj({ numQubits: count(1, 2), terms: pauliTerms, states: count(1, 2), layers: count(1, 2), maxIterations: count(1, 200), seed: int(0, 2147483647, 42), referenceMode: referenceModeSchema, execution: executionSchema }),
  checkInput(v) {
    checkPaulis(v);
    if (Math.log2(v.states) > v.numQubits) throw new Error("Requested states exceed Hilbert-space dimension");
    if (!Number.isFinite(2*v.terms.filter(t => /[XYZ]/.test(t.pauli)).reduce((s,t) => s+Math.abs(t.coefficient), 0)+1)) throw new Error("Hamiltonian coefficient norm exceeds floating-point representation");
  },
  resultSchema: referenceAwareResultSchema({ energies: list(finite()), recomputedEnergies: list(finite()), residualVariances: list(finite(0)), overlaps: list(list(finite(0))), normErrors: list(finite(0)), maxEnergyConsistencyError: finite(0), exactEnergies: nullable(list(finite())), energyErrors: nullable(list(finite())), penalty: finite(0), parameters: list(list(parameter)), optimizer: list(obj({ success: { type: "boolean" }, message: { type: "string" }, iterations: count(0), evaluations: count(0) })), ansatz: { const: "RY then RZ on each qubit, then linear CX per layer; q0 is least significant bit" }, units: { const: "input Hamiltonian energy units; residual variance in squared units" } }, ["exactEnergies", "energyErrors"]),
});
