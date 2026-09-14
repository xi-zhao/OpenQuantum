export const UNITARY_TOOLS = [
  { id: "dynamiqs-dynamics", server: "dynamiqs_local", tool: "simulate_dynamiqs_dynamics", input: { drives: [0.5, 1], duration: 0.5, steps: 8 } },
  { id: "clifft-sampling", server: "clifft_local", tool: "sample_clifft_circuit", input: { shots: 1024 } },
  { id: "oqupy-dynamics", server: "oqupy_local", tool: "simulate_oqupy_spin_boson", input: { steps: 8, memorySteps: 8, duration: 0.5 } },
  { id: "deltakit-qec", server: "deltakit_local", tool: "run_deltakit_memory", input: { rounds: 2, shots: 512 } },
];
