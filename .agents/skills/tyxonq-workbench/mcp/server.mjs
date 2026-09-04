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
  "tyxonq-workbench",
);
const MAX_QUBITS = 8;
const MAX_OPERATIONS = 64;
const MAX_SHOTS = 8192;
const BRIDGE_TIMEOUT_MS = 180_000;
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
const SINGLE_QUBIT_GATES = new Set(["h", "x", "s", "sdg"]);
const ROTATION_GATES = new Set(["rx", "ry", "rz"]);
const TWO_QUBIT_GATES = new Set(["cx", "cz"]);
const SUPPORTED_GATES = new Set([
  ...SINGLE_QUBIT_GATES,
  ...ROTATION_GATES,
  ...TWO_QUBIT_GATES,
]);
const NOISE_TYPES = new Set([
  "depolarizing",
  "amplitude_damping",
  "phase_damping",
  "pauli",
]);
const lazyEnvironmentAnnotations = Object.freeze({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});

const operationSchema = Object.freeze({
  type: "object",
  properties: {
    gate: { type: "string", enum: [...SUPPORTED_GATES] },
    qubits: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: { type: "integer", minimum: 0, maximum: MAX_QUBITS - 1 },
    },
    angle: { type: "number" },
  },
  required: ["gate", "qubits"],
  additionalProperties: false,
});

const noiseSchema = Object.freeze({
  type: "object",
  properties: {
    type: { type: "string", enum: [...NOISE_TYPES] },
    strength: { type: "number", minimum: 0, maximum: 1 },
    x: { type: "number", minimum: 0, maximum: 1 },
    y: { type: "number", minimum: 0, maximum: 1 },
    z: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["type"],
  additionalProperties: false,
});

const TOOLS = Object.freeze([
  {
    name: "simulate_tyxonq_circuit",
    title: "Simulate a bounded circuit with TyxonQ",
    description:
      "Run a bounded local TyxonQ statevector or density-matrix simulation. The first call may download the pinned package through uv; the calculation never uses TyxonQ cloud providers or quantum hardware and does not claim independent scientific validation.",
    inputSchema: {
      type: "object",
      properties: {
        numQubits: {
          type: "integer",
          minimum: 1,
          maximum: MAX_QUBITS,
        },
        operations: {
          type: "array",
          minItems: 1,
          maxItems: MAX_OPERATIONS,
          items: operationSchema,
        },
        mode: { type: "string", enum: ["exact", "sampled"] },
        shots: {
          type: "integer",
          minimum: 1,
          maximum: MAX_SHOTS,
        },
        noise: noiseSchema,
      },
      required: ["numQubits", "operations", "mode"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        schemaVersion: { type: "string", const: "1.0" },
        tyxonqVersion: { type: "string" },
        circuit: {
          type: "object",
          properties: {
            numQubits: { type: "integer" },
            operationCount: { type: "integer" },
            sha256: { type: "string" },
          },
          required: ["numQubits", "operationCount", "sha256"],
          additionalProperties: false,
        },
        execution: { type: "object" },
        result: { type: "object" },
        checks: { type: "object" },
        scientificValidation: { type: "string", const: "not_evaluated" },
        limitations: { type: "array", items: { type: "string" } },
      },
      required: [
        "schemaVersion",
        "tyxonqVersion",
        "circuit",
        "execution",
        "result",
        "checks",
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

function finiteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  return value;
}

function probability(value, field) {
  const number = finiteNumber(value, field);
  if (number < 0 || number > 1) {
    throw new TypeError(`${field} must be between 0 and 1`);
  }
  return number;
}

function normalizeOperation(value, numQubits, index) {
  if (!isRecord(value) || Object.keys(value).some((key) => !["gate", "qubits", "angle"].includes(key))) {
    throw new TypeError(`operations[${index}] is invalid`);
  }
  if (!SUPPORTED_GATES.has(value.gate) || !Array.isArray(value.qubits)) {
    throw new TypeError(`operations[${index}] gate or qubits is invalid`);
  }
  const expectedArity = TWO_QUBIT_GATES.has(value.gate) ? 2 : 1;
  if (
    value.qubits.length !== expectedArity ||
    value.qubits.some(
      (qubit) =>
        !Number.isInteger(qubit) || qubit < 0 || qubit >= numQubits,
    ) ||
    new Set(value.qubits).size !== value.qubits.length
  ) {
    throw new TypeError(`operations[${index}] contains invalid qubits`);
  }
  const operation = { gate: value.gate, qubits: [...value.qubits] };
  if (ROTATION_GATES.has(value.gate)) {
    operation.angle = finiteNumber(value.angle, `operations[${index}].angle`);
  } else if (value.angle !== undefined) {
    throw new TypeError(`operations[${index}].angle is not valid for ${value.gate}`);
  }
  return operation;
}

function normalizeNoise(value) {
  if (value === undefined) {
    return null;
  }
  if (!isRecord(value) || !NOISE_TYPES.has(value.type)) {
    throw new TypeError("noise.type is invalid");
  }
  if (value.type === "pauli") {
    if (Object.keys(value).some((key) => !["type", "x", "y", "z"].includes(key))) {
      throw new TypeError("pauli noise has unknown fields");
    }
    const x = probability(value.x, "noise.x");
    const y = probability(value.y, "noise.y");
    const z = probability(value.z, "noise.z");
    if (x + y + z > 1) {
      throw new TypeError("noise.x + noise.y + noise.z must not exceed 1");
    }
    return { type: value.type, x, y, z };
  }
  if (Object.keys(value).some((key) => !["type", "strength"].includes(key))) {
    throw new TypeError(`${value.type} noise has unknown fields`);
  }
  return {
    type: value.type,
    strength: probability(value.strength, "noise.strength"),
  };
}

function normalizeSimulationRequest(value) {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) => !["numQubits", "operations", "mode", "shots", "noise"].includes(key),
    ) ||
    !Number.isInteger(value.numQubits) ||
    value.numQubits < 1 ||
    value.numQubits > MAX_QUBITS ||
    !Array.isArray(value.operations) ||
    value.operations.length < 1 ||
    value.operations.length > MAX_OPERATIONS ||
    !["exact", "sampled"].includes(value.mode)
  ) {
    throw new TypeError("TyxonQ simulation request is invalid");
  }
  const noise = normalizeNoise(value.noise);
  if (value.mode === "exact" && noise !== null) {
    throw new TypeError("noise requires mode=sampled");
  }
  let shots = value.shots;
  if (value.mode === "exact") {
    if (shots !== undefined) {
      throw new TypeError("exact mode does not accept shots");
    }
    shots = 0;
  } else {
    shots ??= 1024;
    if (!Number.isInteger(shots) || shots < 1 || shots > MAX_SHOTS) {
      throw new TypeError(`shots must be between 1 and ${MAX_SHOTS}`);
    }
  }
  return {
    numQubits: value.numQubits,
    operations: value.operations.map((operation, index) =>
      normalizeOperation(operation, value.numQubits, index),
    ),
    mode: value.mode,
    shots,
    noise,
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
        "--frozen",
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
      finish(() => reject(new Error("TyxonQ local runtime timed out")));
    }, BRIDGE_TIMEOUT_MS);
    child.on("error", (error) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(new Error("未找到 uv；请先安装 uv 后再使用 TyxonQ 本地仿真"));
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
          finish(() => reject(new Error("TyxonQ local runtime returned too much data")));
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
                : `TyxonQ local runtime exited with code ${code}`,
            ),
          );
          return;
        }
        try {
          resolve(JSON.parse(stdoutText));
        } catch {
          reject(new Error("TyxonQ local runtime returned invalid JSON"));
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
    content: [{ type: "text", text: `TyxonQ tool error: ${message}` }],
    isError: true,
  };
}

const server = new Server(
  { name: "openquantum-tyxonq-local", version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Bounded local TyxonQ circuit simulation. Never use cloud providers, tokens or quantum hardware, and never claim that engineering checks are independent scientific validation.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "simulate_tyxonq_circuit") {
      const simulation = normalizeSimulationRequest(request.params.arguments);
      const result = await runBridge({ action: "simulate", request: simulation });
      return textResult(
        `TyxonQ ${result.tyxonqVersion} simulated ${result.circuit.numQubits} qubit(s) in ${result.execution.mode} mode. Scientific validation remains not_evaluated.`,
        result,
      );
    }
    return errorResult(new Error(`Unknown tool: ${request.params.name}`));
  } catch (error) {
    return errorResult(error);
  }
});

await server.connect(new StdioServerTransport());
