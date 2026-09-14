import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
const word = { type: "string", pattern: "^[IXYZ]+$", minLength: 2, maxLength: 6 };
const term = obj({ pauli: word, coefficient: num(-100, 100) });
export const definition = defineScienceTool({
  name: "taper_symmer_hamiltonian",
  description: "Use Symmer stabilizer projection to taper a real 2–6 qubit Pauli Hamiltonian into a user-selected symmetry sector. Require independent commuting Pauli symmetries with explicit ±1 eigenvalues. Compare the reduced spectrum with an independent dense projection of the same sector. Does not infer the global ground-state sector or run VQE.",
  source: { name: "symmer", version: "0.0.13", commit: "a4ba56e3332424a65d4a2c088fd6363aca0c68e6", repository: "https://github.com/qmatter-labs/symmer" },
  inputSchema: obj({ numQubits: int(2, 6, 2), terms: { ...arr(term, 1, 64), default: [{ pauli: "ZI", coefficient: 1 }, { pauli: "IZ", coefficient: 0.5 }, { pauli: "XX", coefficient: 0.3 }] }, symmetries: { ...arr(obj({ pauli: word, sector: { type: "integer", enum: [-1, 1] } }), 1, 5), default: [{ pauli: "ZZ", sector: 1 }] } }),
  checkInput(v) {
    if (v.symmetries.length >= v.numQubits) throw new Error("Keep at least one untapered qubit");
    for (const item of [...v.terms, ...v.symmetries]) if (item.pauli.length !== v.numQubits) throw new Error("Every Pauli word must have numQubits characters");
    if (new Set(v.terms.map(t => t.pauli)).size !== v.terms.length) throw new Error("Combine duplicate Hamiltonian terms first");
    const commute = (a, b) => [...a].filter((p, i) => p !== "I" && b[i] !== "I" && p !== b[i]).length % 2 === 0;
    for (const symmetry of v.symmetries) {
      if (/^I+$/.test(symmetry.pauli)) throw new Error("Identity is not an independent symmetry");
      for (const term of v.terms.filter(t => t.coefficient !== 0)) if (!commute(symmetry.pauli, term.pauli)) throw new Error("Symmetry must commute with every nonzero Hamiltonian term");
      for (const other of v.symmetries) if (!commute(symmetry.pauli, other.pauli)) throw new Error("Symmetries must commute pairwise");
    }
    const basis = new Map();
    for (const { pauli } of v.symmetries) {
      let row = [...pauli].reduce((value, p, i) => value | ((p === "X" || p === "Y" ? 1 : 0) << i) | ((p === "Z" || p === "Y" ? 1 : 0) << (i + v.numQubits)), 0);
      for (let bit = 2 * v.numQubits - 1; bit >= 0; bit--) if (row & (1 << bit)) {
        if (basis.has(bit)) row ^= basis.get(bit); else { basis.set(bit, row); break; }
      }
      if (!row) throw new Error("Symmetry generators must be independent over GF(2)");
    }
  },
  resultSchema: obj({ reducedQubits: int(1, 5), sectorDimension: int(2, 32), reducedTerms: arr(obj({ pauli: { ...word, minLength: 1, maxLength: 5 }, coefficient: num(-6400, 6400) }), 1, 1024), reducedSpectrum: arr(num(-6400, 6400), 2, 32), referenceSectorSpectrum: arr(num(-6400, 6400), 2, 32), maxSpectrumError: num(0, 12800), projectorIdempotenceError: num(0, 1), bitOrder: { const: "left-to-right tensor factors; reduced qubits use Symmer's transformed basis" } }),
});
