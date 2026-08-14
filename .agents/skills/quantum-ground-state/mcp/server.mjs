#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { solveGroundState } from "../scripts/solve.mjs";
import {
  validateGroundStateComputation,
  validateValidationBundle,
} from "../validators/validate-result.mjs";
import {
  requireSolveAndValidateRequest,
  requireSolveRequest,
  requireValidationBundle,
  SOLVE_AND_VALIDATE_INPUT_SCHEMA,
  SOLVE_AND_VALIDATE_OUTPUT_SCHEMA,
  SOLVE_INPUT_SCHEMA,
  SOLVE_OUTPUT_SCHEMA,
  trustedAcceptanceProfile,
  VALIDATE_INPUT_SCHEMA,
  VALIDATE_OUTPUT_SCHEMA,
  validateFacts,
} from "./contracts.mjs";

const TOOL_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

const TOOLS = Object.freeze([
  Object.freeze({
    name: "solve_and_validate_ground_state",
    title: "Solve and validate quantum ground-state facts",
    description:
      "Preferred tool for ordinary requests. Deterministically compute six facts and immediately run the independent scientific Validator. Returns computational observations while truthfully leaving materialized provenance not_checked; it never derives an overall Acceptance status.",
    inputSchema: SOLVE_AND_VALIDATE_INPUT_SCHEMA,
    outputSchema: SOLVE_AND_VALIDATE_OUTPUT_SCHEMA,
    annotations: TOOL_ANNOTATIONS,
  }),
  Object.freeze({
    name: "solve_ground_state",
    title: "Solve quantum ground-state facts",
    description:
      "Deterministically compute six factual artifacts for a supplied two-qubit real Pauli Hamiltonian in the fixed hamming-weight=1 sector. This tool does not validate or declare scientific acceptance.",
    inputSchema: SOLVE_INPUT_SCHEMA,
    outputSchema: SOLVE_OUTPUT_SCHEMA,
    annotations: TOOL_ANNOTATIONS,
  }),
  Object.freeze({
    name: "validate_ground_state",
    title: "Validate quantum ground-state facts",
    description:
      "Independently replay a materialized quantum-ground-state validation bundle and return only scope and check observations. This tool never derives an overall acceptance status.",
    inputSchema: VALIDATE_INPUT_SCHEMA,
    outputSchema: VALIDATE_OUTPUT_SCHEMA,
    annotations: TOOL_ANNOTATIONS,
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
    content: [{ type: "text", text: `Quantum ground-state tool error: ${message}` }],
    isError: true,
  };
}

function solve(argumentsValue) {
  const request = requireSolveRequest(argumentsValue);
  const facts = validateFacts(solveGroundState(request));
  const result = facts.groundStateResult;
  return textResult(
    [
      `Computed six deterministic facts for request ${facts.problemSpec.requestId}.`,
      `Sector energy: ${result.energyHartree} hartree; evaluations: ${result.evaluationCount}; converged fact: ${result.converged}.`,
      "No scientific acceptance decision was produced.",
    ].join(" "),
    facts,
  );
}

function solveAndValidate(argumentsValue) {
  const request = requireSolveAndValidateRequest(argumentsValue);
  const facts = validateFacts(solveGroundState(request));
  const validation = validateGroundStateComputation({
    profile: trustedAcceptanceProfile(),
    request,
    facts,
  });
  const counts = { pass: 0, fail: 0, not_checked: 0 };
  for (const observation of validation.observations) {
    counts[observation.status] += 1;
  }
  return textResult(
    [
      `Computed six deterministic facts and ${validation.observations.length} independent observations for request ${facts.problemSpec.requestId}.`,
      `${counts.pass} pass, ${counts.fail} fail, ${counts.not_checked} not checked; scope fact: ${validation.scopeMatch.status}.`,
      "Execution provenance is not checked until Harness materializes a Result Package. No overall Acceptance decision was produced.",
    ].join(" "),
    { facts, validation },
  );
}

function validate(argumentsValue) {
  const bundle = requireValidationBundle(argumentsValue);
  const observations = validateValidationBundle(bundle);
  const passCount = observations.observations.filter(
    (observation) => observation.status === "pass",
  ).length;
  const failCount = observations.observations.length - passCount;
  return textResult(
    [
      `Produced ${observations.observations.length} deterministic observations: ${passCount} pass, ${failCount} fail.`,
      `Scope fact: ${observations.scopeMatch.status}.`,
      "No overall acceptance decision was derived.",
    ].join(" "),
    observations,
  );
}

const server = new Server(
  { name: "openquantum-quantum-ground-state", version: "0.2.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Pure local quantum-ground-state computation. For an ordinary user request call solve_and_validate_ground_state. Use solve_ground_state only when facts alone are requested, and validate_ground_state only for an already materialized validation bundle. Runtime completion and scientific acceptance remain separate.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "solve_and_validate_ground_state":
        return solveAndValidate(request.params.arguments ?? {});
      case "solve_ground_state":
        return solve(request.params.arguments ?? {});
      case "validate_ground_state":
        return validate(request.params.arguments ?? {});
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
