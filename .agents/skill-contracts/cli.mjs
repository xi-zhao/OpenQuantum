#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  buildAcceptanceReport,
  ContractValidationError,
  loadAcceptanceReport,
  loadCapability,
  loadResultPackage,
} from "./index.mjs";

const USAGE = `OpenQuantum Skill Contracts v1.1

Usage:
  node .agents/skill-contracts/cli.mjs validate-capability <skill-root|capability.yaml>
  node .agents/skill-contracts/cli.mjs validate-result <skill-root> <result-package.json>
  node .agents/skill-contracts/cli.mjs validate-acceptance <skill-root> <result-package.json> <acceptance-report.json>
  node .agents/skill-contracts/cli.mjs build-acceptance <skill-root> <result-package.json> <validator-id> <profile-id> <observations.json> [output.json]

The observations document must contain reportId, statement, limitations, and checks.
For a v1.1 capability it must also contain scopeMatch.
It must not contain an overall status; the central builder derives that status.`;

function readObservations(filePath) {
  const source = fs.readFileSync(path.resolve(filePath), "utf8");
  return JSON.parse(source);
}

function requireArguments(actual, expected, usageLine) {
  if (actual.length < expected) {
    throw new Error(`Missing arguments. Expected: ${usageLine}`);
  }
}

async function main(argv) {
  const [command, ...args] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(USAGE);
    return;
  }

  if (command === "validate-capability") {
    requireArguments(args, 1, "validate-capability <skill-root|capability.yaml>");
    const capability = await loadCapability(args[0]);
    console.log(
      `VALID capability ${capability.manifest.id}@${capability.manifest.version}`,
    );
    return;
  }

  if (command === "validate-result") {
    requireArguments(args, 2, "validate-result <skill-root> <result-package.json>");
    const capability = await loadCapability(args[0]);
    const result = loadResultPackage(args[1], capability);
    console.log(
      `VALID result package ${result.value.packageId} sha256=${result.sourceDigest}`,
    );
    return;
  }

  if (command === "validate-acceptance") {
    requireArguments(
      args,
      3,
      "validate-acceptance <skill-root> <result-package.json> <acceptance-report.json>",
    );
    const capability = await loadCapability(args[0]);
    const result = loadResultPackage(args[1], capability);
    const report = loadAcceptanceReport(args[2], capability, result);
    console.log(
      `VALID acceptance report ${report.value.reportId} status=${report.value.status}`,
    );
    return;
  }

  if (command === "build-acceptance") {
    requireArguments(
      args,
      5,
      "build-acceptance <skill-root> <result-package.json> <validator-id> <profile-id> <observations.json> [output.json]",
    );
    const [skillRoot, resultPath, validatorId, profileId, observationsPath, outputPath] =
      args;
    const capability = await loadCapability(skillRoot);
    const result = loadResultPackage(resultPath, capability);
    const input = readObservations(observationsPath);
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new ContractValidationError("acceptance observations", [
        "must be a JSON object",
      ]);
    }
    const allowedInputKeys = new Set([
      "reportId",
      "generatedAt",
      "statement",
      "limitations",
      "checks",
    ]);
    if (capability.manifest.schemaVersion === "1.1") {
      allowedInputKeys.add("scopeMatch");
    }
    const unknownInputKeys = Object.keys(input).filter(
      (key) => !allowedInputKeys.has(key),
    );
    if (Object.hasOwn(input, "status")) {
      throw new ContractValidationError("acceptance observations", [
        "overall status is forbidden; the central builder derives it",
      ]);
    }
    if (unknownInputKeys.length > 0) {
      throw new ContractValidationError("acceptance observations", [
        `contains unsupported fields: ${unknownInputKeys.join(", ")}`,
      ]);
    }
    const report = buildAcceptanceReport({
      capability,
      resultPackage: result,
      validatorId,
      profileId,
      reportId: input.reportId,
      generatedAt: input.generatedAt,
      ...(capability.manifest.schemaVersion === "1.1"
        ? { scopeMatch: input.scopeMatch }
        : {}),
      observations: input.checks,
      limitations: input.limitations,
      statement: input.statement,
    });
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (outputPath) {
      fs.writeFileSync(path.resolve(outputPath), serialized, { flag: "wx" });
      console.log(`BUILT acceptance report ${report.reportId} status=${report.status}`);
    } else {
      process.stdout.write(serialized);
    }
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${USAGE}`);
}

main(process.argv.slice(2)).catch((error) => {
  if (error instanceof ContractValidationError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});
