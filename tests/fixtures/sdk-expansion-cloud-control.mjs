export const SDK_EXPANSION_CLOUD_CONTROL = [
  { id: "classiq-synthesis", server: "classiq_cloud", tool: "prepare_classiq_model", input: { numQubits: 3, gates: [{ gate: "H", targets: [2] }, { gate: "CX", targets: [2, 0] }, { gate: "RZ", targets: [1], angle: 0.4 }] } },
  { id: "qctrl-workbench", server: "qctrl_cloud", tool: "prepare_boulder_opal_control", input: { durationSeconds: 1e-6, segments: [{ omegaX: Math.PI * 1e6, omegaY: 0, detuning: 0 }, { omegaX: 0, omegaY: Math.PI * 1e6, detuning: 1e5 }] } },
  { id: "qua-programs", server: "qua_local", tool: "prepare_qua_pulse_program", input: { pulses: [{ amplitudeVolts: 0.2, durationNs: 40, waitAfterNs: 16 }, { amplitudeVolts: -0.1, durationNs: 24, waitAfterNs: 0 }], repetitions: 2 } },
  { id: "laboneq-control", server: "laboneq_local", tool: "compile_laboneq_pulses", input: { pulses: [{ shape: "constant", amplitude: 0.2, lengthSeconds: 80e-9, delayAfterSeconds: 40e-9 }], repetitions: 1, snippetLengthSeconds: 1e-6 } },
];

export const SDK_EXPANSION_CLOUD_CONTROL_AUTH = [
  { id: "classiq-synthesis", server: "classiq_cloud", tool: "synthesize_classiq_circuit", input: { numQubits: 2, gates: [{ gate: "H", targets: [0] }] }, expectedError: "CLASSIQ_XCH_TOKEN is not configured" },
  { id: "qctrl-workbench", server: "qctrl_cloud", tool: "get_qctrl_job_status", input: { product: "fire-opal", jobId: "123" }, expectedError: "QCTRL_API_KEY is not configured" },
];
