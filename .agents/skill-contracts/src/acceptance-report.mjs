import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";

import { assertValid } from "./errors.mjs";
import {
  assertOnlyKeys,
  collectDuplicateIssues,
  findSecretViolations,
  readJsonFile,
  validateContractSchema,
} from "./shared.mjs";

function acceptanceSchemaName(schemaVersion) {
  return schemaVersion === "1.1"
    ? "v1.1/acceptance-report.schema.json"
    : "acceptance-report.schema.json";
}

export function deriveAcceptanceStatus(checks, scopeMatch) {
  if (
    checks.some(
      (check) =>
        check.required && ["fail", "not_checked"].includes(check.status),
    )
  ) {
    return "failed";
  }
  if (scopeMatch && scopeMatch.status !== "in_scope") {
    return "conditional";
  }
  if (
    checks.some(
      (check) =>
        (check.required && check.status === "warn") ||
        (!check.required && ["warn", "fail", "not_checked"].includes(check.status)),
    )
  ) {
    return "conditional";
  }
  return "passed";
}

function findProfileAndValidator(capability, profileId, validatorId, issues) {
  const profileReference = capability.manifest.acceptanceProfiles.find(
    (candidate) => candidate.id === profileId,
  );
  if (!profileReference) {
    issues.push(`unknown acceptance profile ${profileId}`);
  }
  const validator = capability.manifest.validators.find(
    (candidate) => candidate.id === validatorId,
  );
  if (!validator) {
    issues.push(`unknown validator ${validatorId}`);
  }
  if (profileReference && profileReference.validator !== validatorId) {
    issues.push(
      `acceptance profile ${profileReference.id} must use validator ${profileReference.validator}`,
    );
  }
  const profile =
    capability.manifest.schemaVersion === "1.1" && profileReference
      ? capability.acceptanceProfileDefinitions.get(profileReference.id)
      : profileReference;
  return { profile, profileReference, validator };
}

function validateEvidenceRef(reference, resultPackage, label, issues) {
  if (reference.kind === "input") {
    if (!resultPackage.inputs.some((item) => item.id === reference.id)) {
      issues.push(`${label} references unknown input ${reference.id}`);
    }
    return;
  }
  if (reference.kind === "artifact") {
    if (!resultPackage.artifacts.some((item) => item.id === reference.id)) {
      issues.push(`${label} references unknown artifact ${reference.id}`);
    }
    return;
  }
  if (reference.kind === "session-event") {
    if (reference.id !== resultPackage.executionRef.sessionId) {
      issues.push(`${label} session-event id must equal the result package sessionId`);
    }
    const range = resultPackage.executionRef.eventRange;
    if (reference.sequence < range.from || reference.sequence > range.to) {
      issues.push(`${label} session-event sequence is outside the result package event range`);
    }
  }
}

export function validateAcceptanceReportValue(report, capability, resultContract) {
  const schemaIssues = validateContractSchema(
    acceptanceSchemaName(report?.schemaVersion),
    report,
  );
  const issues = [...schemaIssues, ...findSecretViolations(report, "acceptanceReport")];
  if (schemaIssues.length > 0) {
    return issues;
  }

  const manifest = capability.manifest;
  const resultPackage = resultContract.value;
  if (report.schemaVersion !== manifest.schemaVersion) {
    issues.push("acceptance report schemaVersion must match the capability contract version");
  }
  if (report.schemaVersion !== resultPackage.schemaVersion) {
    issues.push("acceptance report schemaVersion must match the result package schemaVersion");
  }
  if (
    report.capability.id !== manifest.id ||
    report.capability.version !== manifest.version
  ) {
    issues.push(`capability must equal ${manifest.id}@${manifest.version}`);
  }
  if (
    resultPackage.capability.id !== report.capability.id ||
    resultPackage.capability.version !== report.capability.version
  ) {
    issues.push("report capability must match the result package capability");
  }
  if (report.resultPackage.packageId !== resultPackage.packageId) {
    issues.push("resultPackage.packageId does not match the validated result package");
  }
  if (report.resultPackage.sha256 !== resultContract.sourceDigest) {
    issues.push("resultPackage.sha256 does not match the result package file bytes");
  }

  const { profile, profileReference, validator } = findProfileAndValidator(
    capability,
    report.profile.id,
    report.validator.id,
    issues,
  );
  if (profile && profile.version !== report.profile.version) {
    issues.push(`profile version must equal ${profile.version}`);
  }
  if (
    report.schemaVersion === "1.1" &&
    profileReference?.definition &&
    report.profile.sha256 !== profileReference.definition.sha256
  ) {
    issues.push("profile sha256 must match the declared profile definition");
  }
  if (validator && validator.version !== report.validator.version) {
    issues.push(`validator version must equal ${validator.version}`);
  }
  if (
    report.profile.id !== resultPackage.acceptanceProfile.id ||
    report.profile.version !== resultPackage.acceptanceProfile.version
  ) {
    issues.push("report profile must match the result package acceptanceProfile");
  }
  if (
    report.schemaVersion === "1.1" &&
    report.profile.sha256 !== resultPackage.acceptanceProfile.sha256
  ) {
    issues.push("report profile sha256 must match the result package acceptanceProfile");
  }

  if (Date.parse(report.generatedAt) < Date.parse(resultPackage.createdAt)) {
    issues.push("generatedAt must not be earlier than result package createdAt");
  }

  issues.push(...collectDuplicateIssues(report.checks, (check) => check.id, "report check id"));
  if (profile) {
    const expectedChecks = new Map(profile.checks.map((check) => [check.id, check]));
    for (const expected of profile.checks) {
      if (!report.checks.some((check) => check.id === expected.id)) {
        issues.push(`missing profile check: ${expected.id}`);
      }
    }
    for (const check of report.checks) {
      const expected = expectedChecks.get(check.id);
      if (!expected) {
        issues.push(`unknown report check: ${check.id}`);
        continue;
      }
      if (check.required !== expected.required) {
        issues.push(`check ${check.id}.required must be injected from the profile`);
      }
      if (check.category !== expected.category) {
        issues.push(`check ${check.id}.category must be injected from the profile`);
      }
      if (report.schemaVersion === "1.1") {
        if (check.criterion !== expected.criterion) {
          issues.push(`check ${check.id}.criterion must be injected from the profile`);
        }
        if (!isDeepStrictEqual(check.threshold, expected.threshold)) {
          issues.push(`check ${check.id}.threshold must be injected from the profile`);
        }
        if (check.unit !== expected.unit) {
          issues.push(`check ${check.id}.unit must be injected from the profile`);
        }
      }
    }
  }

  if (report.schemaVersion === "1.1") {
    report.scopeMatch.evidenceRefs.forEach((reference, index) =>
      validateEvidenceRef(
        reference,
        resultPackage,
        `scopeMatch.evidenceRefs[${index}]`,
        issues,
      ),
    );
    if (report.scopeMatch.status !== "indeterminate" && report.scopeMatch.evidenceRefs.length === 0) {
      issues.push("scopeMatch must cite evidence when its status is determined");
    }
  }

  for (const check of report.checks) {
    if (
      check.status !== "pass" &&
      (typeof check.nextAction !== "string" || check.nextAction.length === 0)
    ) {
      issues.push(`check ${check.id} must include nextAction when it does not pass`);
    }
    if (check.status !== "not_checked" && check.evidenceRefs.length === 0) {
      issues.push(`check ${check.id} must cite evidence when it was evaluated`);
    }
    check.evidenceRefs.forEach((reference, index) =>
      validateEvidenceRef(
        reference,
        resultPackage,
        `check ${check.id}.evidenceRefs[${index}]`,
        issues,
      ),
    );
  }

  const expectedStatus = deriveAcceptanceStatus(report.checks, report.scopeMatch);
  if (report.status !== expectedStatus) {
    issues.push(
      `status must be derived as ${expectedStatus}; received ${String(report.status)}`,
    );
  }
  return issues;
}

export function buildAcceptanceReport(options) {
  const schemaVersion = options?.capability?.manifest?.schemaVersion;
  if (schemaVersion === "1.1") {
    return buildAcceptanceReportV11(options);
  }
  return buildAcceptanceReportV10(options);
}

function buildAcceptanceReportV10(options) {
  assertOnlyKeys(
    options,
    [
      "capability",
      "resultPackage",
      "validatorId",
      "profileId",
      "reportId",
      "generatedAt",
      "observations",
      "limitations",
      "statement",
    ],
    "acceptance report builder options",
  );
  const {
    capability,
    resultPackage: resultContract,
    validatorId,
    profileId,
    reportId,
    generatedAt = new Date().toISOString(),
    observations,
    limitations = [],
    statement,
  } = options;
  const issues = [];
  const { profile, validator } = findProfileAndValidator(
    capability,
    profileId,
    validatorId,
    issues,
  );
  if (!profile || !validator) {
    assertValid("acceptance report observations", issues);
  }
  if (
    resultContract.value.acceptanceProfile.id !== profile.id ||
    resultContract.value.acceptanceProfile.version !== profile.version
  ) {
    issues.push("builder profile must match the result package acceptanceProfile");
  }
  if (!Array.isArray(observations)) {
    issues.push("observations must be an array");
    assertValid("acceptance report observations", issues);
  }

  const allowedObservationKeys = [
    "id",
    "status",
    "criterion",
    "observed",
    "threshold",
    "unit",
    "evidenceRefs",
    "nextAction",
  ];
  for (const [index, observation] of observations.entries()) {
    try {
      assertOnlyKeys(
        observation,
        allowedObservationKeys,
        `observations[${index}]`,
      );
    } catch (error) {
      issues.push(...(error.issues ?? [error.message]));
    }
  }
  issues.push(
    ...collectDuplicateIssues(observations, (item) => item.id, "observation check id"),
  );
  const observationsById = new Map(observations.map((item) => [item.id, item]));
  const profileIds = new Set(profile.checks.map((item) => item.id));
  for (const observation of observations) {
    if (!profileIds.has(observation.id)) {
      issues.push(`unknown observation check: ${String(observation.id)}`);
    }
  }
  for (const expected of profile.checks) {
    if (!observationsById.has(expected.id)) {
      issues.push(`missing observation for profile check: ${expected.id}`);
    }
  }
  assertValid("acceptance report observations", issues);

  const checks = profile.checks.map((definition) => ({
    ...observationsById.get(definition.id),
    category: definition.category,
    required: definition.required,
  }));
  const report = {
    schemaVersion: "1.0",
    reportId,
    capability: {
      id: capability.manifest.id,
      version: capability.manifest.version,
    },
    generatedAt,
    resultPackage: {
      packageId: resultContract.value.packageId,
      sha256: resultContract.sourceDigest,
    },
    validator: { id: validator.id, version: validator.version },
    profile: { id: profile.id, version: profile.version },
    status: deriveAcceptanceStatus(checks),
    checks,
    limitations,
    statement,
  };
  const validationIssues = validateAcceptanceReportValue(
    report,
    capability,
    resultContract,
  );
  assertValid(`acceptance report ${reportId ?? "<missing reportId>"}`, validationIssues);
  return report;
}

function buildAcceptanceReportV11(options) {
  assertOnlyKeys(
    options,
    [
      "capability",
      "resultPackage",
      "validatorId",
      "profileId",
      "reportId",
      "generatedAt",
      "scopeMatch",
      "observations",
      "limitations",
      "statement",
    ],
    "acceptance report builder options",
  );
  const {
    capability,
    resultPackage: resultContract,
    validatorId,
    profileId,
    reportId,
    generatedAt = new Date().toISOString(),
    scopeMatch,
    observations,
    limitations = [],
    statement,
  } = options;
  const issues = [];
  const { profile, profileReference, validator } = findProfileAndValidator(
    capability,
    profileId,
    validatorId,
    issues,
  );
  if (!profile || !profileReference || !validator) {
    assertValid("acceptance report observations", issues);
  }
  if (
    resultContract.value.acceptanceProfile.id !== profile.id ||
    resultContract.value.acceptanceProfile.version !== profile.version ||
    resultContract.value.acceptanceProfile.sha256 !== profile.sha256
  ) {
    issues.push("builder profile must match the result package acceptanceProfile");
  }
  if (!Array.isArray(observations)) {
    issues.push("observations must be an array");
    assertValid("acceptance report observations", issues);
  }
  try {
    assertOnlyKeys(scopeMatch, ["status", "statement", "evidenceRefs"], "scopeMatch");
  } catch (error) {
    issues.push(...(error.issues ?? [error.message]));
  }

  const allowedObservationKeys = [
    "id",
    "status",
    "observed",
    "evidenceRefs",
    "nextAction",
  ];
  for (const [index, observation] of observations.entries()) {
    try {
      assertOnlyKeys(observation, allowedObservationKeys, `observations[${index}]`);
    } catch (error) {
      issues.push(...(error.issues ?? [error.message]));
    }
  }
  issues.push(
    ...collectDuplicateIssues(observations, (item) => item.id, "observation check id"),
  );
  const observationsById = new Map(observations.map((item) => [item.id, item]));
  const profileIds = new Set(profile.checks.map((item) => item.id));
  for (const observation of observations) {
    if (!profileIds.has(observation.id)) {
      issues.push(`unknown observation check: ${String(observation.id)}`);
    }
  }
  for (const expected of profile.checks) {
    if (!observationsById.has(expected.id)) {
      issues.push(`missing observation for profile check: ${expected.id}`);
    }
  }
  assertValid("acceptance report observations", issues);

  const checks = profile.checks.map((definition) => ({
    ...observationsById.get(definition.id),
    category: definition.category,
    required: definition.required,
    criterion: definition.criterion,
    ...(Object.hasOwn(definition, "threshold")
      ? { threshold: definition.threshold }
      : {}),
    ...(Object.hasOwn(definition, "unit") ? { unit: definition.unit } : {}),
  }));
  const report = {
    schemaVersion: "1.1",
    reportId,
    capability: {
      id: capability.manifest.id,
      version: capability.manifest.version,
    },
    generatedAt,
    resultPackage: {
      packageId: resultContract.value.packageId,
      sha256: resultContract.sourceDigest,
    },
    validator: { id: validator.id, version: validator.version },
    profile: { id: profile.id, version: profile.version, sha256: profile.sha256 },
    scopeMatch,
    status: deriveAcceptanceStatus(checks, scopeMatch),
    checks,
    limitations,
    statement,
  };
  const validationIssues = validateAcceptanceReportValue(report, capability, resultContract);
  assertValid(`acceptance report ${reportId ?? "<missing reportId>"}`, validationIssues);
  return report;
}

export function loadAcceptanceReport(reportPath, capability, resultContract) {
  const loaded = readJsonFile(reportPath);
  const issues = validateAcceptanceReportValue(
    loaded.value,
    capability,
    resultContract,
  );
  assertValid(`acceptance report ${loaded.path}`, issues);
  return {
    kind:
      loaded.value.schemaVersion === "1.1"
        ? "openquantum-acceptance-report-v1.1"
        : "openquantum-acceptance-report-v1",
    value: loaded.value,
    path: fs.realpathSync(loaded.path),
  };
}
