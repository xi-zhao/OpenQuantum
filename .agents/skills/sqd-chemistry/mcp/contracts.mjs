import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
const counts = { type: "object", minProperties: 1, patternProperties: { "^[01]+$": int(1,undefined) }, additionalProperties: false };
const elements = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");
const charges = Object.fromEntries(elements.map((element, index) => [element, index + 1]));
const basisSchema = { type: "string", minLength: 1, pattern: "^[A-Za-z0-9][A-Za-z0-9+*(),._ -]*$" };
export const definition = defineScienceTool({
  name: "run_sqd_chemistry",
  description: "Run molecular SQD with closed-shell RHF orbitals and an optional frozen-core active space. User-selected molecule, basis, orbitals and subspace sizes. Optional FCI uses the same active-space Hamiltonian.",
  source: { name: "qiskit-addon-sqd", version: "0.13.1", repository: "https://github.com/Qiskit/qiskit-addon-sqd" },
  inputSchema: obj({ bondLengthAngstrom: num(0.3,undefined,0.735), molecule: obj({ atoms: arr(obj({ element: { enum: elements }, positionAngstrom: arr(num(undefined,undefined),3,3) }),1), charge: int(undefined,undefined,0) }), basis: { ...basisSchema, default: "sto-3g" }, activeSpace: obj({ numOrbitals: int(2,undefined), numElectrons: int(2,undefined) }), maxSubspaceDimension: int(2,undefined,32), shots: int(64,undefined,256), samplesPerBatch: int(4,undefined,16), iterations: int(1,undefined,3), seed: int(0,2147483647,7), counts, referenceMode: referenceModeSchema }, ["bondLengthAngstrom","basis","maxSubspaceDimension","shots","samplesPerBatch","iterations","seed","referenceMode"]),
  checkInput(v) {
    const active = v.activeSpace;
    if (active && (active.numElectrons % 2 || active.numElectrons > 2 * active.numOrbitals)) throw new Error("Active electrons must be even and fit the spatial orbitals");
    const width = active ? 2 * active.numOrbitals : (!v.molecule && v.basis === "sto-3g" ? 4 : null);
    if (v.counts && width && Object.keys(v.counts).some(key => key.length !== width)) throw new Error("Supplied counts must match twice the active spatial orbital count");
    if (v.molecule) {
      const electrons = v.molecule.atoms.reduce((sum, atom) => sum + charges[atom.element], 0) - v.molecule.charge;
      if (electrons < 2 || electrons % 2 || (active && active.numElectrons > electrons)) throw new Error("Molecule requires an even positive closed-shell electron count compatible with the active space");
      for (let i = 0; i < v.molecule.atoms.length; i++) for (let j = 0; j < i; j++) {
        if (Math.hypot(...v.molecule.atoms[i].positionAngstrom.map((x,k) => x - v.molecule.atoms[j].positionAngstrom[k])) < 1e-4) throw new Error("Atomic positions must be distinct");
      }
    }
  },
  resultSchema: referenceAwareResultSchema({ energyHartree: num(undefined,undefined), fciEnergyHartree: nullable(num(undefined,undefined)), hfEnergyHartree: num(undefined,undefined), errorHartree: nullable(num(undefined,undefined)), nuclearEnergyHartree: num(0,undefined), coreEnergyOffsetHartree: num(undefined,undefined), occupancies: arr(arr(num(-0.000001,1.000001),2),2,2), iterationEnergiesHartree: arr(num(undefined,undefined),1), sampleSource: { enum: ["supplied_counts","synthetic_uniform"] }, totalShots: int(1,undefined), spatialOrbitals: int(2,undefined), electrons: arr(int(1,undefined),2,2), frozenCoreOrbitals: int(0,undefined), activeOrbitalIndices: arr(int(0,undefined),2), basis: basisSchema, fullSpatialOrbitals: int(2,undefined), determinantDimension: { anyOf: [int(1, Number.MAX_SAFE_INTEGER), { type: "string", pattern: "^[1-9][0-9]*$" }] }, maxSubspaceDimensionPerSpin: int(1,undefined), bitOrder: { type: "string", minLength: 1 }, spinSector: { const: "n_alpha=n_beta (M_s=0); total spin is not constrained" } }, ["fciEnergyHartree","errorHartree"]),
});
