export const SDK_EXPANSION_IO = [
  { id: "cudaq-simulation", server: "cudaq_local", tool: "simulate_cudaq_circuit", input: { numQubits: 3, gates: [{ gate: "X", targets: [0] }, { gate: "H", targets: [2] }], shots: 64, seed: 42 } },
  { id: "netqasm-network", server: "netqasm_local", tool: "prepare_netqasm_bell_program", input: { aliceBasis: "X", bobBasis: "Z" } },
  { id: "qcarchive-query", server: "qcarchive_data", tool: "query_qcarchive_singlepoints", input: { method: "hf", limit: 1 }, expectError: true, errorPattern: "QCPORTAL_ADDRESS" },
];
