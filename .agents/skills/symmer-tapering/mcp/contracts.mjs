import { defineScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import requestContract from "../inputs/request.schema.json" with { type: "json" };
import resultContract from "../artifacts/result.schema.json" with { type: "json" };
import observationContract from "../artifacts/observations.schema.json" with { type: "json" };
const { $schema: requestDraft, ...inputSchema } = requestContract;
const { $schema: resultDraft, ...resultSchema } = resultContract;
void requestDraft; void resultDraft;
export const definition = defineScienceTool({
  name: "taper_symmer_hamiltonian",
  description: "Project a real Pauli Hamiltonian into an explicitly selected commuting symmetry sector using Symmer. Return the reduced Pauli operator, including scalar sectors. Preserve input coefficients by projecting unit Pauli terms before combining them. Full spectrum comparison is optional; no adapter qubit limit.",
  source: {"name":"symmer","version":"0.0.13","commit":"a4ba56e3332424a65d4a2c088fd6363aca0c68e6","repository":"https://github.com/qmatter-labs/symmer"},
  inputSchema, resultSchema, observationSchema: observationContract,
  checkInput(v) {
    if (v.symmetries.length > v.numQubits) throw new Error("A commuting independent symmetry set has at most numQubits generators");
    for (const item of [...v.terms, ...v.symmetries]) if (item.pauli.length !== v.numQubits) throw new Error("Every Pauli word must have numQubits characters");
    if (new Set(v.terms.map(t => t.pauli)).size !== v.terms.length) throw new Error("Combine duplicate Hamiltonian terms first");
    const commute = (a, b) => [...a].filter((p, i) => p !== "I" && b[i] !== "I" && p !== b[i]).length % 2 === 0;
    const basis = new Map();
    for (const symmetry of v.symmetries) {
      if (/^I+$/.test(symmetry.pauli)) throw new Error("Identity is not an independent symmetry");
      for (const term of v.terms) if (term.coefficient !== 0 && !commute(symmetry.pauli, term.pauli)) throw new Error("Symmetry must commute with every nonzero Hamiltonian term");
      for (const other of v.symmetries) if (!commute(symmetry.pauli, other.pauli)) throw new Error("Symmetries must commute pairwise");
      let row = 0n;
      for (let i = 0; i < v.numQubits; i++) {
        const p = symmetry.pauli[i];
        if (p === "X" || p === "Y") row |= 1n << BigInt(i);
        if (p === "Z" || p === "Y") row |= 1n << BigInt(i + v.numQubits);
      }
      for (let bit = 2 * v.numQubits - 1; bit >= 0; bit--) if (row & (1n << BigInt(bit))) {
        if (basis.has(bit)) row ^= basis.get(bit); else { basis.set(bit, row); break; }
      }
      if (!row) throw new Error("Symmetry generators must be independent over GF(2)");
    }
  },
});
