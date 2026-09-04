#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const bridgePath = path.join(skillRoot, "mcp", "bridge.py");
const projectEnvironment = path.join(
  projectRoot,
  ".openquantum",
  "python-envs",
  "qec-memory-experiment",
);
const MAX_DISTANCE = 7;
const MAX_ROUNDS = 20;
const MAX_SHOTS = 50_000;
const MAX_ERROR_RATE = 0.05;
const MAX_SEED = 2 ** 32 - 1;
const BRIDGE_TIMEOUT_MS = 60_000;
const MAX_BRIDGE_OUTPUT_BYTES = 2 * 1024 * 1024;
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
const lazyEnvironmentAnnotations = Object.freeze({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});

const TOOLS = Object.freeze([
  {
    name: "inspect_qec_runtime",
    title: "Inspect pinned Stim and PyMatching runtime",
    description:
      "Import pinned Stim and PyMatching and report the bounded rotated-surface-code memory experiment profiles. The first call may build the Python environment through uv; no cloud or hardware execution is available.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: {
      type: "object",
      properties: {
        schemaVersion: { type: "string", const: "1.0" },
        packages: { type: "object" },
        pythonVersion: { type: "string" },
        profiles: { type: "array", items: { type: "string" } },
        limits: { type: "object" },
        cloudExecutionEnabled: { type: "boolean", const: false },
      },
      required: [
        "schemaVersion",
        "packages",
        "pythonVersion",
        "profiles",
        "limits",
        "cloudExecutionEnabled",
      ],
      additionalProperties: false,
    },
    annotations: lazyEnvironmentAnnotations,
  },
  {
    name: "run_qec_memory_experiment",
    title: "Run a bounded rotated-surface-code memory experiment",
    description:
      "Generate a rotated surface-code X- or Z-memory circuit with pinned Stim, sample a fixed number of noisy shots with an explicit seed, decode with pinned PyMatching, and report logical-error counts with uncertainty. This is one bounded Monte Carlo experiment, not a threshold or hardware claim.",
    inputSchema: {
      type: "object",
      properties: {
        basis: { type: "string", enum: ["x", "z"] },
        distance: { type: "integer", minimum: 3, maximum: MAX_DISTANCE },
        rounds: { type: "integer", minimum: 1, maximum: MAX_ROUNDS },
        shots: { type: "integer", minimum: 100, maximum: MAX_SHOTS },
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
        facts: { type: "object" },
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
    annotations: lazyEnvironmentAnnotations,
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
    !Number.isInteger(value.distance) ||
    value.distance < 3 ||
    value.distance > MAX_DISTANCE ||
    value.distance % 2 === 0
  ) {
    throw new TypeError(`distance must be an odd integer between 3 and ${MAX_DISTANCE}`);
  }
  if (!Number.isInteger(value.rounds) || value.rounds < 1 || value.rounds > MAX_ROUNDS) {
    throw new TypeError(`rounds must be an integer between 1 and ${MAX_ROUNDS}`);
  }
  if (!Number.isInteger(value.shots) || value.shots < 100 || value.shots > MAX_SHOTS) {
    throw new TypeError(`shots must be an integer between 100 and ${MAX_SHOTS}`);
  }
  if (
    typeof value.physicalErrorRate !== "number" ||
    !Number.isFinite(value.physicalErrorRate) ||
    value.physicalErrorRate < 0 ||
    value.physicalErrorRate > MAX_ERROR_RATE
  ) {
    throw new TypeError(`physicalErrorRate must be between 0 and ${MAX_ERROR_RATE}`);
  }
  if (!Number.isInteger(value.seed) || value.seed < 0 || value.seed > MAX_SEED) {
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

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function experimentDigest(request) {
  return createHash("sha256").update(canonicalJson(request)).digest("hex");
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

function redactBridgeError(value, environment) {
  let redacted = String(value);
  for (const secret of Object.values(environment)) {
    if (typeof secret === "string" && secret.length >= 4) {
      redacted = redacted.split(secret).join("[REDACTED]");
    }
  }
  return redacted;
}

function runBridge(envelope) {
  const environment = bridgeEnvironment();
  return new Promise((resolve, reject) => {
    const child = spawn(
      "uv",
      ["run", "--quiet", "--project", skillRoot, "--python", "3.12", "python", bridgePath],
      { cwd: skillRoot, env: environment, stdio: ["pipe", "pipe", "pipe"] },
    );
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("Stim/PyMatching runtime timed out")));
    }, BRIDGE_TIMEOUT_MS);
    child.on("error", (error) => {
      finish(() => {
        reject(
          error.code === "ENOENT"
            ? new Error("未找到 uv；请先安装 uv 后再使用 QEC 本地实验")
            : error,
        );
      });
    });
    child.stdin.on("error", (error) => finish(() => reject(error)));
    for (const [stream, chunks] of [[child.stdout, stdout], [child.stderr, stderr]]) {
      stream.on("data", (chunk) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_BRIDGE_OUTPUT_BYTES) {
          child.kill("SIGKILL");
          finish(() => reject(new Error("Stim/PyMatching runtime returned too much data")));
          return;
        }
        chunks.push(chunk);
      });
    }
    child.on("close", (code) => {
      finish(() => {
        const stdoutText = Buffer.concat(stdout).toString("utf8").trim();
        const stderrText = Buffer.concat(stderr).toString("utf8").trim();
        if (code !== 0) {
          reject(
            new Error(
              stderrText
                ? redactBridgeError(stderrText.slice(0, 2000), environment)
                : `Stim/PyMatching runtime exited with code ${code}`,
            ),
          );
          return;
        }
        try {
          resolve(JSON.parse(stdoutText));
        } catch {
          reject(new Error("Stim/PyMatching runtime returned invalid JSON"));
        }
      });
    });
    child.stdin.end(JSON.stringify(envelope));
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

function validateFacts(request, facts) {
  const result = facts?.result ?? {};
  const countsMatch =
    result.shots === request.shots &&
    Number.isInteger(result.logicalErrors) &&
    result.logicalErrors >= 0 &&
    result.logicalErrors <= request.shots &&
    result.successfulShots === request.shots - result.logicalErrors;
  const replayedRate = result.logicalErrors / request.shots;
  const rateError =
    Number.isFinite(result.logicalErrorRate)
      ? Math.abs(result.logicalErrorRate - replayedRate)
      : Number.POSITIVE_INFINITY;
  const interval = result.wilson95 ?? {};
  const intervalValid =
    Number.isFinite(interval.low) &&
    Number.isFinite(interval.high) &&
    interval.low >= 0 &&
    interval.high <= 1 &&
    interval.low <= replayedRate &&
    replayedRate <= interval.high;
  const digestMatches = facts?.experimentDigest === experimentDigest(request);
  const seedMatches = facts?.experiment?.seed === request.seed;
  return {
    schemaVersion: "1.0",
    observations: [
      { id: "experiment.digest", status: digestMatches ? "pass" : "fail" },
      { id: "experiment.seed-recorded", status: seedMatches ? "pass" : "fail" },
      { id: "counts.replayed", status: countsMatch ? "pass" : "fail" },
      {
        id: "logical-error-rate.replayed",
        status: rateError <= 1e-15 ? "pass" : "fail",
        metric: rateError,
        threshold: 1e-15,
      },
      { id: "uncertainty.bounded", status: intervalValid ? "pass" : "fail" },
      {
        id: "zero-noise.invariant",
        status:
          request.physicalErrorRate === 0
            ? result.logicalErrors === 0
              ? "pass"
              : "fail"
            : "not_checked",
      },
      { id: "provenance.complete", status: "not_checked" },
    ],
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "inspect_qec_runtime") {
      const result = await runBridge({ action: "runtime" });
      return textResult(
        `Stim ${result.packages.stim} and PyMatching ${result.packages.pymatching} local QEC runtime is available. Cloud execution is disabled.`,
        result,
      );
    }
    if (request.params.name === "run_qec_memory_experiment") {
      const experiment = normalizeExperimentRequest(request.params.arguments);
      const facts = await runBridge({ action: "experiment", request: experiment });
      const validation = validateFacts(experiment, facts);
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
          "Stim seed reproducibility is scoped to the pinned package versions and recorded experiment configuration.",
          "Final scientific acceptance requires materialized artifacts and Session Event Log provenance.",
        ],
      };
      return textResult(
        `Stim ${facts.packages.stim} / PyMatching ${facts.packages.pymatching} decoded ${facts.result.shots} shots with ${facts.result.logicalErrors} logical error(s). This is a bounded Monte Carlo observation, not a threshold claim.`,
        output,
      );
    }
    return errorResult(new Error(`Unknown tool: ${request.params.name}`));
  } catch (error) {
    return errorResult(error);
  }
});

await server.connect(new StdioServerTransport());
