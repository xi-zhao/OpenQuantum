import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";

const finite = { type: "number" };
const vector = arr(finite, 1, 2);
const matrix = arr(vector, 1, 2);
const hash = { type: "string", pattern: "^[a-f0-9]{64}$" };
export const definition = defineScienceTool({
  name: "calculate_rydberg_pair",
  description: "Calculate bounded Rb Rydberg pair potentials and a second-order effective Hamiltonian using independent pinned PairInteraction 2.7.0. Channels: identical nS1/2,m=1/2 atoms, or nS1/2,m=1/2 and nP3/2,m=1/2 exchange. Two atoms along z, static Bz, zero electric field, dipole-dipole interaction only. Return H/h in MHz, overlaps and numerical comparisons; not scientific acceptance. Requires explicit npm run capability:pairinteraction:setup; calculation does not download data. No FatQat dependency or automatic conversion.",
  source: { name: "PairInteraction", version: "2.7.0", repository: "https://github.com/pairinteraction/pairinteraction", tag: "v2.7.0" },
  inputSchema: obj({
    channel: { type: "string", enum: ["ss", "sp_exchange"], default: "ss" },
    nS: int(45, 70, 60),
    nP: int(45, 70),
    magneticFieldG: num(1, 30, 20),
    distancesUm: { ...arr(num(4, 30), 1, 9), uniqueItems: true, default: [8, 12, 16] },
    deltaN: int(1, 3, 2),
    energyWindowGHz: num(1, 25, 10),
  }, []),
  checkInput(input) {
    if (input.channel === "ss" && input.nP !== undefined) throw new Error("nP is only valid for sp_exchange");
    if (input.channel === "sp_exchange" && (input.nP === undefined || Math.abs(input.nP - input.nS) > 2)) throw new Error("sp_exchange requires nP within two of nS");
    if (input.distancesUm.some((r, i, all) => i > 0 && r <= all[i - 1])) throw new Error("distancesUm must be strictly increasing");
  },
  resultSchema: obj({
    database: obj({ release: { const: "v2.0" }, manifestSha256: hash, files: arr(obj({ name: { type: "string" }, sha256: hash }), 7, 7) }),
    model: obj({
      species: { const: "Rb" }, targetStates: arr({ type: "string" }, 1, 2),
      frequencyConvention: { const: "H/h in MHz; ordinary frequency, not angular frequency" },
      energyReferenceMHz: finite, pairBasisSize: int(1, 1024), atomBasisSize: int(1, 300),
      lMax: int(1, 2), totalM: { const: 1 }, perturbationOrder: { const: 2 },
      interaction: { const: "electric dipole-dipole; R parallel B along z; diamagnetism disabled" },
      targetBasisWeights: arr(num(0, 1.000000001), 1, 2),
    }),
    points: arr(obj({
      distanceUm: num(4, 30), effectiveHamiltonianMHz: matrix, effectiveEigenvaluesMHz: vector,
      exactEigenvaluesMHz: vector, exactTargetWeights: arr(num(0, 1.000000001), 1, 2),
      secondOrderShiftsMHz: vector, exchangeMHz: finite,
      hermiticityErrorMHz: num(0, 1), referenceDifferenceMHz: num(0, 1),
      diagonalizationDifferenceMHz: num(0, 1), effectiveSpectrumDeviationMHz: num(0, 1e9),
      maxCouplingToGapRatio: num(0, 1e12), minCoupledGapMHz: num(0, 1e12),
      perturbationStatus: { type: "string", enum: ["within_screen", "outside_screen"] },
    }), 1, 9),
    convergence: obj({ status: { const: "not_evaluated" }, reason: { type: "string" } }),
  }),
});
definition.tool.annotations.openWorldHint = false;
