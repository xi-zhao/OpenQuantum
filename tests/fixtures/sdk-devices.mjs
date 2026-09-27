export const SDK_DEVICE_TOOLS = [
  { id: "perceval-photonics", server: "perceval_local", tool: "simulate_perceval_photonics", input: {
    inputOccupation: [1, 1], operations: [{ gate: "BS", modes: [0, 1], angleRad: Math.PI / 2 }],
  } },
  { id: "iqm-circuit-workbench", server: "iqm_local", tool: "run_iqm_local_circuit", input: {
    simulationMode: "ideal", shots: 512,
  } },
  { id: "alicebob-cat-circuits", server: "alicebob_local", tool: "run_alicebob_local_circuit", input: {
    model: "logical-noiseless", shots: 512,
  } },
  { id: "pulser-dynamics", server: "pulser_local", tool: "simulate_pulser_rydberg", input: {
    atomPositionsUm: [[0, 0]], pulses: [{ durationNs: 200, amplitudeRadPerUs: [2, 2], detuningRadPerUs: [0, 0], phaseRad: 0 }], timeSteps: 4,
  } },
  { id: "qoolqit-workbench", server: "qoolqit_local", tool: "simulate_qoolqit_analog", input: {
    atomPositions: [[0, 0]], durations: [0.2], rabiAmplitude: [2, 2], detuning: [0, 0], timeSteps: 4,
  } },
];
