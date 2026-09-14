import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable, checkReferenceRequest } from "../../../../src/lib/science-reference.mjs";
export const definition = defineScienceTool({
  name: "solve_tenpy_chain",
  description: "Run finite-chain two-site DMRG with pinned TeNPy for a 3–256 site spin-1/2 XYZ model and local fields. Independent dense diagonalization is optional and limited to 10 sites; return convergence observations for the main calculation.",
  source: { name: "physics-tenpy", version: "1.1.1", repository: "https://github.com/tenpy/tenpy" },
  inputSchema: obj({ numSites: int(3,256,6), jx: num(-2,2,1), jy: num(-2,2,1), jz: num(-2,2,1), hx: num(-2,2,0), hz: num(-2,2,0), maxBondDimension: int(2,256,32), maxSweeps: int(2,100,8), referenceMode: referenceModeSchema }),
  checkInput(v) {
    checkReferenceRequest(v.referenceMode, v.numSites, 10, "Dense diagonalization");
    if (v.numSites * v.maxBondDimension ** 2 > 4194304) throw new Error("numSites times maxBondDimension squared exceeds the tensor memory budget (4194304)");
  },
  resultSchema: referenceAwareResultSchema({ energy: num(-4096,4096), exactGroundEnergy: nullable(num(-4096,4096)), energyError: nullable(num(-8192,8192)), siteSz: arr(num(-0.500001,0.500001),3,256), entropy: arr(num(-0.000001,10),2,255), maxBondDimensionUsed: int(1,256), normError: num(0,1), sweeps: int(1,200), convergence: obj({ criteriaMet: { type: "boolean" }, lastEnergyChange: nullable(num(-8192,8192)), maxTruncationError: nullable(num(0,1)), statement: { const: "Energy/entropy sweep criteria only; not proof of the global ground state." } }), hamiltonian: { const: "sum (Jx Sx_i Sx_j + Jy Sy_i Sy_j + Jz Sz_i Sz_j) - sum (hx Sx_i + hz Sz_i); S=Pauli/2; open chain" } }, ["exactGroundEnergy", "energyError"]),
});
