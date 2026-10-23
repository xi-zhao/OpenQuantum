const bell = { numQubits: 2, gates: [{ gate: "H", targets: [0] }, { gate: "CX", targets: [0, 1] }] };
export const SDK_EXPANSION_RESOURCES = [
  { id: "quri-parts-estimation", server: "quri_parts_local", tool: "estimate_quri_observable", input: { ...bell, terms: [{ pauli: "ZZ", coefficient: 1 }, { pauli: "XX", coefficient: 0.5 }] } },
  { id: "qdk-resource-estimation", server: "qdk_local", tool: "estimate_qdk_resources", input: { numQubits: 2, gates: [{ gate: "H", targets: [0] }, { gate: "T", targets: [0] }, { gate: "CX", targets: [0, 1] }] } },
  { id: "qualtran-resources", server: "qualtran_local", tool: "estimate_qualtran_resources", input: { operation: "add", bitsize: 4 } },
  { id: "openfermion-mapping", server: "openfermion_local", tool: "map_openfermion_operator", input: { numModes: 2, terms: [{ coefficient: { real: 2, imag: 0 }, operators: [{ mode: 0, action: "create" }, { mode: 0, action: "annihilate" }] }] } },
  { id: "mqt-ddsim", server: "mqt_ddsim_local", tool: "simulate_mqt_ddsim", input: { ...bell, shots: 100, seed: 7, includeStatevector: true } },
  { id: "mqt-qmap", server: "mqt_qmap_local", tool: "map_mqt_circuit", input: { numQubits: 3, gates: [{ gate: "H", targets: [0] }, { gate: "CX", targets: [0, 2] }, { gate: "CX", targets: [1, 2] }], numPhysicalQubits: 3, coupling: [[0, 1], [1, 0], [1, 2], [2, 1]] } },
];
