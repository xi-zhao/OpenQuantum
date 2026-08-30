import {
  EXPERIMENT_BY_ID,
  EXPERIMENT_SPECS,
  MAX_POINTS,
  MAX_SECONDARY_POINTS,
  MAX_SEED,
  MAX_SHOTS,
  MIN_POINTS,
  MIN_SECONDARY_POINTS,
  MIN_SHOTS,
  PARAMETER_DEFINITIONS,
  QMCLAW_EXPERIMENT_IDS,
  QMCLAW_SERVER_NAME,
  QMCLAW_UPSTREAM,
  QUBIT_PATTERN,
  QUBITS_PER_RUN,
  SCIENTIFIC_VALIDATION,
  SOURCE_KIND,
  TWO_DIMENSIONAL_EXPERIMENTS,
  UPSTREAM_TOOL_BY_ID,
} from "./catalog.mjs";
import {
  EMPTY_INPUT_SCHEMA,
  INSPECT_OUTPUT_SCHEMA,
  LIST_OUTPUT_SCHEMA,
  SIMULATE_INPUT_SCHEMA,
  SIMULATE_OUTPUT_SCHEMA,
} from "./schemas.mjs";
import { simulateExperiment } from "./simulators.mjs";

export {
  EMPTY_INPUT_SCHEMA,
  INSPECT_OUTPUT_SCHEMA,
  LIST_OUTPUT_SCHEMA,
  QMCLAW_EXPERIMENT_IDS,
  QMCLAW_SERVER_NAME,
  QMCLAW_UPSTREAM,
  SIMULATE_INPUT_SCHEMA,
  SIMULATE_OUTPUT_SCHEMA,
};

function requireRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function rejectUnknownProperties(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new TypeError(`${label} contains unsupported properties: ${unknown.join(", ")}`);
  }
}

function boundedInteger(value, fallback, minimum, maximum, label) {
  const resolved = value === undefined ? fallback : value;
  if (!Number.isInteger(resolved) || resolved < minimum || resolved > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
  return resolved;
}

function resolvedParameters(spec, parametersValue) {
  const parameters = requireRecord(
    parametersValue === undefined ? {} : parametersValue,
    "parameters",
  );
  const allowedNames = new Set(Object.keys(spec.parameterDefaults));
  rejectUnknownProperties(parameters, allowedNames, `parameters for ${spec.id}`);
  const result = {};
  for (const [name, defaultValue] of Object.entries(spec.parameterDefaults)) {
    const value = parameters[name] === undefined ? defaultValue : parameters[name];
    const definition = PARAMETER_DEFINITIONS[name];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      (definition.integer && !Number.isInteger(value)) ||
      value < definition.minimum ||
      value > definition.maximum
    ) {
      const kind = definition.integer ? "an integer" : "a finite number";
      throw new RangeError(
        `${name} must be ${kind} from ${definition.minimum} to ${definition.maximum} ${definition.unit}`,
      );
    }
    result[name] = value;
  }
  if (
    "centerFrequencyHz" in result &&
    "spanFrequencyHz" in result &&
    result.centerFrequencyHz - result.spanFrequencyHz / 2 <= 0
  ) {
    throw new RangeError("frequency sweep must remain strictly above 0 Hz");
  }
  return result;
}

function requireSimulationRequest(value) {
  const request = requireRecord(value, "arguments");
  rejectUnknownProperties(
    request,
    new Set([
      "experiment",
      "qubits",
      "seed",
      "points",
      "secondaryPoints",
      "shots",
      "parameters",
    ]),
    "arguments",
  );
  const spec = EXPERIMENT_BY_ID.get(request.experiment);
  if (!spec) {
    throw new TypeError(`experiment must be one of: ${QMCLAW_EXPERIMENT_IDS.join(", ")}`);
  }
  if (!Array.isArray(request.qubits) || request.qubits.length !== QUBITS_PER_RUN) {
    throw new RangeError("qubits must contain exactly one identifier");
  }
  const qubits = request.qubits.map((qubit) => {
    if (typeof qubit !== "string" || !QUBIT_PATTERN.test(qubit)) {
      throw new TypeError(
        "each qubit must be a 1-32 character identifier using letters, digits, underscore, or hyphen",
      );
    }
    return qubit;
  });
  if (new Set(qubits).size !== qubits.length) {
    throw new TypeError("qubits must not contain duplicates");
  }
  const points = boundedInteger(request.points, 64, MIN_POINTS, MAX_POINTS, "points");
  const shots = boundedInteger(request.shots, 512, MIN_SHOTS, MAX_SHOTS, "shots");
  const seed = boundedInteger(request.seed, 1, 0, MAX_SEED, "seed");
  let secondaryPoints = null;
  if (TWO_DIMENSIONAL_EXPERIMENTS.has(spec.id)) {
    secondaryPoints = boundedInteger(
      request.secondaryPoints,
      16,
      MIN_SECONDARY_POINTS,
      MAX_SECONDARY_POINTS,
      "secondaryPoints",
    );
  } else if (request.secondaryPoints !== undefined) {
    throw new TypeError(`secondaryPoints is not supported for ${spec.id}`);
  }
  const parameters = resolvedParameters(spec, request.parameters);
  if (
    spec.id === "randomized-benchmarking" &&
    parameters.maximumCliffordCount < points
  ) {
    throw new RangeError("maximumCliffordCount must be greater than or equal to points");
  }
  return { spec, qubits, seed, points, secondaryPoints, shots, parameters };
}

export function inspectQmclawRuntime() {
  return {
    serverName: QMCLAW_SERVER_NAME,
    upstream: { ...QMCLAW_UPSTREAM },
    runtimeKind: "bounded_local_simulator",
    hardwareExecutionEnabled: false,
    networkAccessRequired: false,
    credentialRefs: [],
    excludedInterfaces: ["hardware_control", "parameter_mutation", "arbitrary_code"],
    experimentCount: QMCLAW_EXPERIMENT_IDS.length,
    experimentIds: [...QMCLAW_EXPERIMENT_IDS],
    limits: {
      qubitsPerRun: QUBITS_PER_RUN,
      pointsMinimum: MIN_POINTS,
      pointsMaximum: MAX_POINTS,
      secondaryPointsMinimum: MIN_SECONDARY_POINTS,
      secondaryPointsMaximum: MAX_SECONDARY_POINTS,
      shotsMinimum: MIN_SHOTS,
      shotsMaximum: MAX_SHOTS,
      seedMinimum: 0,
      seedMaximum: MAX_SEED,
    },
  };
}

export function listQmclawExperiments() {
  return {
    serverName: QMCLAW_SERVER_NAME,
    sourceKind: "catalog",
    hardwareExecutionEnabled: false,
    experiments: EXPERIMENT_SPECS.map((spec) => ({
      id: spec.id,
      upstreamTool: UPSTREAM_TOOL_BY_ID[spec.id],
      title: spec.title,
      family: spec.family,
      description: spec.description,
      inputParameters: Object.entries(spec.parameterDefaults).map(([name, defaultValue]) => ({
        name,
        unit: PARAMETER_DEFINITIONS[name].unit,
        minimum: PARAMETER_DEFINITIONS[name].minimum,
        maximum: PARAMETER_DEFINITIONS[name].maximum,
        default: defaultValue,
      })),
      axes: spec.axes.map((value) => ({ ...value })),
      series: spec.series.map((value) => ({ ...value })),
    })),
  };
}

export function simulateQmclawExperiment(argumentsValue) {
  const context = requireSimulationRequest(argumentsValue);
  const simulation = simulateExperiment(context);
  return {
    schemaVersion: "1.0",
    serverName: QMCLAW_SERVER_NAME,
    upstreamRevision: QMCLAW_UPSTREAM.revision,
    experiment: context.spec.id,
    upstreamTool: UPSTREAM_TOOL_BY_ID[context.spec.id],
    seed: context.seed,
    points: context.points,
    shots: context.shots,
    secondaryPoints: context.secondaryPoints,
    unitSystem: "SI",
    sourceKind: SOURCE_KIND,
    scientificValidation: SCIENTIFIC_VALIDATION,
    hardwareExecutionEnabled: false,
    execution: {
      mode: "local_simulation",
      qubits: [...context.qubits],
      networkAccessed: false,
      hardwareAccessed: false,
      parameterMutation: false,
    },
    resolvedParameters: context.parameters,
    axes: simulation.axes,
    series: simulation.series,
    summary: simulation.summary,
    limitations: [
      "Synthetic deterministic data are not measurements from a quantum device.",
      "Runtime completion is not scientific validation or Acceptance.",
    ],
  };
}
