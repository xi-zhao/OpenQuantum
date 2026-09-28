const bell = { numQubits: 2, gates: [{ gate: "H", targets: [0] }, { gate: "CX", targets: [0, 1] }] };
export const SDK_GAPS_SIMULATION = [
  { id: "mrmustard-optics", server: "mrmustard_local", tool: "simulate_mrmustard_optics", input: { numModes: 1, cutoff: 6, operations: [{ operation: "D", modes: [0], x: 0.5, y: 0 }] } },
  { id: "merlin-learning", server: "merlin_local", tool: "evaluate_merlin_layer", input: { phases: [[0.7], [1.2]] } },
  { id: "mimiq-simulation", server: "mimiq_local", tool: "simulate_mimiq_circuit", input: { ...bell, shots: 100, seed: 7 } },
  { id: "myqlm-simulation", server: "myqlm_local", tool: "simulate_myqlm_circuit", input: bell },
];
