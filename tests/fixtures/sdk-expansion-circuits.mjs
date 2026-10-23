const circuit = { numQubits: 2, gates: [{ gate: "X", targets: [0] }, { gate: "RY", targets: [1], angle: 0.4 }, { gate: "CX", targets: [0, 1] }] };
export const SDK_EXPANSION_CIRCUITS = [
  { id: "qsteed-compilation", server: "qsteed_local", tool: "compile_qsteed_circuit", input: circuit },
  { id: "quairkit-information", server: "quairkit_local", tool: "simulate_quairkit_channel", input: { ...circuit, channels: [{ channel: "amplitude_damping", target: 0, strength: 0.25 }] } },
  { id: "qcompute-simulation", server: "qcompute_local", tool: "simulate_qcompute_circuit", input: circuit },
  { id: "qibo-simulation", server: "qibo_local", tool: "simulate_qibo_circuit", input: circuit },
  { id: "qrisp-arithmetic", server: "qrisp_local", tool: "compute_qrisp_modular_sum", input: { bitWidth: 3, initialBits: "110", addendBits: "011", preparation: "basis" } },
  { id: "lightworks-photonics", server: "lightworks_local", tool: "simulate_lightworks_photonics", input: { inputOccupation: [1, 1], operations: [{ gate: "BS", modes: [0, 1], reflectivity: 0.5 }] } },
  { id: "braket-simulation", server: "braket_local", tool: "simulate_braket_circuit", input: circuit },
];
