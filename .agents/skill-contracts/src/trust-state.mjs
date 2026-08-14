import { assertValid } from "./errors.mjs";

const RUNTIME_COMPLETION_STATES = new Set([
  "pending",
  "running",
  "idle",
  "failed",
  "cancelled",
]);
const SCORE_STATES = new Set(["invalid", "valid"]);
const ACCEPTANCE_STATES = new Set([
  "passed",
  "conditional",
  "failed",
]);
const REPRODUCTION_STATES = new Set(["reproduced", "not_reproduced"]);

function validateState(value, allowed, label, issues) {
  if (!allowed.has(value)) {
    issues.push(`${label} has unsupported state ${String(value)}`);
  }
}

function validateReportId(report, label, issues) {
  if (typeof report?.reportId !== "string" || report.reportId.length === 0) {
    issues.push(`${label}.reportId must be a non-empty string`);
  }
}

function validateScoreShape(report, issues) {
  validateReportId(report, "scoreReport", issues);
  if (report.status === "invalid") {
    if (report.score !== undefined) {
      issues.push("scoreReport.score must be absent when status is invalid");
    }
    return;
  }
  if (
    !report.score ||
    !Number.isFinite(report.score.value) ||
    typeof report.score.metric !== "string" ||
    report.score.metric.length === 0 ||
    typeof report.score.unit !== "string" ||
    report.score.unit.length === 0
  ) {
    issues.push("scoreReport.score must be a finite value with metric and unit when status is valid");
  }
}

/**
 * Projects independent runtime and scientific reports without inventing a
 * maturity ordering or choosing between multiple reports.
 */
export function projectTrustState({
  runtimeCompletion,
  scoreReport = null,
  acceptanceReport = null,
  reproductionReport = null,
}) {
  const issues = [];
  validateState(
    runtimeCompletion,
    RUNTIME_COMPLETION_STATES,
    "runtimeCompletion",
    issues,
  );
  if (scoreReport !== null) {
    validateState(scoreReport?.status, SCORE_STATES, "scoreReport.status", issues);
    if (SCORE_STATES.has(scoreReport?.status)) {
      validateScoreShape(scoreReport, issues);
    }
  }
  if (acceptanceReport !== null) {
    validateState(
      acceptanceReport?.status,
      ACCEPTANCE_STATES,
      "acceptanceReport.status",
      issues,
    );
    validateReportId(acceptanceReport, "acceptanceReport", issues);
  }
  if (reproductionReport !== null) {
    validateState(
      reproductionReport?.status,
      REPRODUCTION_STATES,
      "reproductionReport.status",
      issues,
    );
    validateReportId(reproductionReport, "reproductionReport", issues);
  }
  assertValid("trust state projection", issues);

  return {
    runtimeCompletion,
    validScore:
      scoreReport === null
        ? "unscored"
        : {
            reportId: scoreReport.reportId,
            status: scoreReport.status,
            ...(scoreReport.score === undefined ? {} : { score: structuredClone(scoreReport.score) }),
          },
    scientificAcceptance:
      acceptanceReport === null ? "not_evaluated" : acceptanceReport.status,
    reproduction:
      reproductionReport === null ? "not_attempted" : reproductionReport.status,
  };
}
