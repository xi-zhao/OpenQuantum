const circuit = { numQubits: 2, gates: [{ gate: "X", targets: [0] }, { gate: "RY", targets: [1], angle: 0.4 }, { gate: "CX", targets: [0, 1] }] };
export const SDK_COMPILER_TOOLS = [
  { id: "pytket-compilation", server: "pytket_local", tool: "compile_pytket_circuit", input: circuit },
  { id: "ocean-optimization", server: "ocean_local", tool: "sample_ocean_model", input: { linear: [-1, 2], quadratic: [{ i: 0, j: 1, bias: -3 }], offset: 0.4 } },
  { id: "kaiwu-qubo", server: "kaiwu_local", tool: "build_kaiwu_qubo", input: { linear: [-1, -2], constraints: [{ coefficients: [1, 1], rhs: 1, penalty: 4 }], assignments: [[0, 0], [0, 1], [1, 0], [1, 1]] } },
  { id: "pyquil-simulation", server: "pyquil_local", tool: "simulate_pyquil_circuit", input: circuit },
  { id: "spinqit-simulation", server: "spinqit_local", tool: "simulate_spinqit_circuit", input: circuit },
  { id: "qutrunk-simulation", server: "qutrunk_local", tool: "simulate_qutrunk_circuit", input: circuit },
];
