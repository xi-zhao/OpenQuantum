export const HAMILTONIAN_INPUT = {
  numQubits: 2,
  terms: [
    { pauli: "XI", coefficient: 0.7 },
    { pauli: "ZY", coefficient: -0.4 },
    { pauli: "IZ", coefficient: 0.2 },
    { pauli: "II", coefficient: 0.1 },
  ],
  time: 0.8,
  method: "trotter",
  order: 2,
  steps: 8,
};
