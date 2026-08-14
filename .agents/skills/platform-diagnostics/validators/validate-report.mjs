import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  findSecretViolations,
  validateJsonWithSchema,
} from "../../../skill-contracts/index.mjs";

const REQUIRED_CHECKS = new Map([
  ["ui.transport", "ui"],
  ["harness.config", "harness"],
  ["harness.host", "harness"],
  ["skill.discovery", "skill"],
  ["model.catalog", "model"],
  ["model.text-generation", "model"],
  ["model.tool-calling", "model"],
]);
const VALID_STATUSES = new Set(["pass", "warn", "fail", "not_checked"]);
const VALID_LAYERS = new Set(["ui", "harness", "skill", "model"]);
const reportSchema = fileURLToPath(
  new URL("../artifacts/diagnostic-report.schema.json", import.meta.url),
);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deriveStatus(checks) {
  if (checks.some((check) => check.required && check.status === "fail")) {
    return "blocked";
  }

  if (checks.some((check) => check.status !== "pass")) {
    return "degraded";
  }

  return "ready";
}

function countStatuses(checks) {
  return checks.reduce(
    (counts, check) => {
      const key = check.status === "not_checked" ? "notChecked" : check.status;
      counts[key] += 1;
      return counts;
    },
    { pass: 0, warn: 0, fail: 0, notChecked: 0 },
  );
}

export function validateReport(report) {
  const errors = [
    ...validateJsonWithSchema(report, reportSchema).map(
      (issue) => `schema: ${issue}`,
    ),
  ];

  if (!isObject(report)) {
    return ["report must be a JSON object"];
  }

  if (report.schemaVersion !== "1.0") {
    errors.push('schemaVersion must equal "1.0"');
  }

  if (
    !isObject(report.capability) ||
    report.capability.id !== "platform-diagnostics" ||
    typeof report.capability.version !== "string" ||
    report.capability.version.length === 0
  ) {
    errors.push("capability must identify platform-diagnostics and its version");
  }

  if (
    typeof report.generatedAt !== "string" ||
    Number.isNaN(Date.parse(report.generatedAt))
  ) {
    errors.push("generatedAt must be a valid date-time string");
  }

  if (
    report.sessionId !== undefined &&
    (typeof report.sessionId !== "string" || report.sessionId.length === 0)
  ) {
    errors.push("sessionId must be a non-empty string when present");
  }

  if (!Array.isArray(report.checks)) {
    errors.push("checks must be an array");
    return errors;
  }

  const seen = new Set();

  for (const [index, check] of report.checks.entries()) {
    if (!isObject(check)) {
      errors.push(`checks[${index}] must be an object`);
      continue;
    }

    if (typeof check.id !== "string" || check.id.length === 0) {
      errors.push(`checks[${index}].id must be a non-empty string`);
    } else if (seen.has(check.id)) {
      errors.push(`duplicate check id: ${check.id}`);
    } else {
      seen.add(check.id);
    }

    if (!VALID_STATUSES.has(check.status)) {
      errors.push(`check ${check.id ?? index} has an invalid status`);
    }

    if (!VALID_LAYERS.has(check.layer)) {
      errors.push(`check ${check.id ?? index} has an invalid layer`);
    }

    if (typeof check.required !== "boolean") {
      errors.push(`check ${check.id ?? index} must declare required`);
    }

    if (
      !Array.isArray(check.evidence) ||
      check.evidence.length === 0 ||
      check.evidence.some((item) => typeof item !== "string" || item.length === 0)
    ) {
      errors.push(`check ${check.id ?? index} must include non-empty evidence`);
    }

    if (
      check.status !== "pass" &&
      (typeof check.nextAction !== "string" || check.nextAction.length === 0)
    ) {
      errors.push(`check ${check.id ?? index} must include nextAction when not passing`);
    }
  }

  for (const [id, layer] of REQUIRED_CHECKS) {
    const check = report.checks.find((candidate) => candidate?.id === id);

    if (!check) {
      errors.push(`missing required check: ${id}`);
      continue;
    }

    if (check.required !== true) {
      errors.push(`check ${id} must be marked required`);
    }

    if (check.layer !== layer) {
      errors.push(`check ${id} must belong to layer ${layer}`);
    }
  }

  const expectedStatus = deriveStatus(report.checks);

  if (report.status !== expectedStatus) {
    errors.push(`status must be ${expectedStatus}, received ${String(report.status)}`);
  }

  const expectedCounts = countStatuses(report.checks);

  if (!isObject(report.summary) || !isObject(report.summary.counts)) {
    errors.push("summary.counts must be present");
  } else {
    if (
      typeof report.summary.statement !== "string" ||
      report.summary.statement.length === 0
    ) {
      errors.push("summary.statement must be a non-empty string");
    }

    for (const [key, value] of Object.entries(expectedCounts)) {
      if (report.summary.counts[key] !== value) {
        errors.push(`summary.counts.${key} must equal ${value}`);
      }
    }
  }

  errors.push(...findSecretViolations(report, "diagnosticReport"));

  return errors;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : undefined;

if (invokedFile === currentFile) {
  const reportFile = process.argv[2];

  if (!reportFile) {
    console.error("Usage: node validate-report.mjs <report.json>");
    process.exit(2);
  }

  try {
    const report = JSON.parse(fs.readFileSync(path.resolve(reportFile), "utf8"));
    const errors = validateReport(report);

    if (errors.length > 0) {
      for (const error of errors) {
        console.error(`INVALID: ${error}`);
      }
      process.exitCode = 1;
    } else {
      console.log(
        `VALID platform-diagnostics report: status=${report.status} checks=${report.checks.length}`,
      );
    }
  } catch (error) {
    console.error(`INVALID: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
