import { FLUX_QUANTUM_WEBERS } from "./catalog.mjs";

const TWO_PI = 2 * Math.PI;

function round(value) {
  return Number(value.toPrecision(12));
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function linspace(start, stop, count) {
  if (count === 1) {
    return [round(start)];
  }
  return Array.from({ length: count }, (_, index) =>
    round(start + ((stop - start) * index) / (count - 1)),
  );
}

function logspace(startExponent, stopExponent, count) {
  return linspace(startExponent, stopExponent, count).map((exponent) =>
    round(10 ** exponent),
  );
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random) {
  const first = Math.max(random(), Number.EPSILON);
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(TWO_PI * second);
}

function addNoise(value, random, standardDeviation, minimum = -Infinity, maximum = Infinity) {
  return round(clamp(value + gaussian(random) * standardDeviation, minimum, maximum));
}

function probability(value, random, standardDeviation, shots) {
  const bounded = clamp(value);
  const shotNoise = Math.sqrt((bounded * (1 - bounded)) / shots);
  return addNoise(
    bounded,
    random,
    Math.sqrt(standardDeviation ** 2 + shotNoise ** 2),
    0,
    1,
  );
}

function axis(spec, values) {
  return { ...spec, values };
}

function series(spec, shape, values) {
  return { ...spec, shape, values };
}

function indexOfMinimum(values) {
  return values.reduce(
    (best, value, index) => (value < values[best] ? index : best),
    0,
  );
}

function indexOfMaximum(values) {
  return values.reduce(
    (best, value, index) => (value > values[best] ? index : best),
    0,
  );
}

function summary(primaryMetric, primaryValue, primaryUnit, note) {
  return { primaryMetric, primaryValue: round(primaryValue), primaryUnit, note };
}

function simulateS21(context, random) {
  const { centerFrequencyHz: center, spanFrequencyHz: span, noiseFraction: noise } =
    context.parameters;
  const frequencies = linspace(center - span / 2, center + span / 2, context.points);
  const linewidth = span / 12;
  const magnitudes = frequencies.map((frequency) => {
    const normalized = (frequency - center) / linewidth;
    return addNoise(1 - 0.72 / (1 + normalized ** 2), random, noise, 0, 1.2);
  });
  const phases = frequencies.map((frequency) => {
    const normalized = (frequency - center) / linewidth;
    return addNoise(-Math.atan(2 * normalized), random, noise, -Math.PI, Math.PI);
  });
  return {
    axes: [axis(context.spec.axes[0], frequencies)],
    series: [
      series(context.spec.series[0], [context.points], magnitudes),
      series(context.spec.series[1], [context.points], phases),
    ],
    summary: summary(
      "notch_frequency",
      frequencies[indexOfMinimum(magnitudes)],
      "Hz",
      "Minimum of the generated transmission-magnitude trace.",
    ),
  };
}

function simulateRabi(context, random) {
  const { driveAmplitudeVolts: piAmplitude, noiseFraction: noise } =
    context.parameters;
  const amplitudes = linspace(0, 2 * piAmplitude, context.points);
  const values = amplitudes.map((amplitude) =>
    probability(
      0.02 + 0.94 * Math.sin((Math.PI * amplitude) / (2 * piAmplitude)) ** 2,
      random,
      noise,
      context.shots,
    ),
  );
  return {
    axes: [axis(context.spec.axes[0], amplitudes)],
    series: [series(context.spec.series[0], [context.points], values)],
    summary: summary(
      "sampled_pi_pulse_amplitude",
      amplitudes[indexOfMaximum(values)],
      "V",
      "Maximum sampled excitation; this is not a fitted calibration result.",
    ),
  };
}

function simulateRamsey(context, random) {
  const {
    maxDurationSeconds: maximum,
    detuningHz: detuning,
    dephasingTimeSeconds: dephasing,
    noiseFraction: noise,
  } = context.parameters;
  const delays = linspace(0, maximum, context.points);
  const values = delays.map((delay) =>
    probability(
      0.5 + 0.45 * Math.exp(-delay / dephasing) * Math.cos(TWO_PI * detuning * delay),
      random,
      noise,
      context.shots,
    ),
  );
  return {
    axes: [axis(context.spec.axes[0], delays)],
    series: [series(context.spec.series[0], [context.points], values)],
    summary: summary(
      "configured_dephasing_time",
      dephasing,
      "s",
      "Ground-truth parameter of the synthetic decay envelope; no fit was evaluated.",
    ),
  };
}

function simulateT1(context, random) {
  const {
    maxDurationSeconds: maximum,
    decayTimeSeconds: decay,
    noiseFraction: noise,
  } = context.parameters;
  const delays = linspace(0, maximum, context.points);
  const values = delays.map((delay) =>
    probability(0.02 + 0.96 * Math.exp(-delay / decay), random, noise, context.shots),
  );
  return {
    axes: [axis(context.spec.axes[0], delays)],
    series: [series(context.spec.series[0], [context.points], values)],
    summary: summary(
      "configured_decay_time",
      decay,
      "s",
      "Ground-truth parameter of the synthetic relaxation curve; no fit was evaluated.",
    ),
  };
}

function simulateSpectroscopy(context, random) {
  const { centerFrequencyHz: center, spanFrequencyHz: span, noiseFraction: noise } =
    context.parameters;
  const frequencies = linspace(center - span / 2, center + span / 2, context.points);
  const linewidth = span / 18;
  const values = frequencies.map((frequency) => {
    const normalized = (frequency - center) / linewidth;
    return probability(0.02 + 0.9 / (1 + normalized ** 2), random, noise, context.shots);
  });
  return {
    axes: [axis(context.spec.axes[0], frequencies)],
    series: [series(context.spec.series[0], [context.points], values)],
    summary: summary(
      "sampled_peak_frequency",
      frequencies[indexOfMaximum(values)],
      "Hz",
      "Maximum sampled response; this is not a fitted transition frequency.",
    ),
  };
}

function simulateSpectroscopy2d(context, random) {
  const {
    centerFrequencyHz: center,
    spanFrequencyHz: span,
    biasSpanVolts: biasSpan,
    driveAmplitudeVolts: maximumAmplitude,
    noiseFraction: noise,
  } = context.parameters;
  const biases = linspace(-biasSpan / 2, biasSpan / 2, context.secondaryPoints);
  const frequencies = linspace(center - span / 2, center + span / 2, context.points);
  const linewidth = span / 20;
  const values = [];
  for (const bias of biases) {
    const normalizedBias = bias / (biasSpan / 2);
    const shiftedCenter = center + 0.08 * span * normalizedBias;
    for (const frequency of frequencies) {
      const normalizedFrequency = (frequency - shiftedCenter) / linewidth;
      values.push(
        probability(
          0.02 +
            (0.88 * Math.min(1, maximumAmplitude / 0.2)) /
              (1 + normalizedFrequency ** 2),
          random,
          noise,
          context.shots,
        ),
      );
    }
  }
  return {
    axes: [axis(context.spec.axes[0], biases), axis(context.spec.axes[1], frequencies)],
    series: [
      series(
        context.spec.series[0],
        [context.secondaryPoints, context.points],
        values,
      ),
    ],
    summary: summary(
      "configured_zero_power_frequency",
      center,
      "Hz",
      "Synthetic zero-power center; generated maps are not experimentally validated.",
    ),
  };
}

function simulateS21VsFlux(context, random) {
  const {
    centerFrequencyHz: center,
    spanFrequencyHz: span,
    fluxCenterWebers: fluxCenter,
    fluxSpanWebers: fluxSpan,
    noiseFraction: noise,
  } = context.parameters;
  const fluxes = linspace(
    fluxCenter - fluxSpan / 2,
    fluxCenter + fluxSpan / 2,
    context.secondaryPoints,
  );
  const frequencies = linspace(center - span / 2, center + span / 2, context.points);
  const linewidth = span / 28;
  const values = [];
  for (const flux of fluxes) {
    const resonance = center + 0.22 * span * Math.cos(Math.PI * flux / FLUX_QUANTUM_WEBERS);
    for (const frequency of frequencies) {
      const normalized = (frequency - resonance) / linewidth;
      values.push(addNoise(1 - 0.7 / (1 + normalized ** 2), random, noise, 0, 1.2));
    }
  }
  return {
    axes: [axis(context.spec.axes[0], fluxes), axis(context.spec.axes[1], frequencies)],
    series: [
      series(
        context.spec.series[0],
        [context.secondaryPoints, context.points],
        values,
      ),
    ],
    summary: summary(
      "flux_quantum",
      FLUX_QUANTUM_WEBERS,
      "Wb",
      "Fixed physical constant used by the synthetic periodic response.",
    ),
  };
}

function simulateSingleShot(context, random) {
  const { readoutSeparationVolts: separation, noiseFraction: noise } =
    context.parameters;
  const noiseVolts = noise * separation;
  const samples = Array.from({ length: context.shots }, (_, index) => index);
  const groundI = [];
  const groundQ = [];
  const excitedI = [];
  const excitedQ = [];
  for (let index = 0; index < context.shots; index += 1) {
    groundI.push(addNoise(-separation / 2, random, noiseVolts));
    groundQ.push(addNoise(0, random, noiseVolts));
    excitedI.push(addNoise(separation / 2, random, noiseVolts));
    excitedQ.push(addNoise(0, random, noiseVolts));
  }
  return {
    axes: [axis(context.spec.axes[0], samples)],
    series: [
      series(context.spec.series[0], [context.shots], groundI),
      series(context.spec.series[1], [context.shots], groundQ),
      series(context.spec.series[2], [context.shots], excitedI),
      series(context.spec.series[3], [context.shots], excitedQ),
    ],
    summary: summary(
      "configured_iq_separation",
      separation,
      "V",
      "Configured centroid separation; no classifier fidelity was evaluated.",
    ),
  };
}

function simulateDrag(context, random) {
  const { dragCoefficientSpan: span, noiseFraction: noise } = context.parameters;
  const optimum = -0.18;
  const coefficients = linspace(-span / 2, span / 2, context.points);
  const values = coefficients.map((coefficient) => {
    const normalized = (coefficient - optimum) / (span / 3);
    return probability(0.002 + 0.08 * normalized ** 2, random, noise, context.shots);
  });
  return {
    axes: [axis(context.spec.axes[0], coefficients)],
    series: [series(context.spec.series[0], [context.points], values)],
    summary: summary(
      "sampled_minimum_leakage_coefficient",
      coefficients[indexOfMinimum(values)],
      "1",
      "Minimum sampled leakage; this is not an accepted pulse calibration.",
    ),
  };
}

function simulatePiPulseOptimization(context, random) {
  const { driveAmplitudeVolts: nominal, noiseFraction: noise } = context.parameters;
  const amplitudes = linspace(0.5 * nominal, 1.5 * nominal, context.points);
  const values = amplitudes.map((amplitude) =>
    probability(Math.sin((Math.PI * amplitude) / (2 * nominal)) ** 2, random, noise, context.shots),
  );
  return {
    axes: [axis(context.spec.axes[0], amplitudes)],
    series: [series(context.spec.series[0], [context.points], values)],
    summary: summary(
      "sampled_pi_pulse_amplitude",
      amplitudes[indexOfMaximum(values)],
      "V",
      "Maximum sampled excitation; no hardware parameter was changed.",
    ),
  };
}

function simulatePowerShift(context, random) {
  const {
    centerFrequencyHz: center,
    spanFrequencyHz: span,
    drivePowerWatts: maximumPower,
    noiseFraction: noise,
  } = context.parameters;
  const powers = logspace(
    Math.log10(maximumPower) - 4,
    Math.log10(maximumPower),
    context.secondaryPoints,
  );
  const frequencies = linspace(center - span / 2, center + span / 2, context.points);
  const linewidth = span / 24;
  const values = [];
  for (const power of powers) {
    const normalized = power / maximumPower;
    const shiftedCenter = center + 0.12 * span * normalized ** 2;
    for (const frequency of frequencies) {
      const normalizedFrequency = (frequency - shiftedCenter) / linewidth;
      values.push(
        addNoise(1 - 0.68 / (1 + normalizedFrequency ** 2), random, noise, 0, 1.2),
      );
    }
  }
  return {
    axes: [axis(context.spec.axes[0], powers), axis(context.spec.axes[1], frequencies)],
    series: [
      series(
        context.spec.series[0],
        [context.secondaryPoints, context.points],
        values,
      ),
    ],
    summary: summary(
      "configured_maximum_shift",
      0.12 * span,
      "Hz",
      "Maximum synthetic resonance shift; no two-dimensional fit was evaluated.",
    ),
  };
}

function simulateDelta(context, random) {
  const { spanFrequencyHz: span, detuningHz: optimum, noiseFraction: noise } =
    context.parameters;
  const detunings = linspace(-span / 2, span / 2, context.points);
  const width = span / 8;
  const repeatCounts = [1, 5, 13];
  const valuesByRepeat = repeatCounts.map((repeatCount) =>
    detunings.map((detuning) => {
      const normalized = (detuning - optimum) / width;
      return probability(
        0.005 + 0.12 * (repeatCount / 13) * normalized ** 2,
        random,
        noise,
        context.shots,
      );
    }),
  );
  const mostSensitiveValues = valuesByRepeat.at(-1);
  return {
    axes: [axis(context.spec.axes[0], detunings)],
    series: valuesByRepeat.map((values, index) =>
      series(context.spec.series[index], [context.points], values),
    ),
    summary: summary(
      "sampled_minimum_error_detuning",
      detunings[indexOfMinimum(mostSensitiveValues)],
      "Hz",
      "Minimum of the 13-pulse synthetic error curve; no frequency setting was changed.",
    ),
  };
}

function simulateRandomizedBenchmarking(context, random) {
  const {
    errorPerClifford: error,
    maximumCliffordCount: maximum,
    noiseFraction: noise,
  } = context.parameters;
  const counts = linspace(1, maximum, context.points).map((value) => Math.round(value));
  const values = counts.map((count) =>
    probability(0.5 + 0.48 * (1 - error) ** count, random, noise, context.shots),
  );
  return {
    axes: [axis(context.spec.axes[0], counts)],
    series: [series(context.spec.series[0], [context.points], values)],
    summary: summary(
      "configured_error_per_clifford",
      error,
      "1",
      "Ground-truth input to the synthetic decay; no benchmarking fit was evaluated.",
    ),
  };
}

const SIMULATORS = Object.freeze({
  s21: simulateS21,
  rabi: simulateRabi,
  ramsey: simulateRamsey,
  t1: simulateT1,
  spectroscopy: simulateSpectroscopy,
  "spectroscopy-2d": simulateSpectroscopy2d,
  "s21-vs-flux": simulateS21VsFlux,
  "single-shot": simulateSingleShot,
  drag: simulateDrag,
  "pi-pulse-optimization": simulatePiPulseOptimization,
  "power-shift": simulatePowerShift,
  delta: simulateDelta,
  "randomized-benchmarking": simulateRandomizedBenchmarking,
});

export function simulateExperiment(context) {
  return SIMULATORS[context.spec.id](context, seededRandom(context.seed));
}
