export const SDK_CLOUD_TOOLS = [
  { id: "ionq-programs", server: "ionq_local", tool: "prepare_ionq_program", input: { numQubits: 3, gates: [{ gate: "RY", targets: [2], angle: .4 }, { gate: "CX", targets: [2, 0] }] } },
  { id: "superstaq-compilation", server: "superstaq_cloud", tool: "prepare_superstaq_circuit", input: { numQubits: 3, gates: [{ gate: "RY", targets: [2], angle: .4 }, { gate: "CX", targets: [2, 0] }] } },
];
