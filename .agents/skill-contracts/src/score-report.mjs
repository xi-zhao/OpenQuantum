import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { assertValid } from "./errors.mjs";
import {
  CONTRACT_ROOT,
  assertOnlyKeys,
  collectDuplicateIssues,
  compileSchemaFile,
  digestFile,
  findSecretViolations,
  formatAjvErrors,
  readJsonFile,
} from "./shared.mjs";

const scoreSchema = compileSchemaFile(
  path.join(CONTRACT_ROOT, "schemas", "v1.1", "score-report.schema.json"),
);

function schemaIssuesFor(value) {
  return scoreSchema.validate(value)
    ? []
    : formatAjvErrors(scoreSchema.validate.errors);
}

function resolveProfile(capability, profileId, issues) {
  const profile = capability.acceptanceProfileDefinitions?.get(profileId);
  if (!profile) {
    issues.push(`unknown acceptance profile definition ${String(profileId)}`);
  }
  return profile;
}

function resolveRunner(capability, issues) {
  const version = capability.manifest?.version;
  const runner = capability.manifest?.evals?.runner;
  const runnerPath = capability.referencedFiles?.get("evals.runner.script");
  if (typeof version !== "string" || version.length === 0) {
    issues.push("score runner version requires a loaded capability manifest version");
  }
  if (!runner || typeof runner.script !== "string") {
    issues.push("score runner requires the loaded capability evals.runner manifest entry");
  }
  if (typeof runnerPath !== "string" || runnerPath.length === 0) {
    issues.push("score runner requires the loaded evals.runner.script reference");
    return undefined;
  }
  let digest;
  try {
    digest = digestFile(runnerPath);
  } catch (error) {
    issues.push(
      `score runner script cannot be digested: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  return version && digest ? { version, digest } : undefined;
}

function validateDeterminedScopeEvidence(scope, label, issues) {
  if (
    scope.status !== "indeterminate" &&
    (!Array.isArray(scope.evidenceRefs) || scope.evidenceRefs.length === 0)
  ) {
    issues.push(`${label} ${scope.status} status must cite evidence`);
  }
}

function validateCaseOutcome(caseResult, label, issues) {
  if (
    caseResult.outcome === "fail" &&
    (typeof caseResult.failure !== "string" || caseResult.failure.length === 0)
  ) {
    issues.push(`${label} with fail outcome must include failure`);
  }
  if (
    caseResult.outcome === "pass" &&
    Object.prototype.hasOwnProperty.call(caseResult, "failure")
  ) {
    issues.push(`${label} with pass outcome must not include failure`);
  }
}

function packageMap(resultContracts, issues) {
  if (!Array.isArray(resultContracts) || resultContracts.length === 0) {
    issues.push("resultPackages must contain at least one validated result package");
    return new Map();
  }
  issues.push(
    ...collectDuplicateIssues(
      resultContracts,
      (contract) => contract.value.packageId,
      "score result package id",
    ),
  );
  issues.push(
    ...collectDuplicateIssues(
      resultContracts,
      (contract) => contract.sourceDigest,
      "score result package digest",
    ),
  );
  return new Map(
    resultContracts.map((contract) => [contract.value.packageId, contract]),
  );
}

function validateEvidenceRef(reference, packages, label, issues) {
  const contract = packages.get(reference.packageId);
  if (!contract) {
    issues.push(`${label} references result package outside this report: ${String(reference.packageId)}`);
    return;
  }
  const resultPackage = contract.value;
  if (reference.kind === "input") {
    if (!resultPackage.inputs.some((item) => item.id === reference.id)) {
      issues.push(`${label} references unknown input ${reference.id} in ${reference.packageId}`);
    }
    return;
  }
  if (reference.kind === "artifact") {
    if (!resultPackage.artifacts.some((item) => item.id === reference.id)) {
      issues.push(`${label} references unknown artifact ${reference.id} in ${reference.packageId}`);
    }
    return;
  }
  if (reference.kind === "session-event") {
    if (reference.id !== resultPackage.executionRef.sessionId) {
      issues.push(`${label} session-event id must equal package ${reference.packageId} sessionId`);
    }
    const range = resultPackage.executionRef.eventRange;
    if (reference.sequence < range.from || reference.sequence > range.to) {
      issues.push(`${label} session-event sequence is outside package ${reference.packageId} event range`);
    }
  }
}

function expectedScore(metric, earnedWeight, totalWeight) {
  const ratio = earnedWeight / totalWeight;
  const descends = ["lower_is_better", "minimize", "lower"].includes(metric.direction);
  return descends
    ? metric.maximum - ratio * (metric.maximum - metric.minimum)
    : metric.minimum + ratio * (metric.maximum - metric.minimum);
}

export function deriveScoreStatus(scope, cases) {
  return scope.status === "in_scope" &&
    cases.every((caseResult) => !caseResult.hardGate || caseResult.outcome === "pass")
    ? "valid"
    : "invalid";
}

export function validateScoreReportValue(
  report,
  capability,
  resultContracts,
) {
  const schemaIssues = schemaIssuesFor(report);
  const issues = [...schemaIssues, ...findSecretViolations(report, "scoreReport")];
  if (schemaIssues.length > 0) {
    return issues;
  }

  const manifest = capability.manifest;
  if (
    report.capability.id !== manifest.id ||
    report.capability.version !== manifest.version
  ) {
    issues.push(`capability must equal ${manifest.id}@${manifest.version}`);
  }

  const packages = packageMap(resultContracts, issues);
  for (const packageRef of report.resultPackages) {
    const contract = packages.get(packageRef.packageId);
    if (!contract) {
      issues.push(`unknown result package ${packageRef.packageId}`);
      continue;
    }
    if (packageRef.sha256 !== contract.sourceDigest) {
      issues.push(`result package ${packageRef.packageId} sha256 does not match its file bytes`);
    }
  }
  if (report.resultPackages.length !== packages.size) {
    issues.push("report resultPackages must cover exactly the validated result packages");
  }
  issues.push(
    ...collectDuplicateIssues(report.resultPackages, (item) => item.packageId, "report package id"),
  );

  const profile = resolveProfile(capability, report.profile.id, issues);
  if (profile) {
    if (report.profile.version !== profile.version) {
      issues.push(`profile version must equal ${profile.version}`);
    }
    if (report.profile.sha256 !== profile.sha256) {
      issues.push("profile sha256 must match the loaded profile definition");
    }
  }
  for (const contract of resultContracts ?? []) {
    const result = contract.value;
    if (
      result.capability.id !== report.capability.id ||
      result.capability.version !== report.capability.version
    ) {
      issues.push(`result package ${result.packageId} capability must match the report capability`);
    }
    if (
      result.acceptanceProfile.id !== report.profile.id ||
      result.acceptanceProfile.version !== report.profile.version
    ) {
      issues.push(`result package ${result.packageId} acceptanceProfile must match the score profile`);
    }
    if (Date.parse(report.generatedAt) < Date.parse(result.createdAt)) {
      issues.push(`generatedAt must not be earlier than result package ${result.packageId}`);
    }
  }

  const suite = capability.evaluationSuite;
  if (!suite) {
    issues.push("capability has no loaded evaluation suite");
    return issues;
  }
  if (report.evaluationSuite.id !== suite.id || report.evaluationSuite.version !== suite.version) {
    issues.push(`evaluationSuite must equal ${suite.id}@${suite.version}`);
  }
  if (report.evaluationSuite.sha256 !== suite.sha256) {
    issues.push("evaluationSuite sha256 must match the loaded suite definition");
  }

  const runner = resolveRunner(capability, issues);
  if (runner) {
    if (report.runner.version !== runner.version) {
      issues.push(`runner.version must be injected as ${runner.version}`);
    }
    if (report.runner.digest !== runner.digest) {
      issues.push("runner.digest must match the loaded eval runner script bytes");
    }
  }

  validateDeterminedScopeEvidence(report.scope, "score scope", issues);
  report.scope.evidenceRefs.forEach((reference, index) =>
    validateEvidenceRef(reference, packages, `scope.evidenceRefs[${index}]`, issues),
  );
  issues.push(...collectDuplicateIssues(report.cases, (item) => item.id, "score case id"));
  const definitions = new Map(suite.cases.map((item) => [item.id, item]));
  for (const definition of suite.cases) {
    if (!report.cases.some((item) => item.id === definition.id)) {
      issues.push(`missing evaluation case: ${definition.id}`);
    }
  }
  for (const caseResult of report.cases) {
    validateCaseOutcome(caseResult, `case ${caseResult.id}`, issues);
    const definition = definitions.get(caseResult.id);
    if (!definition) {
      issues.push(`unknown evaluation case: ${caseResult.id}`);
      continue;
    }
    if (caseResult.weight !== definition.weight) {
      issues.push(`case ${caseResult.id}.weight must be injected from the evaluation suite`);
    }
    if (caseResult.hardGate !== definition.hardGate) {
      issues.push(`case ${caseResult.id}.hardGate must be injected from the evaluation suite`);
    }
    if (!isDeepStrictEqual(caseResult.expectedOutcome, definition.expectedOutcome)) {
      issues.push(`case ${caseResult.id}.expectedOutcome must be injected from the evaluation suite`);
    }
    caseResult.evidenceRefs.forEach((reference, index) =>
      validateEvidenceRef(
        reference,
        packages,
        `case ${caseResult.id}.evidenceRefs[${index}]`,
        issues,
      ),
    );
  }

  const earnedWeight = report.cases.reduce(
    (total, caseResult) => total + (caseResult.outcome === "pass" ? caseResult.weight : 0),
    0,
  );
  const totalWeight = suite.cases.reduce((total, item) => total + item.weight, 0);
  if (report.earnedWeight !== earnedWeight) {
    issues.push(`earnedWeight must be derived as ${earnedWeight}`);
  }
  if (report.totalWeight !== totalWeight) {
    issues.push(`totalWeight must be derived as ${totalWeight}`);
  }

  const status = deriveScoreStatus(report.scope, report.cases);
  if (report.status !== status) {
    issues.push(`status must be derived as ${status}; received ${report.status}`);
  }
  if (status === "invalid" && report.score !== undefined) {
    issues.push("invalid score reports must not contain score");
  }
  if (status === "valid") {
    const score = report.score;
    if (!score || !Number.isFinite(score.value)) {
      issues.push("valid score reports require a finite score value");
    } else {
      if (score.metric !== suite.metric.id) {
        issues.push(`score.metric must be injected as ${suite.metric.id}`);
      }
      if (score.unit !== suite.metric.unit) {
        issues.push(`score.unit must be injected as ${suite.metric.unit}`);
      }
      if (score.value < suite.metric.minimum || score.value > suite.metric.maximum) {
        issues.push(
          `score.value must be within ${suite.metric.minimum}..${suite.metric.maximum}`,
        );
      }
      const derived = expectedScore(suite.metric, earnedWeight, totalWeight);
      if (Math.abs(score.value - derived) > Number.EPSILON * Math.max(1, Math.abs(derived)) * 8) {
        issues.push(`score.value must be derived as ${derived}`);
      }
    }
  }
  return issues;
}

export function buildScoreReport(options) {
  assertOnlyKeys(
    options,
    [
      "capability",
      "resultPackages",
      "profileId",
      "reportId",
      "generatedAt",
      "scope",
      "caseObservations",
      "limitations",
      "statement",
    ],
    "score report builder options",
  );
  const {
    capability,
    resultPackages,
    profileId,
    reportId,
    generatedAt = new Date().toISOString(),
    scope,
    caseObservations,
    limitations = [],
    statement,
  } = options;
  const issues = [];
  const packages = packageMap(resultPackages, issues);
  const profile = resolveProfile(capability, profileId, issues);
  const suite = capability.evaluationSuite;
  if (!suite) {
    issues.push("capability has no loaded evaluation suite");
  }
  const runner = resolveRunner(capability, issues);
  try {
    assertOnlyKeys(scope, ["status", "evidenceRefs", "statement"], "score scope");
  } catch (error) {
    issues.push(...(error.issues ?? [error.message]));
  }
  if (!Array.isArray(caseObservations)) {
    issues.push("caseObservations must be an array");
  }
  for (const [index, observation] of (caseObservations ?? []).entries()) {
    try {
      assertOnlyKeys(
        observation,
        ["id", "outcome", "evidenceRefs", "observed", "failure"],
        `caseObservations[${index}]`,
      );
    } catch (error) {
      issues.push(...(error.issues ?? [error.message]));
    }
    validateCaseOutcome(observation, `caseObservations[${index}]`, issues);
  }
  if (scope && typeof scope === "object") {
    validateDeterminedScopeEvidence(scope, "score scope", issues);
  }
  issues.push(
    ...collectDuplicateIssues(caseObservations ?? [], (item) => item.id, "case observation id"),
  );
  const observations = new Map((caseObservations ?? []).map((item) => [item.id, item]));
  for (const definition of suite?.cases ?? []) {
    if (!observations.has(definition.id)) {
      issues.push(`missing observation for evaluation case: ${definition.id}`);
    }
  }
  for (const observation of caseObservations ?? []) {
    if (!suite?.cases.some((item) => item.id === observation.id)) {
      issues.push(`unknown evaluation case observation: ${String(observation.id)}`);
    }
  }
  assertValid("score report observations", issues);

  const cases = suite.cases.map((definition) => ({
    ...observations.get(definition.id),
    weight: definition.weight,
    hardGate: definition.hardGate,
    expectedOutcome: structuredClone(definition.expectedOutcome),
  }));
  const earnedWeight = cases.reduce(
    (total, item) => total + (item.outcome === "pass" ? item.weight : 0),
    0,
  );
  const totalWeight = cases.reduce((total, item) => total + item.weight, 0);
  const status = deriveScoreStatus(scope, cases);
  const report = {
    schemaVersion: "1.1",
    reportId,
    capability: {
      id: capability.manifest.id,
      version: capability.manifest.version,
    },
    generatedAt,
    resultPackages: [...packages.values()].map((contract) => ({
      packageId: contract.value.packageId,
      sha256: contract.sourceDigest,
    })),
    profile: { id: profile.id, version: profile.version, sha256: profile.sha256 },
    evaluationSuite: { id: suite.id, version: suite.version, sha256: suite.sha256 },
    runner: structuredClone(runner),
    status,
    scope: structuredClone(scope),
    cases,
    earnedWeight,
    totalWeight,
    ...(status === "valid"
      ? {
          score: {
            value: expectedScore(suite.metric, earnedWeight, totalWeight),
            metric: suite.metric.id,
            unit: suite.metric.unit,
          },
        }
      : {}),
    limitations,
    statement,
  };
  assertValid(
    `score report ${reportId ?? "<missing reportId>"}`,
    validateScoreReportValue(report, capability, resultPackages),
  );
  return report;
}

export function loadScoreReport(reportPath, capability, resultContracts) {
  const loaded = readJsonFile(reportPath);
  assertValid(
    `score report ${loaded.path}`,
    validateScoreReportValue(loaded.value, capability, resultContracts),
  );
  return {
    kind: "openquantum-score-report-v1.1",
    value: loaded.value,
    path: fs.realpathSync(loaded.path),
  };
}
