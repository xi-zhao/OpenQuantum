#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";

import factsSchema from "../artifacts/qec-memory-result.schema.json" with { type: "json" };
import { replayExperiment, validateExperiment } from "../validators/validate-result.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const bridgePath = path.join(skillRoot, "mcp", "bridge.py");
const projectEnvironment = path.join(
  projectRoot,
  ".openquantum",
  "python-envs",
  "qec-memory-experiment",
);
const MAX_ERROR_RATE = 1;
const MAX_SEED = 2 ** 32 - 1;
const BRIDGE_ENVIRONMENT_NAMES = Object.freeze([
  "HOME",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "PATH",
  "REQUESTS_CA_BUNDLE",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "UV_CACHE_DIR",
  "UV_PYTHON_INSTALL_DIR",
  "WINDIR",
]);
const localExecutionAnnotations = Object.freeze({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});

const TOOLS = Object.freeze([
  {
    name: "run_qec_memory_experiment",
    title: "Run a rotated-surface-code memory experiment",
    description:
      "Generate a rotated surface-code X- or Z-memory circuit with pinned Stim, sample a fixed number of noisy shots with an explicit seed, decode with pinned PyMatching, and report logical-error counts with uncertainty. This is one bounded Monte Carlo experiment, not a threshold or hardware claim.",
    inputSchema: {
      type: "object",
      properties: {
        basis: { type: "string", enum: ["x", "z"] },
        distance: { type: "integer", minimum: 3 },
        rounds: { type: "integer", minimum: 1 },
        shots: { type: "integer", minimum: 1 },
        physicalErrorRate: {
          type: "number",
          minimum: 0,
          maximum: MAX_ERROR_RATE,
        },
        seed: { type: "integer", minimum: 0, maximum: MAX_SEED },
      },
      required: ["basis", "distance", "rounds", "shots", "physicalErrorRate", "seed"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        schemaVersion: { type: "string", const: "1.0" },
        packages: { type: "object" },
        experiment: { type: "object" },
        facts: { type: "object", properties: factsSchema.properties, required: factsSchema.required, additionalProperties: false },
        validation: { type: "object" },
        scientificValidation: { type: "string", const: "observations_available" },
        limitations: { type: "array", items: { type: "string" } },
      },
      required: [
        "schemaVersion",
        "packages",
        "experiment",
        "facts",
        "validation",
        "scientificValidation",
        "limitations",
      ],
      additionalProperties: false,
    },
    annotations: localExecutionAnnotations,
  },
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeExperimentRequest(value) {
  const allowed = new Set([
    "basis",
    "distance",
    "rounds",
    "shots",
    "physicalErrorRate",
    "seed",
  ]);
  if (!isRecord(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError("QEC memory experiment request is invalid");
  }
  if (!new Set(["x", "z"]).has(value.basis)) {
    throw new TypeError("basis must be x or z");
  }
  if (
    !Number.isSafeInteger(value.distance) ||
    value.distance < 3 ||
    value.distance % 2 === 0
  ) {
    throw new TypeError("distance must be an odd integer >= 3");
  }
  if (!Number.isSafeInteger(value.rounds) || value.rounds < 1) {
    throw new TypeError("rounds must be a positive integer");
  }
  if (!Number.isSafeInteger(value.shots) || value.shots < 1) {
    throw new TypeError("shots must be a positive integer");
  }
  if (
    typeof value.physicalErrorRate !== "number" ||
    !Number.isFinite(value.physicalErrorRate) ||
    value.physicalErrorRate < 0 ||
    value.physicalErrorRate > MAX_ERROR_RATE
  ) {
    throw new TypeError(`physicalErrorRate must be between 0 and ${MAX_ERROR_RATE}`);
  }
  if (!Number.isSafeInteger(value.seed) || value.seed < 0 || value.seed > MAX_SEED) {
    throw new TypeError(`seed must be an integer between 0 and ${MAX_SEED}`);
  }
  return {
    basis: value.basis,
    distance: value.distance,
    rounds: value.rounds,
    shots: value.shots,
    physicalErrorRate: Object.is(value.physicalErrorRate, -0) ? 0 : value.physicalErrorRate,
    seed: value.seed,
  };
}

function bridgeEnvironment() {
  return {
    ...Object.fromEntries(
      BRIDGE_ENVIRONMENT_NAMES.flatMap((name) =>
        process.env[name] ? [[name, process.env[name]]] : [],
      ),
    ),
    UV_PROJECT_ENVIRONMENT: projectEnvironment,
  };
}

async function runBridge(envelope, signal) {
  return runLocalJsonProcess({
    ...await preparedPythonLaunch({ skillRoot, args: [bridgePath] }),
    cwd: skillRoot,
    env: localComputeEnvironment(bridgeEnvironment()),
    input: envelope,
    signal,
    ...localComputeProcessOptions(),
    label: "Stim/PyMatching runtime",
  });
}

function textResult(text, structuredContent) {
  return { content: [{ type: "text", text }], structuredContent };
}

function errorResult(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `QEC memory experiment error: ${message}` }],
    isError: true,
  };
}

const server = new Server(
  { name: "openquantum-qec-memory-experiment", version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Bounded local rotated-surface-code memory experiments with pinned Stim and PyMatching. Report Monte Carlo counts and uncertainty; never infer a threshold, hardware performance or provenance-complete final acceptance.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));
server.setRequestHandler(CallToolRequestSchema, async (request, { signal }) => {
  try {
    if (request.params.name === "run_qec_memory_experiment") {
      const experiment = normalizeExperimentRequest(request.params.arguments);
      const facts = await runBridge({ action: "experiment", request: experiment }, signal);
      const reference = await replayExperiment(experiment, signal);
      const validation = validateExperiment({ request: experiment, facts, reference });
      const output = {
        schemaVersion: "1.0",
        packages: facts.packages,
        experiment,
        facts,
        validation,
        scientificValidation: "observations_available",
        limitations: [
          "The uniform circuit-level error rate is applied to Clifford depolarization, round data depolarization, measurement flips and reset flips.",
          "One finite-shot memory experiment cannot establish an error-correction threshold or compare hardware platforms.",
          "Exact seed replay is scoped to the same pinned packages, machine, Stim implementation and single-batch sampling convention.",
          "This L2 capability has no Acceptance Profile or central Acceptance Builder integration; scientific acceptance remains not_evaluated.",
        ],
      };
      return textResult(
        `L2 observations (failed checks: ${validation.observations.filter(item => item.status === "fail").length}). Stim ${facts.packages.stim} / PyMatching ${facts.packages.pymatching} decoded ${facts.result.shots} shots with ${facts.result.logicalErrors} logical error(s). This is a bounded Monte Carlo observation, not a threshold claim.`,
        output,
      );
    }
    return errorResult(new Error(`Unknown tool: ${request.params.name}`));
  } catch (error) {
    return errorResult(error);
  }
});

await server.connect(new StdioServerTransport());
