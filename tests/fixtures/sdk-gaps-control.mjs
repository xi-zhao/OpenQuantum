export const SDK_GAPS_CONTROL = [
  { id: "qblox-scheduling", server: "qblox_local", tool: "schedule_qblox_pulses", input: { pulses: [{ amplitude: 0.25, durationSeconds: 40e-9, gapAfterSeconds: 16e-9 }, { amplitude: -0.1, durationSeconds: 24e-9, gapAfterSeconds: 0 }], repetitions: 2, sampleRateHz: 1e9 } },
  { id: "qililab-control", server: "qililab_local", tool: "compile_qililab_pulses", input: { pulses: [{ iAmplitude: 0.2, qAmplitude: -0.1, durationNs: 40, waitAfterNs: 16 }] } },
  { id: "guppy-programs", server: "guppy_local", tool: "simulate_guppy_feedback", input: { numQubits: 2, operations: [{ gate: "H", targets: [0] }, { gate: "MEASURE_RESET", targets: [0] }, { gate: "X", targets: [1], conditionMeasurement: 0 }], shots: 32, seed: 42 } },
  { id: "oqc-qat", server: "qat_local", tool: "compile_oqc_qat_pulses", input: { pulses: [{ shape: "square", amplitude: 0.25, phaseRadians: Math.PI / 2, durationNs: 8, waitAfterNs: 4 }] } },
];
