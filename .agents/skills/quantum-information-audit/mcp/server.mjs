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

import { normalizeAuditRequest } from "../validators/state-math.mjs";
import { validateStateAnalysis } from "../validators/validate-state-analysis.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const bridgePath = path.join(skillRoot, "mcp", "bridge.py");
const projectEnvironment = path.join(
  projectRoot,
  ".openquantum",
  "python-envs",
  "quantum-information-audit",
);
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
const readOnlyAnnotations = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});

const TOOLS = Object.freeze([
  {
    name: "inspect_toqito_runtime",
    title: "Inspect pinned toqito local runtime",
    description:
      "Import pinned toqito and report the bounded local density-matrix operations. The first call may build the pinned Python environment through uv; no cloud or hardware execution is available.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: {
      type: "object",
      properties: {
        schemaVersion: { type: "string", const: "1.0" },
        packageVersion: { type: "string" },
        pythonVersion: { type: "string" },
        maxDimension: { type: "integer" },
        operations: { type: "array", items: { type: "string" } },
        cloudExecutionEnabled: { type: "boolean", const: false },
      },
      required: [
        "schemaVersion",
        "packageVersion",
        "pythonVersion",
        "maxDimension",
        "operations",
        "cloudExecutionEnabled",
      ],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations,
  },
  {
    name: "audit_density_matrix",
    title: "Audit a bounded multipartite density matrix",
    description:
      "Compute density-matrix and partial-transpose facts with pinned toqito, then independently replay the key invariants in the OpenQuantum Validator. Returns observations, not final scientific acceptance, because Result Package and Session Event Log provenance are not checked.",
    inputSchema: {
      type: "object",
      properties: {
        matrixReal: {
          type: "array",
          minItems: 4,
          maxItems: 16,
          items: { type: "array", minItems: 4, maxItems: 16, items: { type: "number" } },
        },
        matrixImag: {
          type: "array",
          minItems: 4,
          maxItems: 16,
          items: { type: "array", minItems: 4, maxItems: 16, items: { type: "number" } },
        },
        subsystemDimensions: {
          type: "array",
          minItems: 2,
          items: { type: "integer", minimum: 2 },
        },
        transposeSubsystems: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { type: "integer", minimum: 0 },
        },
      },
      required: ["matrixReal", "subsystemDimensions", "transposeSubsystems"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        schemaVersion: { type: "string", const: "1.0" },
        packageVersion: { type: "string" },
        analysis: { type: "object" },
        validation: { type: "object" },
        scientificValidation: { type: "string", const: "observations_available" },
        limitations: { type: "array", items: { type: "string" } },
      },
      required: [
        "schemaVersion",
        "packageVersion",
        "analysis",
        "validation",
        "scientificValidation",
        "limitations",
      ],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations,
  },
]);

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
      finish(() => reject(new Error("toqito audit runtime timed out")));
    }, BRIDGE_TIMEOUT_MS);
    child.on("error", (error) => {
      finish(() => {
        reject(
          error.code === "ENOENT"
            ? new Error("未找到 uv；请先安装 uv 后再使用 toqito 本地审计")
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
          finish(() => reject(new Error("toqito audit runtime returned too much data")));
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
                : `toqito audit runtime exited with code ${code}`,
            ),
          );
          return;
        }
        try {
          resolve(JSON.parse(stdoutText));
        } catch {
          reject(new Error("toqito audit runtime returned invalid JSON"));
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
  return { content: [{ type: "text", text: `toqito audit tool error: ${message}` }], isError: true };
}

const server = new Server(
  { name: "openquantum-quantum-information-audit", version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Bounded local density-matrix facts from pinned toqito plus independent OpenQuantum validation observations. Never claim final scientific acceptance without Result Package and Session Event Log provenance.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "inspect_toqito_runtime") {
      const result = await runBridge({ action: "runtime" });
      return textResult(
        `toqito ${result.packageVersion} local audit runtime is available. Cloud execution is disabled.`,
        result,
      );
    }
    if (request.params.name === "audit_density_matrix") {
      const auditRequest = normalizeAuditRequest(request.params.arguments);
      const analysis = await runBridge({ action: "audit", request: auditRequest });
      const validation = validateStateAnalysis({ request: auditRequest, analysis });
      const result = {
        schemaVersion: "1.0",
        packageVersion: analysis.packageVersion,
        analysis,
        validation,
        scientificValidation: "observations_available",
        limitations: [
          "Bounded local numerical audit only; no cloud service or quantum hardware was used.",
          "Partial-transpose negativity is evidence for the selected bipartition, not a universal entanglement classification.",
          "Final scientific acceptance requires materialized artifacts and Session Event Log provenance.",
        ],
      };
      const failed = validation.observations.filter((item) => item.status === "fail").length;
      return textResult(
        `toqito ${analysis.packageVersion} returned density-matrix facts; the independent Validator recorded ${failed} failed observation(s). Scientific validation is observations_available, not final acceptance.`,
        result,
      );
    }
    return errorResult(new Error(`Unknown tool: ${request.params.name}`));
  } catch (error) {
    return errorResult(error);
  }
});

await server.connect(new StdioServerTransport());
