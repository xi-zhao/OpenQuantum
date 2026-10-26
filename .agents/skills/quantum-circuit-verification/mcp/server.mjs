#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { normalizeVerificationRequest } from "../core/request-contract.mjs";

import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const bridgePath = path.join(skillRoot, "mcp", "bridge.py");
const projectEnvironment = path.join(
  projectRoot,
  ".openquantum",
  "python-envs",
  "quantum-circuit-verification",
);
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
    name: "verify_circuit_equivalence",
    title: "Verify two unitary OpenQASM 2 circuits",
    description:
      "Use pinned MQT QCEC to classify two supplied unitary OpenQASM 2 circuits as equivalent, non-equivalent, phase-equivalent, probabilistic or inconclusive. Measurements, resets, classical control and arbitrary include files are rejected before Python execution. Computation scale is caller-controlled; the optional scientific audit has its own documented scope. Returns validation observations, not provenance-complete final acceptance.",
    inputSchema: {
      type: "object",
      properties: {
        circuitAOpenQasm2: { type: "string", minLength: 1 },
        circuitBOpenQasm2: { type: "string", minLength: 1 },
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
    annotations: localExecutionAnnotations,
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

async function runBridge(envelope, signal) {
  return runLocalJsonProcess({
    ...await preparedPythonLaunch({ skillRoot, args: [bridgePath] }),
    cwd: skillRoot,
    env: localComputeEnvironment(bridgeEnvironment()),
    input: envelope,
    signal,
    ...localComputeProcessOptions(),
    label: "MQT QCEC runtime",
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
server.setRequestHandler(CallToolRequestSchema, async (request, { signal }) => {
  try {
    if (request.params.name === "verify_circuit_equivalence") {
      const normalized = normalizeVerificationRequest(request.params.arguments);
      const result = await runBridge({
        action: "verify",
        circuitA: normalized.circuitAOpenQasm2,
        circuitB: normalized.circuitBOpenQasm2,
      }, signal);
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
          "This profile accepts unitary OpenQASM 2 only; measurements, resets and classical control are out of scope.",
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
