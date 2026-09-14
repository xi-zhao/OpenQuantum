import { defineScienceTool, objectSchema as obj, numberSchema as num } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
export const definition = defineScienceTool({
  name: "solve_tenpy_chain",
  description: "Compute finite spin-1/2 XYZ chain ground states with two-site DMRG, local fields, magnetization, entanglement entropy and convergence observations. Optional independent exact diagonalization; choose chain size, bond dimension and sweeps for your compute resources.",
  source: { name: "physics-tenpy", version: "1.1.1", repository: "https://github.com/tenpy/tenpy" },
  inputSchema: obj({ numSites: count(3,6), jx: num(-2,2,1), jy: num(-2,2,1), jz: num(-2,2,1), hx: num(-2,2,0), hz: num(-2,2,0), maxBondDimension: count(2,32), maxSweeps: count(2,8), referenceMode: referenceModeSchema, execution: executionSchema }),
  resultSchema: referenceAwareResultSchema({ energy: finite(), exactGroundEnergy: nullable(finite()), energyError: nullable(finite()), siteSz: list(num(-0.500001,0.500001),3), entropy: list(finite(-0.000001),2), maxBondDimensionUsed: count(), normError: num(0,1), sweeps: count(), convergence: obj({ criteriaMet: { type: "boolean" }, lastEnergyChange: nullable(finite()), maxTruncationError: nullable(num(0,1)), statement: { const: "Energy/entropy sweep criteria only; not proof of the global ground state." } }), hamiltonian: { const: "sum (Jx Sx_i Sx_j + Jy Sy_i Sy_j + Jz Sz_i Sz_j) - sum (hx Sx_i + hz Sz_i); S=Pauli/2; open chain" } }, ["exactGroundEnergy", "energyError"]),
});
