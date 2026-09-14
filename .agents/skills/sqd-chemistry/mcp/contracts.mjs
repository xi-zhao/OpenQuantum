import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
const counts = { type: "object", minProperties: 1, patternProperties: { "^[01]{4,126}$": count() }, additionalProperties: false };
export const definition = defineScienceTool({
  name: "run_sqd_chemistry",
  description: "Run molecular SQD with closed-shell RHF orbitals, structured H–Ne atoms, STO-3G/6-31G/cc-pVDZ basis and optional frozen-core active space. Default H2 remains available. Optional FCI uses the same active-space Hamiltonian.",
  source: { name: "qiskit-addon-sqd", version: "0.13.1", repository: "https://github.com/Qiskit/qiskit-addon-sqd" },
  inputSchema: obj({ bondLengthAngstrom: num(0.3,3,0.735), molecule: obj({ atoms: list(obj({ element: { enum: ["H","He","Li","Be","B","C","N","O","F","Ne"] }, positionAngstrom: arr(num(-100,100),3,3) })), charge: int(-8,8,0) }), basis: { enum: ["sto-3g","6-31g","cc-pvdz"], default: "sto-3g" }, activeSpace: obj({ numOrbitals: int(2,63), numElectrons: int(2,126) }), maxSubspaceDimension: count(2,32), shots: count(1,256), samplesPerBatch: count(4,16), iterations: count(1,3), seed: int(0,2147483647,7), counts, referenceMode: referenceModeSchema, execution: executionSchema }, ["bondLengthAngstrom","basis","maxSubspaceDimension","shots","samplesPerBatch","iterations","seed","referenceMode","execution"]),
  checkInput(v) {
    const active = v.activeSpace;
    if (active && (active.numElectrons % 2 || active.numElectrons > 2 * active.numOrbitals)) throw new Error("Active electrons must be even and fit the spatial orbitals");
    const width = active ? 2 * active.numOrbitals : (!v.molecule && v.basis === "sto-3g" ? 4 : null);
    if (v.counts && !Number.isSafeInteger(Object.values(v.counts).reduce((a,b) => a+b,0))) throw new Error("Total counts must be exactly representable as a JSON integer");
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
  resultSchema: referenceAwareResultSchema({ energyHartree: finite(), fciEnergyHartree: nullable(finite()), hfEnergyHartree: finite(), errorHartree: nullable(finite()), nuclearEnergyHartree: finite(0), coreEnergyOffsetHartree: finite(), occupancies: arr(arr(num(-0.000001,1.000001),2,63),2,2), iterationEnergiesHartree: list(finite()), sampleSource: { enum: ["supplied_counts","synthetic_uniform"] }, totalShots: count(), spatialOrbitals: int(2,63), electrons: arr(int(1,63),2,2), frozenCoreOrbitals: count(0), activeOrbitalIndices: arr(count(0),2,63), basis: { enum: ["sto-3g","6-31g","cc-pvdz"] }, fullSpatialOrbitals: count(2), determinantDimension: { anyOf: [count(), { type: "string", pattern: "^[1-9][0-9]*$" }] }, maxSubspaceDimensionPerSpin: count(), bitOrder: { type: "string", minLength: 1, maxLength: 2048 }, spinSector: { const: "n_alpha=n_beta (M_s=0); total spin is not constrained" } }, ["fciEnergyHartree","errorHartree"]),
});
