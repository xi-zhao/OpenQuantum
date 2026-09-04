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
  "quantum-circuit-verification",
);
const MAX_QASM_BYTES = 64 * 1024;
const MAX_QUBITS = 16;
const MAX_STATEMENTS = 512;
const BRIDGE_TIMEOUT_MS = 30_000;
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
    name: "verify_circuit_equivalence",
    title: "Verify two bounded unitary OpenQASM 2 circuits",
    description:
      "Use pinned MQT QCEC to classify two supplied unitary OpenQASM 2 circuits as equivalent, non-equivalent, phase-equivalent, probabilistic or inconclusive. Measurements, resets, classical control, arbitrary include files and more than 16 qubits are rejected before Python execution. Returns validation observations, not provenance-complete final acceptance.",
    inputSchema: {
      type: "object",
      properties: {
        circuitAOpenQasm2: { type: "string", minLength: 1, maxLength: MAX_QASM_BYTES },
        circuitBOpenQasm2: { type: "string", minLength: 1, maxLength: MAX_QASM_BYTES },
      },
      required: ["circuitAOpenQasm2", "circuitBOpenQasm2"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        schemaVersion: { type: "string", const: "1.0" },
        packageVersion: { type: "string" },
        inputs: { type: "object" },
        result: { type: "object" },
        validation: { type: "object" },
        scientificValidation: { type: "string", const: "observations_available" },
        limitations: { type: "array", items: { type: "string" } },
      },
      required: [
        "schemaVersion",
        "packageVersion",
        "inputs",
        "result",
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

function strippedQasm(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function summarizeQasm(value, field) {
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes < 1 || bytes > MAX_QASM_BYTES || value.includes("\0")) {
    throw new TypeError(`${field} must contain 1 to ${MAX_QASM_BYTES} UTF-8 bytes`);
  }
  const source = strippedQasm(value);
  if (!/^\s*OPENQASM\s+2\.0\s*;/i.test(source)) {
    throw new TypeError(`${field} must declare OPENQASM 2.0`);
  }
  if (/\b(measure|reset|if|opaque|creg)\b/i.test(source)) {
    throw new TypeError(`${field} must be unitary and contain no measurement or classical control`);
  }
  const includeStatements = [...source.matchAll(/\binclude\s+"([^"]+)"\s*;/gi)];
  const includeTokens = source.match(/\binclude\b/gi) ?? [];
  if (
    includeStatements.length !== includeTokens.length ||
    includeStatements.some((match) => match[1] !== "qelib1.inc")
  ) {
    throw new TypeError(`${field} may include only qelib1.inc`);
  }
  const qregs = [...source.matchAll(/\bqreg\s+[A-Za-z_][A-Za-z0-9_]*\[(\d+)\]\s*;/g)];
  if (qregs.length < 1) throw new TypeError(`${field} must declare at least one qreg`);
  const qubits = qregs.reduce((total, match) => total + Number(match[1]), 0);
  if (!Number.isInteger(qubits) || qubits < 1 || qubits > MAX_QUBITS) {
    throw new TypeError(`${field} must declare 1 to ${MAX_QUBITS} qubits`);
  }
  const statements = (source.match(/;/g) ?? []).length;
  if (statements > MAX_STATEMENTS) {
    throw new TypeError(`${field} must contain at most ${MAX_STATEMENTS} statements`);
  }
  return {
    bytes,
    sha256: createHash("sha256").update(value).digest("hex"),
    qubits,
    statements,
  };
}

function normalizeVerificationRequest(value) {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) => !["circuitAOpenQasm2", "circuitBOpenQasm2"].includes(key),
    )
  ) {
    throw new TypeError("circuit equivalence request is invalid");
  }
  const circuitA = summarizeQasm(value.circuitAOpenQasm2, "circuitAOpenQasm2");
  const circuitB = summarizeQasm(value.circuitBOpenQasm2, "circuitBOpenQasm2");
  if (circuitA.qubits !== circuitB.qubits) {
    throw new TypeError("both circuits must declare the same total qubit count in this profile");
  }
  return {
    circuitAOpenQasm2: value.circuitAOpenQasm2,
    circuitBOpenQasm2: value.circuitBOpenQasm2,
    summaries: { circuitA, circuitB },
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
      finish(() => reject(new Error("MQT QCEC runtime timed out")));
    }, BRIDGE_TIMEOUT_MS);
    child.on("error", (error) => {
      finish(() => {
        reject(
          error.code === "ENOENT"
            ? new Error("未找到 uv；请先安装 uv 后再使用 MQT QCEC 本地验证")
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
          finish(() => reject(new Error("MQT QCEC runtime returned too much data")));
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
                : `MQT QCEC runtime exited with code ${code}`,
            ),
          );
          return;
        }
        try {
          resolve(JSON.parse(stdoutText));
        } catch {
          reject(new Error("MQT QCEC runtime returned invalid JSON"));
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
  return { content: [{ type: "text", text: `MQT QCEC tool error: ${message}` }], isError: true };
}

function equivalenceObservation(equivalence) {
  const equivalent = new Set([
    "equivalent",
    "equivalent_up_to_phase",
    "equivalent_up_to_global_phase",
  ]);
  if (equivalent.has(equivalence)) {
    return { id: "circuits.equivalent", status: "pass", criterion: equivalence };
  }
  if (equivalence === "not_equivalent") {
    return { id: "circuits.equivalent", status: "fail", criterion: equivalence };
  }
  return { id: "circuits.equivalent", status: "not_checked", criterion: equivalence };
}

const server = new Server(
  { name: "openquantum-quantum-circuit-verification", version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Bounded local MQT QCEC equivalence observations for supplied unitary OpenQASM 2 circuits. Never submit hardware jobs or claim provenance-complete final acceptance.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "verify_circuit_equivalence") {
      const normalized = normalizeVerificationRequest(request.params.arguments);
      const result = await runBridge({
        action: "verify",
        circuitA: normalized.circuitAOpenQasm2,
        circuitB: normalized.circuitBOpenQasm2,
      });
      const digestsMatch =
        result.inputDigests?.circuitA === normalized.summaries.circuitA.sha256 &&
        result.inputDigests?.circuitB === normalized.summaries.circuitB.sha256;
      const conclusive = new Set([
        "equivalent",
        "equivalent_up_to_phase",
        "equivalent_up_to_global_phase",
        "not_equivalent",
      ]).has(result.equivalence);
      const validation = {
        schemaVersion: "1.0",
        observations: [
          {
            id: "inputs.digest",
            status: digestsMatch ? "pass" : "fail",
          },
          {
            id: "qcec.conclusive",
            status: conclusive ? "pass" : "not_checked",
            criterion: result.equivalence,
          },
          equivalenceObservation(result.equivalence),
          {
            id: "provenance.complete",
            status: "not_checked",
          },
        ],
      };
      const output = {
        schemaVersion: "1.0",
        packageVersion: result.packageVersion,
        inputs: normalized.summaries,
        result,
        validation,
        scientificValidation: "observations_available",
        limitations: [
          "This profile accepts bounded unitary OpenQASM 2 only; measurements, resets and classical control are out of scope.",
          "Probabilistic or no_information criteria remain inconclusive and must not be promoted to equivalence claims.",
          "Final scientific acceptance requires materialized artifacts and Session Event Log provenance.",
        ],
      };
      return textResult(
        `MQT QCEC ${result.packageVersion} classified the circuits as ${result.equivalence}. Scientific validation is observations_available, not final acceptance.`,
        output,
      );
    }
    return errorResult(new Error(`Unknown tool: ${request.params.name}`));
  } catch (error) {
    return errorResult(error);
  }
});

await server.connect(new StdioServerTransport());
