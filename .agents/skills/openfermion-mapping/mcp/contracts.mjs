import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const complex = obj({ real: finite(undefined, 1), imag: finite(undefined, 0) });
export const definition = defineScienceTool({
  name: "map_openfermion_operator",
  description: "Map structured ordered fermion creation/annihilation products to canonical qubit Pauli sums with OpenFermion Jordan-Wigner or Bravyi-Kitaev. Complex coefficients are allowed; no chemistry database, molecular solver, dense matrix or cloud request. Pauli strings place mode/qubit 0 on the left.",
  source: { name: "openfermion", version: "1.8.1", repository: "https://github.com/quantumlib/OpenFermion" },
  inputSchema: obj({
    numModes: count(1, 2), mapping: { type: "string", enum: ["jordan_wigner", "bravyi_kitaev"], default: "jordan_wigner" },
    terms: { ...arr(obj({ coefficient: { ...complex, default: {} }, operators: arr(obj({ mode: count(0), action: { type: "string", enum: ["create", "annihilate"] } }), 0) }), 1), default: [{ coefficient: { real: 1, imag: 0 }, operators: [{ mode: 0, action: "create" }, { mode: 0, action: "annihilate" }] }] },
  }),
  checkInput(v) {
    if (v.terms.some(term => term.operators.some(op => op.mode >= v.numModes))) throw new Error("Fermion mode must be below numModes");
  },
  resultSchema: obj({
    numQubits: count(), mapping: { type: "string", enum: ["jordan_wigner", "bravyi_kitaev"] },
    terms: arr(obj({ pauli: { type: "string", pattern: "^[IXYZ]+$" }, coefficient: complex }), 0),
    coefficientL1Norm: finite(0), hermitian: { type: "boolean" }, hermiticityResidualL1: finite(0),
    pauliConvention: { const: "leftmost letter is qubit 0; Bravyi-Kitaev changes occupation encoding" },
  }),
});
