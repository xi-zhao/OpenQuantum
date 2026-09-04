import {
  MAX_POINTS,
  MAX_SECONDARY_POINTS,
  MAX_SEED,
  MAX_SHOTS,
  MIN_POINTS,
  MIN_SECONDARY_POINTS,
  MIN_SHOTS,
  PARAMETER_DEFINITIONS,
  QMCLAW_EXPERIMENT_IDS,
  QMCLAW_PROVIDER_ID,
  QMCLAW_UPSTREAM,
  QUBITS_PER_RUN,
  SCIENTIFIC_VALIDATION,
  SOURCE_KIND,
} from "./catalog.mjs";

const PARAMETER_SCHEMA_PROPERTIES = Object.freeze(
  Object.fromEntries(
    Object.entries(PARAMETER_DEFINITIONS).map(([name, definition]) => [
      name,
      {
        type: definition.integer ? "integer" : "number",
        minimum: definition.minimum,
        maximum: definition.maximum,
        description: `${definition.description} SI unit: ${definition.unit}.`,
      },
    ]),
  ),
);

export const EMPTY_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {},
  additionalProperties: false,
});

export const SIMULATE_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    experiment: { type: "string", enum: [...QMCLAW_EXPERIMENT_IDS] },
    qubits: {
      type: "array",
      minItems: QUBITS_PER_RUN,
      maxItems: QUBITS_PER_RUN,
      uniqueItems: true,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 32,
        pattern: "^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$",
      },
    },
    seed: { type: "integer", minimum: 0, maximum: MAX_SEED, default: 1 },
    points: {
      type: "integer",
      minimum: MIN_POINTS,
      maximum: MAX_POINTS,
      default: 64,
      description: "Number of points per simulated sweep axis.",
    },
    secondaryPoints: {
      type: "integer",
      minimum: MIN_SECONDARY_POINTS,
      maximum: MAX_SECONDARY_POINTS,
      default: 16,
      description: "Second-axis point count for two-dimensional simulations only.",
    },
    shots: {
      type: "integer",
      minimum: MIN_SHOTS,
      maximum: MAX_SHOTS,
      default: 512,
      description: "Bounded synthetic shot count; single-shot returns this many samples per state.",
    },
    parameters: {
      type: "object",
      properties: PARAMETER_SCHEMA_PROPERTIES,
      additionalProperties: false,
    },
  },
  required: ["experiment", "qubits"],
  additionalProperties: false,
});

const RESOLVED_PARAMETER_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.fromEntries(
    Object.keys(PARAMETER_DEFINITIONS).map((name) => [
      name,
      { type: PARAMETER_DEFINITIONS[name].integer ? "integer" : "number" },
    ]),
  ),
  additionalProperties: false,
});

export const INSPECT_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    providerId: { type: "string", const: QMCLAW_PROVIDER_ID },
    upstream: {
      type: "object",
      properties: {
        repository: { type: "string" },
        revision: { type: "string", const: QMCLAW_UPSTREAM.revision },
        license: { type: "string", const: QMCLAW_UPSTREAM.license },
      },
      required: ["repository", "revision", "license"],
      additionalProperties: false,
    },
    runtimeKind: { type: "string", const: "bounded_local_simulator" },
    hardwareExecutionEnabled: { type: "boolean", const: false },
    networkAccessRequired: { type: "boolean", const: false },
    credentialRefs: { type: "array", items: { type: "string" }, maxItems: 0 },
    excludedInterfaces: { type: "array", items: { type: "string" } },
    experimentCount: { type: "integer" },
    experimentIds: { type: "array", items: { type: "string" } },
    limits: {
      type: "object",
      properties: {
        qubitsPerRun: { type: "integer", const: QUBITS_PER_RUN },
        pointsMinimum: { type: "integer", const: MIN_POINTS },
        pointsMaximum: { type: "integer", const: MAX_POINTS },
        secondaryPointsMinimum: { type: "integer", const: MIN_SECONDARY_POINTS },
        secondaryPointsMaximum: { type: "integer", const: MAX_SECONDARY_POINTS },
        shotsMinimum: { type: "integer", const: MIN_SHOTS },
        shotsMaximum: { type: "integer", const: MAX_SHOTS },
        seedMinimum: { type: "integer", const: 0 },
        seedMaximum: { type: "integer", const: MAX_SEED },
      },
      required: [
        "qubitsPerRun",
        "pointsMinimum",
        "pointsMaximum",
        "secondaryPointsMinimum",
        "secondaryPointsMaximum",
        "shotsMinimum",
        "shotsMaximum",
        "seedMinimum",
        "seedMaximum",
      ],
      additionalProperties: false,
    },
  },
  required: [
    "providerId",
    "upstream",
    "runtimeKind",
    "hardwareExecutionEnabled",
    "networkAccessRequired",
    "credentialRefs",
    "excludedInterfaces",
    "experimentCount",
    "experimentIds",
    "limits",
  ],
  additionalProperties: false,
});

const CATALOG_AXIS_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    unit: { type: "string" },
  },
  required: ["id", "label", "unit"],
  additionalProperties: false,
});

const CATALOG_PARAMETER_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    name: { type: "string" },
    unit: { type: "string" },
    minimum: { type: "number" },
    maximum: { type: "number" },
    default: { type: "number" },
  },
  required: ["name", "unit", "minimum", "maximum", "default"],
  additionalProperties: false,
});

export const LIST_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    providerId: { type: "string", const: QMCLAW_PROVIDER_ID },
    sourceKind: { type: "string", const: "catalog" },
    hardwareExecutionEnabled: { type: "boolean", const: false },
    experiments: {
      type: "array",
      minItems: QMCLAW_EXPERIMENT_IDS.length,
      maxItems: QMCLAW_EXPERIMENT_IDS.length,
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: [...QMCLAW_EXPERIMENT_IDS] },
          upstreamTool: { type: "string" },
          title: { type: "string" },
          family: { type: "string" },
          description: { type: "string" },
          inputParameters: { type: "array", items: CATALOG_PARAMETER_SCHEMA },
          axes: { type: "array", items: CATALOG_AXIS_SCHEMA },
          series: { type: "array", items: CATALOG_AXIS_SCHEMA },
        },
        required: [
          "id",
          "upstreamTool",
          "title",
          "family",
          "description",
          "inputParameters",
          "axes",
          "series",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["providerId", "sourceKind", "hardwareExecutionEnabled", "experiments"],
  additionalProperties: false,
});

const AXIS_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    unit: { type: "string" },
    values: {
      type: "array",
      minItems: MIN_SECONDARY_POINTS,
      maxItems: MAX_SHOTS,
      items: { type: "number" },
    },
  },
  required: ["id", "label", "unit", "values"],
  additionalProperties: false,
});

const SERIES_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    unit: { type: "string" },
    shape: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: { type: "integer", minimum: 1, maximum: MAX_SHOTS },
    },
    values: {
      type: "array",
      minItems: MIN_POINTS,
      maxItems: MAX_POINTS * MAX_SECONDARY_POINTS,
      items: { type: "number" },
    },
  },
  required: ["id", "label", "unit", "shape", "values"],
  additionalProperties: false,
});

export const SIMULATE_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    schemaVersion: { type: "string", const: "1.0" },
    providerId: { type: "string", const: QMCLAW_PROVIDER_ID },
    upstreamRevision: { type: "string", const: QMCLAW_UPSTREAM.revision },
    experiment: { type: "string", enum: [...QMCLAW_EXPERIMENT_IDS] },
    upstreamTool: { type: "string" },
    seed: { type: "integer", minimum: 0, maximum: MAX_SEED },
    points: { type: "integer", minimum: MIN_POINTS, maximum: MAX_POINTS },
    shots: { type: "integer", minimum: MIN_SHOTS, maximum: MAX_SHOTS },
    secondaryPoints: {
      type: ["integer", "null"],
      minimum: MIN_SECONDARY_POINTS,
      maximum: MAX_SECONDARY_POINTS,
    },
    unitSystem: { type: "string", const: "SI" },
    sourceKind: { type: "string", const: SOURCE_KIND },
    scientificValidation: { type: "string", const: SCIENTIFIC_VALIDATION },
    hardwareExecutionEnabled: { type: "boolean", const: false },
    execution: {
      type: "object",
      properties: {
        mode: { type: "string", const: "local_simulation" },
        qubits: {
          type: "array",
          minItems: QUBITS_PER_RUN,
          maxItems: QUBITS_PER_RUN,
          uniqueItems: true,
          items: { type: "string" },
        },
        networkAccessed: { type: "boolean", const: false },
        hardwareAccessed: { type: "boolean", const: false },
        parameterMutation: { type: "boolean", const: false },
      },
      required: [
        "mode",
        "qubits",
        "networkAccessed",
        "hardwareAccessed",
        "parameterMutation",
      ],
      additionalProperties: false,
    },
    resolvedParameters: RESOLVED_PARAMETER_OUTPUT_SCHEMA,
    axes: { type: "array", minItems: 1, maxItems: 2, items: AXIS_OUTPUT_SCHEMA },
    series: { type: "array", minItems: 1, maxItems: 4, items: SERIES_OUTPUT_SCHEMA },
    summary: {
      type: "object",
      properties: {
        primaryMetric: { type: "string" },
        primaryValue: { type: "number" },
        primaryUnit: { type: "string" },
        note: { type: "string" },
      },
      required: ["primaryMetric", "primaryValue", "primaryUnit", "note"],
      additionalProperties: false,
    },
    limitations: { type: "array", minItems: 2, items: { type: "string" } },
  },
  required: [
    "schemaVersion",
    "providerId",
    "upstreamRevision",
    "experiment",
    "upstreamTool",
    "seed",
    "points",
    "shots",
    "secondaryPoints",
    "unitSystem",
    "sourceKind",
    "scientificValidation",
    "hardwareExecutionEnabled",
    "execution",
    "resolvedParameters",
    "axes",
    "series",
    "summary",
    "limitations",
  ],
  additionalProperties: false,
});
