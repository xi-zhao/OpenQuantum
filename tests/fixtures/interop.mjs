export const INTEROP_TOOLS = [
  { id: "clifft-sampling", server: "clifft_local", tool: "sample_clifft_qec", contract: "qec-contracts.mjs", exportName: "qecDefinition", input: { stimCircuit: "H 0\nT 0\nH 0\nM 0\nDETECTOR rec[-1]\nOBSERVABLE_INCLUDE(0) rec[-1]", shots: 1024 } },
  { id: "qbraid-conversion", server: "qbraid_local", tool: "convert_qbraid_circuit", contract: "contracts.mjs", exportName: "definition", input: { numQubits: 3, gates: [{ gate: "X", targets: [0] }, { gate: "RY", targets: [2], angle: 0.4 }, { gate: "CX", targets: [2, 0] }] } },
  { id: "qdmi-device", server: "qdmi_local", tool: "inspect_qdmi_devices", contract: "contracts.mjs", exportName: "definition", input: {} },
];
