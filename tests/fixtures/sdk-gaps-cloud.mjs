const bell = { numQubits: 2, gates: [{ gate: "H", targets: [0] }, { gate: "CX", targets: [0, 1] }] };
export const SDK_GAPS_CLOUD = [
  { id: "aqt-workbench", server: "aqt_local", tool: "simulate_aqt_circuit", input: { ...bell, shots: 100, seed: 17 } },
  { id: "oqc-cloud", server: "oqc_cloud", tool: "prepare_oqc_task", input: { ...bell, qpuId: "explicit-test-target", shots: 100 } },
  { id: "quantuminspire-cloud", server: "quantuminspire_cloud", tool: "query_quantum_inspire", input: { action: "backends", page: 1, pageSize: 10 }, expectError: true, errorPattern: "QUANTUMINSPIRE_API_TOKEN is not configured" },
];
export const SDK_GAPS_CLOUD_AUTH = [
  { id: "aqt-workbench", server: "aqt_local", tool: "list_aqt_devices", input: {}, expectError: true, errorPattern: "AQT_API_TOKEN is not configured" },
  { id: "oqc-cloud", server: "oqc_cloud", tool: "query_oqc_service", input: {}, expectError: true, errorPattern: "OQC_API_TOKEN is not configured" },
  { id: "oqc-cloud", server: "oqc_cloud", tool: "submit_oqc_task", input: { ...bell, qpuId: "explicit-test-target", shots: 100 }, expectError: true, errorPattern: "OQC_API_TOKEN is not configured" },
];
