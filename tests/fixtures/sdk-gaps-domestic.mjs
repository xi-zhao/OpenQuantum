export const SDK_GAPS_DOMESTIC = [
  { id: "simqn-network", server: "simqn_local", tool: "simulate_simqn_link", input: { attempts: 4, intervalSeconds: 0.01, delaySeconds: 0.005, initialFidelity: 0.9, lengthMeters: 100, decoherencePerMeter: 0.002 } },
  { id: "qcover-optimization", server: "qcover_local", tool: "evaluate_qcover_qaoa", input: { fields: [0, 0], edges: [{ source: 0, target: 1, coupling: 1 }], gammas: [0.3], betas: [0.2] } },
  { id: "vqnet-learning", server: "vqnet_local", tool: "differentiate_vqnet_circuit", input: { numQubits: 2, gates: [{ gate: "RY", targets: [0], angle: 0.4 }, { gate: "CX", targets: [0, 1] }], terms: [{ pauli: "ZI", coefficient: 1 }] } },
  { id: "pychemiq-chemistry", server: "pychemiq_local", tool: "map_pychemiq_fermions", input: { numModes: 2, terms: [{ coefficient: { real: 2 }, operators: [{ mode: 0, action: "create" }, { mode: 0, action: "annihilate" }] }] } },
];
