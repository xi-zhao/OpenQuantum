export const FLUX_QUANTUM_WEBERS = 2.067833848e-15;

export const QMCLAW_PROVIDER_ID = "openquantum-native-quantum-tools";
export const QMCLAW_UPSTREAM = Object.freeze({
  repository: "https://github.com/QMC-AI/QMClaw",
  revision: "18d7fa1594949a1203fca4866e651641bbde021f",
  license: "MIT",
});

export const SOURCE_KIND = "simulation";
export const SCIENTIFIC_VALIDATION = "not_evaluated";
export const MIN_POINTS = 16;
export const MAX_POINTS = 256;
export const MIN_SECONDARY_POINTS = 8;
export const MAX_SECONDARY_POINTS = 64;
export const MIN_SHOTS = 16;
export const MAX_SHOTS = 4096;
export const MAX_SEED = 0x7fffffff;
export const QUBITS_PER_RUN = 1;
export const QUBIT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;

export const PARAMETER_DEFINITIONS = Object.freeze({
  centerFrequencyHz: Object.freeze({
    unit: "Hz",
    minimum: 1e6,
    maximum: 1e13,
    description: "Center frequency in hertz.",
  }),
  spanFrequencyHz: Object.freeze({
    unit: "Hz",
    minimum: 1e3,
    maximum: 1e12,
    description: "Full frequency span in hertz.",
  }),
  driveAmplitudeVolts: Object.freeze({
    unit: "V",
    minimum: 1e-6,
    maximum: 10,
    description:
      "Reference drive amplitude in volts; Rabi and pi-pulse experiments treat it as the nominal pi amplitude.",
  }),
  drivePowerWatts: Object.freeze({
    unit: "W",
    minimum: 1e-12,
    maximum: 10,
    description: "Maximum simulated drive power in watts.",
  }),
  biasSpanVolts: Object.freeze({
    unit: "V",
    minimum: 1e-6,
    maximum: 100,
    description: "Full synthetic bias sweep span in volts.",
  }),
  maxDurationSeconds: Object.freeze({
    unit: "s",
    minimum: 1e-9,
    maximum: 10,
    description: "Maximum simulated evolution duration in seconds.",
  }),
  detuningHz: Object.freeze({
    unit: "Hz",
    minimum: -1e9,
    maximum: 1e9,
    description: "Frequency detuning in hertz.",
  }),
  decayTimeSeconds: Object.freeze({
    unit: "s",
    minimum: 1e-9,
    maximum: 10,
    description: "Synthetic energy-relaxation time in seconds.",
  }),
  dephasingTimeSeconds: Object.freeze({
    unit: "s",
    minimum: 1e-9,
    maximum: 10,
    description: "Synthetic dephasing time in seconds.",
  }),
  noiseFraction: Object.freeze({
    unit: "1",
    minimum: 0,
    maximum: 0.25,
    description: "Dimensionless synthetic Gaussian-noise scale.",
  }),
  fluxCenterWebers: Object.freeze({
    unit: "Wb",
    minimum: -1e-10,
    maximum: 1e-10,
    description: "Center magnetic flux in webers.",
  }),
  fluxSpanWebers: Object.freeze({
    unit: "Wb",
    minimum: 1e-18,
    maximum: 2e-10,
    description: "Full magnetic-flux span in webers.",
  }),
  readoutSeparationVolts: Object.freeze({
    unit: "V",
    minimum: 1e-6,
    maximum: 10,
    description: "Synthetic separation between IQ centroids in volts.",
  }),
  dragCoefficientSpan: Object.freeze({
    unit: "1",
    minimum: 1e-6,
    maximum: 10,
    description: "Full dimensionless DRAG coefficient scan span.",
  }),
  errorPerClifford: Object.freeze({
    unit: "1",
    minimum: 0,
    maximum: 0.25,
    description: "Synthetic error probability per Clifford gate.",
  }),
  maximumCliffordCount: Object.freeze({
    unit: "1",
    minimum: 8,
    maximum: 10000,
    integer: true,
    description: "Largest dimensionless Clifford sequence length.",
  }),
});

function axisSpec(id, label, unit) {
  return Object.freeze({ id, label, unit });
}

function seriesSpec(id, label, unit) {
  return Object.freeze({ id, label, unit });
}

export const EXPERIMENT_SPECS = Object.freeze([
  {
    id: "s21",
    title: "S21 resonator sweep",
    family: "readout",
    description: "Generate a synthetic complex resonator-transmission notch.",
    parameterDefaults: {
      centerFrequencyHz: 6e9,
      spanFrequencyHz: 100e6,
      noiseFraction: 0.002,
    },
    axes: [axisSpec("frequency", "Probe frequency", "Hz")],
    series: [
      seriesSpec("magnitude", "Transmission magnitude", "1"),
      seriesSpec("phase", "Transmission phase", "rad"),
    ],
  },
  {
    id: "rabi",
    title: "Rabi oscillation",
    family: "single-qubit-calibration",
    description: "Generate a synthetic Rabi oscillation over drive amplitude.",
    parameterDefaults: {
      driveAmplitudeVolts: 0.2,
      noiseFraction: 0.002,
    },
    axes: [axisSpec("drive_amplitude", "Drive amplitude", "V")],
    series: [seriesSpec("excited_probability", "Excited-state probability", "1")],
  },
  {
    id: "ramsey",
    title: "Ramsey interferometry",
    family: "coherence",
    description: "Generate a damped synthetic Ramsey fringe.",
    parameterDefaults: {
      maxDurationSeconds: 2e-5,
      detuningHz: 1e6,
      dephasingTimeSeconds: 1e-5,
      noiseFraction: 0.002,
    },
    axes: [axisSpec("delay", "Free-evolution delay", "s")],
    series: [seriesSpec("excited_probability", "Excited-state probability", "1")],
  },
  {
    id: "t1",
    title: "T1 relaxation",
    family: "coherence",
    description: "Generate a synthetic exponential energy-relaxation trace.",
    parameterDefaults: {
      maxDurationSeconds: 1e-4,
      decayTimeSeconds: 2.5e-5,
      noiseFraction: 0.002,
    },
    axes: [axisSpec("delay", "Relaxation delay", "s")],
    series: [seriesSpec("excited_probability", "Excited-state probability", "1")],
  },
  {
    id: "spectroscopy",
    title: "Qubit spectroscopy",
    family: "frequency-calibration",
    description: "Generate a synthetic one-dimensional qubit spectroscopy peak.",
    parameterDefaults: {
      centerFrequencyHz: 5e9,
      spanFrequencyHz: 500e6,
      noiseFraction: 0.002,
    },
    axes: [axisSpec("frequency", "Drive frequency", "Hz")],
    series: [seriesSpec("excited_probability", "Excited-state probability", "1")],
  },
  {
    id: "spectroscopy-2d",
    title: "Two-dimensional spectroscopy",
    family: "frequency-calibration",
    description: "Generate a synthetic bias-by-frequency spectroscopy map.",
    parameterDefaults: {
      centerFrequencyHz: 5e9,
      spanFrequencyHz: 500e6,
      biasSpanVolts: 0.2,
      driveAmplitudeVolts: 0.2,
      noiseFraction: 0.002,
    },
    axes: [
      axisSpec("bias", "Bias", "V"),
      axisSpec("frequency", "Drive frequency", "Hz"),
    ],
    series: [seriesSpec("excited_probability", "Excited-state probability", "1")],
  },
  {
    id: "s21-vs-flux",
    title: "S21 versus flux",
    family: "flux-calibration",
    description: "Generate a synthetic resonator-transmission map versus magnetic flux.",
    parameterDefaults: {
      centerFrequencyHz: 6e9,
      spanFrequencyHz: 200e6,
      fluxCenterWebers: 0,
      fluxSpanWebers: 4 * FLUX_QUANTUM_WEBERS,
      noiseFraction: 0.002,
    },
    axes: [
      axisSpec("flux", "Magnetic flux", "Wb"),
      axisSpec("frequency", "Probe frequency", "Hz"),
    ],
    series: [seriesSpec("magnitude", "Transmission magnitude", "1")],
  },
  {
    id: "single-shot",
    title: "Single-shot IQ readout",
    family: "readout",
    description: "Generate deterministic seeded synthetic IQ clouds for two states.",
    parameterDefaults: {
      readoutSeparationVolts: 0.4,
      noiseFraction: 0.03,
    },
    axes: [axisSpec("sample", "Sample index", "1")],
    series: [
      seriesSpec("ground_i", "Ground-state I", "V"),
      seriesSpec("ground_q", "Ground-state Q", "V"),
      seriesSpec("excited_i", "Excited-state I", "V"),
      seriesSpec("excited_q", "Excited-state Q", "V"),
    ],
  },
  {
    id: "drag",
    title: "DRAG coefficient sweep",
    family: "pulse-calibration",
    description: "Generate a synthetic leakage curve over a dimensionless DRAG coefficient.",
    parameterDefaults: {
      dragCoefficientSpan: 1,
      noiseFraction: 0.001,
    },
    axes: [axisSpec("drag_coefficient", "DRAG coefficient", "1")],
    series: [seriesSpec("leakage_probability", "Leakage probability", "1")],
  },
  {
    id: "pi-pulse-optimization",
    title: "Pi-pulse amplitude optimization",
    family: "pulse-calibration",
    description: "Generate a synthetic excitation curve around a nominal pi-pulse amplitude.",
    parameterDefaults: {
      driveAmplitudeVolts: 0.2,
      noiseFraction: 0.002,
    },
    axes: [axisSpec("pulse_amplitude", "Pulse amplitude", "V")],
    series: [seriesSpec("excited_probability", "Excited-state probability", "1")],
  },
  {
    id: "power-shift",
    title: "Drive-power frequency shift",
    family: "frequency-calibration",
    description: "Generate a synthetic power-dependent resonance-frequency shift.",
    parameterDefaults: {
      centerFrequencyHz: 5e9,
      spanFrequencyHz: 200e6,
      drivePowerWatts: 1e-3,
      noiseFraction: 0.002,
    },
    axes: [
      axisSpec("drive_power", "Drive power", "W"),
      axisSpec("frequency", "Drive frequency", "Hz"),
    ],
    series: [seriesSpec("magnitude", "Response magnitude", "1")],
  },
  {
    id: "delta",
    title: "Detuning correction sweep",
    family: "frequency-calibration",
    description: "Generate a synthetic error curve over frequency detuning.",
    parameterDefaults: {
      spanFrequencyHz: 20e6,
      detuningHz: 1e6,
      noiseFraction: 0.001,
    },
    axes: [axisSpec("detuning", "Applied detuning", "Hz")],
    series: [
      seriesSpec("excitation_error_n1", "Excitation error after 1 pulse", "1"),
      seriesSpec("excitation_error_n5", "Excitation error after 5 pulses", "1"),
      seriesSpec("excitation_error_n13", "Excitation error after 13 pulses", "1"),
    ],
  },
  {
    id: "randomized-benchmarking",
    title: "Randomized benchmarking",
    family: "benchmarking",
    description: "Generate a synthetic Clifford survival-decay curve.",
    parameterDefaults: {
      errorPerClifford: 0.005,
      maximumCliffordCount: 512,
      noiseFraction: 0.001,
    },
    axes: [axisSpec("clifford_count", "Clifford count", "1")],
    series: [seriesSpec("survival_probability", "Survival probability", "1")],
  },
].map((spec) => Object.freeze({
  ...spec,
  parameterDefaults: Object.freeze(spec.parameterDefaults),
  axes: Object.freeze(spec.axes),
  series: Object.freeze(spec.series),
})));

export const EXPERIMENT_BY_ID = new Map(
  EXPERIMENT_SPECS.map((spec) => [spec.id, spec]),
);

export const TWO_DIMENSIONAL_EXPERIMENTS = new Set([
  "spectroscopy-2d",
  "s21-vs-flux",
  "power-shift",
]);

export const UPSTREAM_TOOL_BY_ID = Object.freeze({
  s21: "s21",
  rabi: "rabi",
  ramsey: "ramsey",
  t1: "t1",
  spectroscopy: "spectrum",
  "spectroscopy-2d": "spectrum_2d",
  "s21-vs-flux": "s21vsflux",
  "single-shot": "singleshot",
  drag: "drag",
  "pi-pulse-optimization": "opt_pipulse",
  "power-shift": "powershift",
  delta: "delta",
  "randomized-benchmarking": "rb",
});

export const QMCLAW_EXPERIMENT_IDS = Object.freeze(
  EXPERIMENT_SPECS.map((spec) => spec.id),
);
