#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { toolDefinitions } from "../runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const skillRoot = path.join(projectRoot, ".agents", "skills", "quantum-ground-state");
const defaultRequestPath = path.join(
  skillRoot,
  "evals",
  "fixtures",
  "requests",
  "protocol-fixture.json",
);
const atomicToolName = "solve_and_validate_ground_state";
const atomicTool = toolDefinitions.find((tool) => tool.name === atomicToolName);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRequest(requestPath) {
  const absolutePath = path.resolve(requestPath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Cannot read request JSON ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function summarize(structured) {
  const facts = structured?.facts;
  const validation = structured?.validation;
  const groundState = facts?.groundStateResult;
  const exact = facts?.exactReference;
  if (
    !isRecord(structured) ||
    !isRecord(facts) ||
    !isRecord(validation) ||
    !isRecord(groundState) ||
    !isRecord(exact) ||
    !Array.isArray(validation.observations)
  ) {
    throw new Error("atomic native Tool returned an incomplete structured result");
  }

  const counts = { pass: 0, fail: 0, not_checked: 0 };
  for (const observation of validation.observations) {
    if (!isRecord(observation) || !Object.hasOwn(counts, observation.status)) {
      throw new Error("Validator returned an unsupported observation status");
    }
    counts[observation.status] += 1;
  }
  const computationalFailures = validation.observations
    .filter(
      (observation) =>
        observation.id !== "provenance.complete" && observation.status !== "pass",
    )
    .map((observation) => observation.id);
  const provenance = validation.observations.find(
    (observation) => observation.id === "provenance.complete",
  );
  if (validation.scopeMatch?.status !== "in_scope") {
    throw new Error(`request is ${String(validation.scopeMatch?.status ?? "unscoped")}`);
  }
  if (computationalFailures.length > 0) {
    throw new Error(`computational checks failed: ${computationalFailures.join(", ")}`);
  }
  if (provenance?.status !== "not_checked") {
    throw new Error("execution-local demo must leave provenance.complete as not_checked");
  }

  return {
    schemaVersion: "1.0",
    demo: "openquantum-qgs-native-tool",
    capability: { id: "quantum-ground-state", version: "0.2.0" },
    provider: "openquantum-native-quantum-tools",
    tool: atomicToolName,
    requestId: facts.problemSpec?.requestId,
    runtime: { status: "completed" },
    result: {
      energyHartree: groundState.energyHartree,
      exactEnergyHartree: exact.groundEnergyHartree,
      absoluteErrorHartree: Math.abs(
        groundState.energyHartree - exact.groundEnergyHartree,
      ),
      converged: groundState.converged,
      evaluationCount: groundState.evaluationCount,
    },
    scientificReview: {
      status: "observations_available",
      scope: validation.scopeMatch.status,
      observations: counts,
      provenance: "not_checked",
      acceptance: "not_derived",
    },
    statement:
      "The local native Tool workflow passed every computational check. Harness materialization and final Acceptance remain separate.",
  };
}

async function run() {
  const requestPath = process.argv[2] ?? defaultRequestPath;
  if (process.argv.length > 3) {
    throw new Error("Usage: node scripts/run-quantum-ground-state-demo.mjs [request.json]");
  }
  const request = readRequest(requestPath);
  if (!atomicTool) {
    throw new Error(`native Tool Provider did not register ${atomicToolName}`);
  }
  const result = await atomicTool.execute({ request });
  process.stdout.write(`${JSON.stringify(summarize(result), null, 2)}\n`);
}

run().catch((error) => {
  process.stderr.write(
    `QGS demo failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
