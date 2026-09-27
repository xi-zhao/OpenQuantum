export const DIFFERENTIABLE_TOOLS = ["pennylane", "deepquantum", "tensorcircuit", "mindquantum"].map(sdk => ({
  id: `${sdk}-differentiable`, server: `${sdk}_local`, tool: `differentiate_${sdk}_circuit`,
  input: {
    numQubits: 2,
    gates: [{ gate: "RY", targets: [0], angle: 0.4 }, { gate: "CX", targets: [0, 1] }],
    observables: ["ZI", "IZ", "XX"], trainableGateIndices: [0],
  },
}));
