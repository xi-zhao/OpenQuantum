export const UNITARY_NEXT_TOOLS = [
  { id: "pyzx-optimization", server: "pyzx_local", tool: "optimize_pyzx_circuit", input: {} },
  { id: "graphix-mbqc", server: "graphix_local", tool: "simulate_graphix_pattern", input: { branches: 4, seed: 7 } },
  { id: "symmer-tapering", server: "symmer_local", tool: "taper_symmer_hamiltonian", input: {} },
  { id: "paulie-algebra", server: "paulie_local", tool: "analyze_paulie_algebra", input: {} },
];
