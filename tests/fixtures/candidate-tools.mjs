export const CANDIDATE_TOOLS = [
  { id: "qcut-knitting", server: "qcut_local", tool: "knit_qcut_circuit", input: { numQubits: 2, gates: [{ gate: "H", targets: [1] }, { gate: "S", targets: [1] }, { gate: "CX", targets: [1, 0] }], observables: ["XY", "YX", "ZZ"], shots: 4096 } },
  { id: "compact-optimization", server: "compact_local", tool: "optimize_compact_circuit", input: { numQubits: 2, gates: [{ gate: "CX", targets: [0, 1] }, { gate: "RZ", targets: [1], angle: 0.37 }, { gate: "CX", targets: [0, 1] }] } },
  { id: "openqarp-excited-states", server: "openqarp_local", tool: "solve_openqarp_vqd", input: { numQubits: 1, terms: [{ pauli: "Y", coefficient: 1 }], layers: 1, states: 2, maxIterations: 200 } },
  { id: "cqlib-kernel", server: "cqlib_kernel_local", tool: "fit_cqlib_angle_kernel", input: { trainX: [[0,0],[0.1,0.2],[1.5707963267948966,0],[1.4707963267948965,0.2]], trainY: [0,0,1,1], testX: [[0.05,0.1],[1.5207963267948965,0.1]], testY: [0,1] } },
];
