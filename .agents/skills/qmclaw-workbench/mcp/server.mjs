#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  EMPTY_INPUT_SCHEMA,
  INSPECT_OUTPUT_SCHEMA,
  inspectQmclawRuntime,
  LIST_OUTPUT_SCHEMA,
  listQmclawExperiments,
  QMCLAW_SERVER_NAME,
  SIMULATE_INPUT_SCHEMA,
  SIMULATE_OUTPUT_SCHEMA,
  simulateQmclawExperiment,
} from "../core/experiments.mjs";

const READ_ONLY_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

const TOOLS = Object.freeze([
  Object.freeze({
    name: "inspect_qmclaw_runtime",
    title: "Inspect QMClaw local runtime",
    description:
      "Inspect the pinned QMClaw upstream provenance and the local simulation safety boundary. This never probes a network, credential, laboratory service, or quantum device.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    outputSchema: INSPECT_OUTPUT_SCHEMA,
    annotations: READ_ONLY_ANNOTATIONS,
  }),
  Object.freeze({
    name: "list_qmclaw_experiments",
    title: "List QMClaw experiment simulations",
    description:
      "List the 13 bounded experiment simulations, their reviewed upstream Tool mappings, accepted SI parameters, defaults, axes, and series.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    outputSchema: LIST_OUTPUT_SCHEMA,
    annotations: READ_ONLY_ANNOTATIONS,
  }),
  Object.freeze({
    name: "simulate_qmclaw_experiment",
    title: "Simulate a QMClaw experiment",
    description:
      "Generate bounded deterministic synthetic data for one reviewed QMClaw experiment using only local JavaScript. Results are explicitly simulations and are not scientifically validated.",
    inputSchema: SIMULATE_INPUT_SCHEMA,
    outputSchema: SIMULATE_OUTPUT_SCHEMA,
    annotations: READ_ONLY_ANNOTATIONS,
  }),
]);

function textResult(text, structuredContent) {
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

function errorResult(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `QMClaw local tool error: ${message}` }],
    isError: true,
  };
}

function requireNoArguments(value) {
  const resolved = value === undefined ? {} : value;
  if (
    resolved === null ||
    typeof resolved !== "object" ||
    Array.isArray(resolved) ||
    Object.keys(resolved).length > 0
  ) {
    throw new TypeError("this tool accepts no arguments");
  }
}

const server = new Server(
  { name: QMCLAW_SERVER_NAME, version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Bounded, deterministic, read-only local simulations for 13 QMClaw experiment types. No hardware, network, credential, laboratory-control, parameter-mutation, or arbitrary-code interface is registered. Every simulated result remains scientifically not evaluated.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "inspect_qmclaw_runtime": {
        requireNoArguments(request.params.arguments);
        const result = inspectQmclawRuntime();
        return textResult(
          `QMClaw revision ${result.upstream.revision} is exposed as a local simulator for ${result.experimentCount} experiment types. Hardware execution is disabled.`,
          result,
        );
      }
      case "list_qmclaw_experiments": {
        requireNoArguments(request.params.arguments);
        const result = listQmclawExperiments();
        return textResult(
          `Listed ${result.experiments.length} bounded QMClaw experiment simulations with SI-unit contracts.`,
          result,
        );
      }
      case "simulate_qmclaw_experiment": {
        const result = simulateQmclawExperiment(
          request.params.arguments === undefined ? {} : request.params.arguments,
        );
        return textResult(
          `Generated deterministic ${result.experiment} synthetic data for ${result.execution.qubits.join(", ")}; sourceKind=simulation and scientificValidation=not_evaluated. No hardware or network was accessed.`,
          result,
        );
      }
      default:
        return errorResult(new Error(`Unknown tool: ${request.params.name}`));
    }
  } catch (error) {
    return errorResult(error);
  }
});

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
