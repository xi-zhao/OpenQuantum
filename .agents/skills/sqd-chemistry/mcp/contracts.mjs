import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const counts = { type: "object", minProperties: 1, maxProperties: 4096, patternProperties: { "^[01]{4,64}$": int(1,4096) }, additionalProperties: false };
export function determinantDimension(orbitals, electrons) {
  const k = Math.min(electrons / 2, orbitals - electrons / 2);
  let dimension = 1;
  for (let i = 1; i <= k; i++) dimension *= (orbitals - i + 1) / i;
  return Math.round(dimension) ** 2;
}
export const definition = defineScienceTool({
  name: "run_sqd_chemistry",
  description: "Run molecular SQD with closed-shell RHF orbitals, structured H–Ne atoms, STO-3G/6-31G/cc-pVDZ basis and optional frozen-core active space (2–32 spatial orbitals), within integral/subspace budgets. Default H2 remains available. Optional FCI uses the same active-space Hamiltonian.",
  source: { name: "qiskit-addon-sqd", version: "0.13.1", repository: "https://github.com/Qiskit/qiskit-addon-sqd" },
  inputSchema: obj({ bondLengthAngstrom: num(0.3,3,0.735), molecule: obj({ atoms: arr(obj({ element: { enum: ["H","He","Li","Be","B","C","N","O","F","Ne"] }, positionAngstrom: arr(num(-100,100),3,3) }),1,16), charge: int(-8,8,0) }), basis: { enum: ["sto-3g","6-31g","cc-pvdz"], default: "sto-3g" }, activeSpace: obj({ numOrbitals: int(2,32), numElectrons: int(2,64) }), maxSubspaceDimension: int(2,128,32), shots: int(64,4096,256), samplesPerBatch: int(4,256,16), iterations: int(1,10,3), seed: int(0,2147483647,7), counts, referenceMode: referenceModeSchema }, ["bondLengthAngstrom","basis","maxSubspaceDimension","shots","samplesPerBatch","iterations","seed","referenceMode"]),
  checkInput(v) {
    const active = v.activeSpace;
    if (active && (active.numElectrons % 2 || active.numElectrons > 2 * active.numOrbitals)) throw new Error("Active electrons must be even and fit the spatial orbitals");
    if (active && active.numOrbitals ** 4 * v.maxSubspaceDimension ** 2 > 268435456) throw new Error("Active integral/subspace work budget exceeded; reduce orbitals or maxSubspaceDimension");
    if (active && v.referenceMode === "required" && (active.numOrbitals > 12 || determinantDimension(active.numOrbitals, active.numElectrons) > 10000)) throw new Error("Required FCI reference exceeds 12 orbitals or 10000 determinants");
    const width = active ? 2 * active.numOrbitals : (!v.molecule && v.basis === "sto-3g" ? 4 : null);
    if (v.counts && Object.values(v.counts).reduce((a,b) => a+b,0) > 4096) throw new Error("At most 4096 supplied counts");
    if (v.counts && width && Object.keys(v.counts).some(key => key.length !== width)) throw new Error("Supplied counts must match twice the active spatial orbital count");
    if (v.molecule) {
      const charges = { H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10 };
      const electrons = v.molecule.atoms.reduce((sum, atom) => sum + charges[atom.element], 0) - v.molecule.charge;
      if (electrons < 2 || electrons % 2 || (active && active.numElectrons > electrons)) throw new Error("Molecule requires an even positive closed-shell electron count compatible with the active space");
      for (let i = 0; i < v.molecule.atoms.length; i++) for (let j = 0; j < i; j++) {
        if (Math.hypot(...v.molecule.atoms[i].positionAngstrom.map((x,k) => x - v.molecule.atoms[j].positionAngstrom[k])) < 1e-4) throw new Error("Atomic positions must be distinct");
      }
    }
  },
  resultSchema: referenceAwareResultSchema({ energyHartree: num(-1e6,1e6), fciEnergyHartree: nullable(num(-1e6,1e6)), hfEnergyHartree: num(-1e6,1e6), errorHartree: nullable(num(-2e6,2e6)), nuclearEnergyHartree: num(0,1e6), coreEnergyOffsetHartree: num(-1e6,1e6), occupancies: arr(arr(num(-0.000001,1.000001),2,32),2,2), iterationEnergiesHartree: arr(num(-1e6,1e6),1,10), sampleSource: { enum: ["supplied_counts","synthetic_uniform"] }, totalShots: int(1,4096), spatialOrbitals: int(2,32), electrons: arr(int(1,32),2,2), frozenCoreOrbitals: int(0,80), activeOrbitalIndices: arr(int(0,127),2,32), basis: { enum: ["sto-3g","6-31g","cc-pvdz"] }, fullSpatialOrbitals: int(2,128), determinantDimension: num(1,1e19), maxSubspaceDimensionPerSpin: int(1,128), bitOrder: { type: "string", minLength: 1, maxLength: 600 }, spinSector: { const: "n_alpha=n_beta (M_s=0); total spin is not constrained" } }, ["fciEnergyHartree","errorHartree"]),
});
