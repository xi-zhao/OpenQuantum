import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const word = { type: "string", pattern: "^[IXYZ]+$", minLength: 1 };
const exactDimension = { anyOf: [int(1, Number.MAX_SAFE_INTEGER), { type: "string", pattern: "^[1-9][0-9]*$" }] };
export const definition = defineScienceTool({
  name: "taper_symmer_hamiltonian",
  description: "Project a real Pauli Hamiltonian into an explicitly selected commuting symmetry sector using Symmer. Return the reduced Pauli operator, including scalar sectors. Preserve input coefficients by projecting unit Pauli terms before combining them. Full spectrum comparison is optional; no adapter qubit limit.",
  source: { name: "symmer", version: "0.0.13", commit: "a4ba56e3332424a65d4a2c088fd6363aca0c68e6", repository: "https://github.com/qmatter-labs/symmer" },
  inputSchema: obj({ numQubits: int(1, undefined, 2), terms: { ...arr(obj({ pauli: word, coefficient: num() }), 1), default: [{ pauli: "ZI", coefficient: 1 }, { pauli: "IZ", coefficient: 0.5 }, { pauli: "XX", coefficient: 0.3 }] }, symmetries: { ...arr(obj({ pauli: word, sector: { type: "integer", enum: [-1, 1] } }), 1), default: [{ pauli: "ZZ", sector: 1 }] }, referenceMode: referenceModeSchema }),
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
  resultSchema: referenceAwareResultSchema({ reducedQubits: int(0), sectorDimension: exactDimension, reducedTerms: arr(obj({ pauli: { type: "string", pattern: "^[IXYZ]*$" }, coefficient: num() }), 1), reducedSpectrum: nullable(arr(num(), 1)), referenceSectorSpectrum: nullable(arr(num(), 1)), maxSpectrumError: nullable(num(0)), projectorIdempotenceError: nullable(num(0)), bitOrder: { const: "left-to-right tensor factors; reduced qubits use Symmer's transformed basis" } }, ["reducedSpectrum", "referenceSectorSpectrum", "maxSpectrumError", "projectorIdempotenceError"]),
});
