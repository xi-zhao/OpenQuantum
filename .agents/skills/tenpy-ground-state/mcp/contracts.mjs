import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
export const definition = defineScienceTool({
  name: "solve_tenpy_chain",
  description: "Run finite-chain two-site DMRG with pinned TeNPy for a 3–10 site spin-1/2 XYZ model and local fields; independently diagonalize its dense Hamiltonian as a small-system reference.",
  source: { name: "physics-tenpy", version: "1.1.1", repository: "https://github.com/tenpy/tenpy" },
  inputSchema: obj({ numSites: int(3,10,6), jx: num(-2,2,1), jy: num(-2,2,1), jz: num(-2,2,1), hx: num(-2,2,0), hz: num(-2,2,0), maxBondDimension: int(2,64,32), maxSweeps: int(2,20,8) }),
  resultSchema: obj({ energy: num(-100,100), exactGroundEnergy: num(-100,100), energyError: num(-200,200), siteSz: arr(num(-0.500001,0.500001),2,10), entropy: arr(num(-0.000001,10),1,9), maxBondDimensionUsed: int(1,64), normError: num(0,0.1), sweeps: int(1,40), hamiltonian: { const: "sum (Jx Sx_i Sx_j + Jy Sy_i Sy_j + Jz Sz_i Sz_j) - sum (hx Sx_i + hz Sz_i); S=Pauli/2; open chain" } }),
});
