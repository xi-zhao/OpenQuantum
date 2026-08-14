import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const contractRoot = path.resolve(skillRoot, "../../skill-contracts");

const FACT_SCHEMAS = Object.freeze({
  problemSpec: "artifacts/problem-spec.schema.json",
  hamiltonianManifest: "artifacts/hamiltonian-manifest.schema.json",
  exactReference: "artifacts/exact-reference.schema.json",
  groundStateResult: "artifacts/ground-state-result.schema.json",
  convergenceTrace: "artifacts/convergence-trace.schema.json",
  resourceEstimate: "artifacts/resource-estimate.schema.json",
});

function strictObject(properties, required = Object.keys(properties)) {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function stringConstant(value) {
  return { type: "string", const: value };
}

function integerConstant(value) {
  return { type: "integer", const: value };
}

const versionedReferenceSchema = strictObject({
  id: { type: "string" },
  version: { type: "string" },
});

const versionedDigestSchema = strictObject({
  id: { type: "string" },
  version: { type: "string" },
  digest: { type: "string" },
});

const fileReferenceSchema = strictObject({
  id: { type: "string" },
  type: { type: "string" },
  path: { type: "string" },
  mediaType: { type: "string" },
  bytes: { type: "integer" },
  sha256: { type: "string" },
});

const requestSchema = strictObject({
  schemaVersion: stringConstant("1.0"),
  requestId: {
    type: "string",
    description: "Stable request id; the server enforces the capability id format.",
  },
  claim: stringConstant("sector-ground-energy-of-supplied-hamiltonian"),
  system: strictObject({
    kind: stringConstant("qubit-model"),
    label: { type: "string" },
    source: strictObject({ kind: stringConstant("supplied-pauli-sum") }),
  }),
  hamiltonian: strictObject({
    format: stringConstant("openquantum-pauli-sum-v1"),
    qubitCount: integerConstant(2),
    qubitOrder: stringConstant("left-to-right-msb"),
    basisOrder: stringConstant("00-01-10-11"),
    coefficientUnit: stringConstant("hartree"),
    sector: strictObject({
      kind: stringConstant("fixed-hamming-weight"),
      value: integerConstant(1),
    }),
    terms: {
      type: "array",
      description:
        "One to 32 unique two-character Pauli terms over I/X/Z; coefficients must be finite and within +/-1e6 Hartree.",
      items: strictObject({
        pauli: { type: "string" },
        coefficient: { type: "number" },
      }),
    },
  }),
  method: strictObject({
    algorithm: stringConstant("vqe"),
    simulator: stringConstant("statevector"),
    ansatz: strictObject({
      id: stringConstant("two-qubit-single-excitation-givens"),
      version: stringConstant("1.0.0"),
    }),
    optimizer: strictObject({
      id: stringConstant("coarse-grid-golden-refine"),
      version: stringConstant("1.0.0"),
      coarsePoints: integerConstant(65),
      angleToleranceRadians: {
        type: "number",
        description: "Finite angle tolerance in [1e-14, 0.01].",
      },
      maxEvaluations: {
        type: "integer",
        description: "Evaluation budget from 8 through 256, inclusive.",
      },
    }),
    randomness: stringConstant("none"),
  }),
  acceptanceProfile: strictObject({
    id: stringConstant("supplied-pauli-statevector"),
    version: stringConstant("1.0.0"),
  }),
});

const resultPackageSchema = strictObject(
  {
    kind: stringConstant("openquantum-result-package-v1.1"),
    value: strictObject(
      {
        schemaVersion: stringConstant("1.1"),
        packageId: { type: "string" },
        capability: versionedReferenceSchema,
        createdAt: { type: "string" },
        executionRef: strictObject(
          {
            sessionId: { type: "string" },
            goalId: { type: "string" },
            jobIds: { type: "array", items: { type: "string" } },
            eventRange: strictObject({
              from: { type: "integer" },
              to: { type: "integer" },
            }),
          },
          ["sessionId", "eventRange"],
        ),
        acceptanceProfile: strictObject({
          id: { type: "string" },
          version: { type: "string" },
          sha256: { type: "string" },
        }),
        inputs: { type: "array", items: fileReferenceSchema },
        artifacts: { type: "array", items: fileReferenceSchema },
        provenance: strictObject(
          {
            tools: { type: "array", items: versionedDigestSchema },
            environment: { type: "array", items: versionedDigestSchema },
            dependencies: {
              type: "array",
              items: strictObject({
                id: { type: "string" },
                kind: {
                  type: "string",
                  enum: ["tool", "mcp", "scientific-backend"],
                },
                version: { type: "string" },
                digest: { type: "string" },
              }),
            },
            models: {
              type: "array",
              items: strictObject({
                provider: { type: "string" },
                model: { type: "string" },
              }),
            },
            randomSeeds: {
              type: "array",
              items: strictObject({
                name: { type: "string" },
                value: {
                  oneOf: [{ type: "integer" }, { type: "string" }],
                },
              }),
            },
          },
          ["tools", "environment", "dependencies"],
        ),
      },
      [
        "schemaVersion",
        "packageId",
        "capability",
        "createdAt",
        "executionRef",
        "acceptanceProfile",
        "inputs",
        "artifacts",
        "provenance",
      ],
    ),
  },
);

const profileSchema = strictObject({
  schemaVersion: stringConstant("1.0"),
  id: stringConstant("supplied-pauli-statevector"),
  version: stringConstant("1.0.0"),
  scope: strictObject({
    supportedClaims: { type: "array", items: { type: "string" } },
    outOfScope: { type: "array", items: { type: "string" } },
  }),
  checks: {
    type: "array",
    items: strictObject(
      {
        id: { type: "string" },
        category: { type: "string" },
        required: { type: "boolean" },
        criterion: { type: "string" },
        threshold: {},
        unit: { type: "string" },
      },
      ["id", "category", "required", "criterion"],
    ),
  },
});

const factsSchema = strictObject(
  Object.fromEntries(Object.keys(FACT_SCHEMAS).map((key) => [key, { type: "object" }])),
);

export const SOLVE_INPUT_SCHEMA = strictObject({ request: requestSchema });

export const SOLVE_AND_VALIDATE_INPUT_SCHEMA = SOLVE_INPUT_SCHEMA;

export const VALIDATE_INPUT_SCHEMA = strictObject({
  bundle: strictObject({
    schemaVersion: stringConstant("1.0"),
    resultPackage: resultPackageSchema,
    profile: profileSchema,
    request: requestSchema,
    facts: factsSchema,
  }),
});

export const SOLVE_OUTPUT_SCHEMA = strictObject(
  Object.fromEntries(Object.keys(FACT_SCHEMAS).map((key) => [key, { type: "object" }])),
);

export const VALIDATE_OUTPUT_SCHEMA = strictObject({
  scopeMatch: { type: "object" },
  observations: { type: "array", items: { type: "object" } },
  limitations: { type: "array", items: { type: "string" } },
  statement: { type: "string" },
});

export const SOLVE_AND_VALIDATE_OUTPUT_SCHEMA = strictObject({
  facts: SOLVE_OUTPUT_SCHEMA,
  validation: VALIDATE_OUTPUT_SCHEMA,
});

function readJson(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function isDateTime(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function compileSchema(absolutePath) {
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
  ajv.addFormat("date-time", { type: "string", validate: isDateTime });
  return ajv.compile(readJson(absolutePath));
}

const validators = Object.freeze({
  request: compileSchema(path.join(skillRoot, "inputs/request.schema.json")),
  bundle: compileSchema(
    path.join(skillRoot, "validators/result-validation-bundle.schema.json"),
  ),
  resultPackage: compileSchema(
    path.join(contractRoot, "schemas/v1.1/result-package.schema.json"),
  ),
  profile: compileSchema(
    path.join(contractRoot, "schemas/v1.1/acceptance-profile.schema.json"),
  ),
  facts: Object.fromEntries(
    Object.entries(FACT_SCHEMAS).map(([key, relativePath]) => [
      key,
      compileSchema(path.join(skillRoot, relativePath)),
    ]),
  ),
});

const trustedProfile = readJson(
  path.join(skillRoot, "acceptance-profiles/supplied-pauli-statevector-v1.json"),
);

function validationMessage(label, validate) {
  const details = (validate.errors ?? [])
    .slice(0, 8)
    .map((error) => {
      const location = error.instancePath || "/";
      const extra = error.params?.additionalProperty
        ? ` (${String(error.params.additionalProperty)})`
        : "";
      return `${location} ${error.message ?? "violates schema"}${extra}`;
    })
    .join("; ");
  return `${label} violates its strict schema${details ? `: ${details}` : ""}`;
}

function assertValid(label, validate, value) {
  if (!validate(value)) {
    throw new Error(validationMessage(label, validate));
  }
}

function assertExactArguments(value, keys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} arguments must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(`${label} arguments must contain exactly: ${expected.join(", ")}`);
  }
}

function requireRequest(argumentsValue, toolName) {
  assertExactArguments(argumentsValue, ["request"], toolName);
  assertValid("request", validators.request, argumentsValue.request);
  return argumentsValue.request;
}

export function requireSolveRequest(argumentsValue) {
  return requireRequest(argumentsValue, "solve_ground_state");
}

export function requireSolveAndValidateRequest(argumentsValue) {
  return requireRequest(argumentsValue, "solve_and_validate_ground_state");
}

export function trustedAcceptanceProfile() {
  return structuredClone(trustedProfile);
}

export function validateFacts(facts) {
  for (const [key, validate] of Object.entries(validators.facts)) {
    assertValid(`facts.${key}`, validate, facts?.[key]);
  }
  const actual = facts && typeof facts === "object" ? Object.keys(facts).sort() : [];
  const expected = Object.keys(FACT_SCHEMAS).sort();
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(`facts must contain exactly: ${expected.join(", ")}`);
  }
  return facts;
}

export function requireValidationBundle(argumentsValue) {
  assertExactArguments(argumentsValue, ["bundle"], "validate_ground_state");
  const { bundle } = argumentsValue;
  assertValid("validation bundle", validators.bundle, bundle);
  assertValid("result package", validators.resultPackage, bundle.resultPackage.value);
  assertValid("acceptance profile", validators.profile, bundle.profile);
  if (!isDeepStrictEqual(bundle.profile, trustedProfile)) {
    throw new Error(
      "acceptance profile must exactly match supplied-pauli-statevector version 1.0.0",
    );
  }
  assertValid("request", validators.request, bundle.request);
  validateFacts(bundle.facts);
  return bundle;
}
