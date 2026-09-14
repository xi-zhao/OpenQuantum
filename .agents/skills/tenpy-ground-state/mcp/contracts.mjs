import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
export const definition = defineScienceTool({
  name: "solve_tenpy_chain",
  description: "Solve finite spin-1/2 XYZ chains and local fields using TeNPy two-site DMRG. Sites, bond dimension and sweeps follow user inputs. Return convergence observations and an optional independent dense reference.",
  source: { name: "physics-tenpy", version: "1.1.1", repository: "https://github.com/tenpy/tenpy" },
  inputSchema: obj({ numSites: int(3,undefined,6), jx: num(undefined,undefined,1), jy: num(undefined,undefined,1), jz: num(undefined,undefined,1), hx: num(undefined,undefined,0), hz: num(undefined,undefined,0), maxBondDimension: int(2,undefined,32), maxSweeps: int(2,undefined,8), referenceMode: referenceModeSchema }),
  resultSchema: referenceAwareResultSchema({ energy: num(undefined,undefined), exactGroundEnergy: nullable(num(undefined,undefined)), energyError: nullable(num(undefined,undefined)), siteSz: arr(num(-0.500001,0.500001),3), entropy: arr(num(undefined,undefined),2), maxBondDimensionUsed: int(1,undefined), normError: num(0,1), sweeps: int(1,undefined), convergence: obj({ criteriaMet: { type: "boolean" }, lastEnergyChange: nullable(num(undefined,undefined)), maxTruncationError: nullable(num(0,1)), statement: { const: "Energy/entropy sweep criteria only; not proof of the global ground state." } }), hamiltonian: { const: "sum (Jx Sx_i Sx_j + Jy Sy_i Sy_j + Jz Sz_i Sz_j) - sum (hx Sx_i + hz Sz_i); S=Pauli/2; open chain" } }, ["exactGroundEnergy", "energyError"]),
});
