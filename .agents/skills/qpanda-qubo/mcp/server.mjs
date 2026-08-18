#!/usr/bin/env node

import { spawn } from "node:child_process";
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
  "qpanda-qubo",
);
const MAX_VARS = 5;
const MAX_LAYER = 6;
const MAX_ABS_COEFF = 1e6;
const BRIDGE_TIMEOUT_MS = 300_000;
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
const readOnlyAnnotations = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});

const TOOLS = Object.freeze([
  {
    name: "inspect_qpanda_qubo_runtime",
    title: "Inspect pyqpanda_alg QUBO local runtime",
    description:
      "Import the pinned local pyqpanda_alg package and report its version, bounded QUBO capabilities and the fact that cloud execution is disabled. The first call may build the pinned environment through uv (pyqpanda3 is a native wheel).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        schemaVersion: { type: "string", const: "1.0" },
        packageVersion: { type: "string" },
        pythonVersion: { type: "string" },
        maxVars: { type: "integer" },
        maxLayer: { type: "integer" },
        methods: { type: "array", items: { type: "string" } },
        cloudExecutionEnabled: { type: "boolean", const: false },
      },
      required: [
        "schemaVersion",
        "packageVersion",
        "pythonVersion",
        "maxVars",
        "maxLayer",
        "methods",
        "cloudExecutionEnabled",
      ],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations,
  },
  {
    name: "solve_qpanda_qubo",
    title: "Solve a bounded QUBO with pyqpanda_alg",
    description:
      "Solve a small quadratic unconstrained binary optimization problem locally with pyqpanda_alg. Always returns the classical brute-force optimum (qubobytraversal) as a deterministic reference; with method=qaoa it also runs the local QAOA solver. The first call may build the pinned environment through uv; the calculation never uses the Origin Quantum cloud or real hardware and does not claim independent scientific validation.",
    inputSchema: {
      type: "object",
      properties: {
        quadratic: {
          type: "array",
          minItems: 1,
          maxItems: MAX_VARS,
          items: {
            type: "array",
            minItems: 1,
            maxItems: MAX_VARS,
            items: { type: "number" },
          },
        },
        linear: {
          type: "array",
          minItems: 1,
          maxItems: MAX_VARS,
          items: { type: "number" },
        },
        constant: { type: "number" },
        method: { type: "string", enum: ["traversal", "qaoa"] },
        layer: { type: "integer", minimum: 1, maximum: MAX_LAYER },
      },
      required: ["quadratic", "method"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        schemaVersion: { type: "string", const: "1.0" },
        packageVersion: { type: "string" },
        problem: { type: "object" },
        classical: { type: "object" },
        quantum: { type: ["object", "null"] },
        checks: { type: "object" },
        scientificValidation: { type: "string", const: "not_evaluated" },
        limitations: { type: "array", items: { type: "string" } },
      },
      required: [
        "schemaVersion",
        "packageVersion",
        "problem",
        "classical",
        "checks",
        "scientificValidation",
        "limitations",
      ],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations,
  },
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function boundedNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > MAX_ABS_COEFF) {
    throw new TypeError(`${field} must be a finite number within +/-${MAX_ABS_COEFF}`);
  }
  return value;
}

function normalizeSolveRequest(value) {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) => !["quadratic", "linear", "constant", "method", "layer"].includes(key),
    ) ||
    !Array.isArray(value.quadratic) ||
    value.quadratic.length < 1 ||
    value.quadratic.length > MAX_VARS ||
    !["traversal", "qaoa"].includes(value.method)
  ) {
    throw new TypeError("QUBO request is invalid");
  }
  const size = value.quadratic.length;
  const quadratic = value.quadratic.map((row, i) => {
    if (!Array.isArray(row) || row.length !== size) {
      throw new TypeError("quadratic must be a square matrix");
    }
    return row.map((cell, j) => boundedNumber(cell, `quadratic[${i}][${j}]`));
  });

  let linear;
  if (value.linear === undefined) {
    linear = undefined;
  } else {
    if (!Array.isArray(value.linear) || value.linear.length !== size) {
      throw new TypeError("linear must match the matrix size");
    }
    linear = value.linear.map((item, i) => boundedNumber(item, `linear[${i}]`));
  }

  const constant =
    value.constant === undefined ? undefined : boundedNumber(value.constant, "constant");

  let layer;
  if (value.method === "qaoa") {
    if (!Number.isInteger(value.layer) || value.layer < 1 || value.layer > MAX_LAYER) {
      throw new TypeError(`layer must be an integer between 1 and ${MAX_LAYER} for qaoa`);
    }
    layer = value.layer;
  } else if (value.layer !== undefined) {
    throw new TypeError("layer only applies to method=qaoa");
  }

  const request = { quadratic, method: value.method };
  if (linear !== undefined) request.linear = linear;
  if (constant !== undefined) request.constant = constant;
  if (layer !== undefined) request.layer = layer;
  return request;
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

function redactBridgeError(value, env) {
  let redacted = String(value);
  for (const secret of Object.values(env)) {
    if (typeof secret === "string" && secret.length >= 4) {
      redacted = redacted.split(secret).join("[REDACTED]");
    }
  }
  return redacted;
}

function runBridge(envelope) {
  const env = bridgeEnvironment();
  return new Promise((resolve, reject) => {
    const child = spawn(
      "uv",
      [
        "run",
        "--quiet",
        "--project",
        skillRoot,
        "--python",
        "3.12",
        "python",
        bridgePath,
      ],
      {
        cwd: skillRoot,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (callback) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("pyqpanda_alg QUBO runtime timed out")));
    }, BRIDGE_TIMEOUT_MS);
    child.on("error", (error) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(new Error("未找到 uv；请先安装 uv 后再使用 QPanda QUBO 本地求解"));
        } else {
          reject(error);
        }
      });
    });
    child.stdin.on("error", (error) => {
      finish(() => reject(error));
    });
    for (const [stream, chunks] of [
      [child.stdout, stdout],
      [child.stderr, stderr],
    ]) {
      stream.on("data", (chunk) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_BRIDGE_OUTPUT_BYTES) {
          child.kill("SIGKILL");
          finish(() => reject(new Error("pyqpanda_alg QUBO runtime returned too much data")));
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
                ? redactBridgeError(stderrText.slice(0, 2000), env)
                : `pyqpanda_alg QUBO runtime exited with code ${code}`,
            ),
          );
          return;
        }
        try {
          resolve(JSON.parse(stdoutText));
        } catch {
          reject(new Error("pyqpanda_alg QUBO runtime returned invalid JSON"));
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
    content: [{ type: "text", text: `QPanda QUBO tool error: ${message}` }],
    isError: true,
  };
}

const server = new Server(
  { name: "openquantum-qpanda-qubo", version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Bounded local pyqpanda_alg QUBO solving. Never use the Origin Quantum cloud, tokens or quantum hardware, and never claim that engineering checks are independent scientific validation.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "inspect_qpanda_qubo_runtime") {
      const result = await runBridge({ action: "runtime" });
      return textResult(
        `pyqpanda_alg ${result.packageVersion} local QUBO runtime is available. Cloud execution is disabled.`,
        result,
      );
    }
    if (request.params.name === "solve_qpanda_qubo") {
      const solve = normalizeSolveRequest(request.params.arguments);
      const result = await runBridge({ action: "solve", request: solve });
      const optimum = result.classical.minimumValue;
      return textResult(
        `pyqpanda_alg ${result.packageVersion} solved a ${result.problem.size}-variable QUBO. Classical minimum ${optimum}. Scientific validation remains not_evaluated.`,
        result,
      );
    }
    return errorResult(new Error(`Unknown tool: ${request.params.name}`));
  } catch (error) {
    return errorResult(error);
  }
});

await server.connect(new StdioServerTransport());
