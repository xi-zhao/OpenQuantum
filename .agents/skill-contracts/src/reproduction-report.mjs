import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { assertValid } from "./errors.mjs";
import {
  CONTRACT_ROOT,
  assertOnlyKeys,
  collectDuplicateIssues,
  compileSchemaFile,
  findSecretViolations,
  formatAjvErrors,
  readJsonFile,
} from "./shared.mjs";

const reproductionSchema = compileSchemaFile(
  path.join(CONTRACT_ROOT, "schemas", "v1.1", "reproduction-report.schema.json"),
);

function schemaIssuesFor(value) {
  return reproductionSchema.validate(value)
    ? []
    : formatAjvErrors(reproductionSchema.validate.errors);
}

function resolveProfile(capability, profileId, issues) {
  const profile = capability.reproductionProfileDefinitions?.get(profileId);
  if (!profile) {
    issues.push(`unknown reproduction profile definition ${String(profileId)}`);
  }
  return profile;
}

function validateDeterminedScopeEvidence(scope, label, issues) {
  if (
    scope.status !== "indeterminate" &&
    (!Array.isArray(scope.evidenceRefs) || scope.evidenceRefs.length === 0)
  ) {
    issues.push(`${label} ${scope.status} status must cite evidence`);
  }
}

function validateDistinctExecutions(
  sourceResultContract,
  reproducedResultContract,
  issues,
) {
  const source = sourceResultContract.value;
  const reproduced = reproducedResultContract.value;
  if (source.packageId === reproduced.packageId) {
    issues.push("source and reproduced result package ids must be different");
  }
  if (sourceResultContract.sourceDigest === reproducedResultContract.sourceDigest) {
    issues.push("source and reproduced result package digests must be different");
  }
  if (source.executionRef.sessionId === reproduced.executionRef.sessionId) {
    issues.push("source and reproduced execution sessionIds must be different");
  }
}

function validateIndependenceEvidence(
  check,
  sourceResultContract,
  reproducedResultContract,
  issues,
) {
  const requiredPackages = [sourceResultContract, reproducedResultContract];
  for (const contract of requiredPackages) {
    const resultPackage = contract.value;
    const hasSessionEvidence = check?.evidenceRefs?.some(
      (reference) =>
        reference.packageId === resultPackage.packageId &&
        reference.kind === "session-event",
    );
    if (!hasSessionEvidence) {
      issues.push(
        `independence check must cite session-event evidence for ${resultPackage.packageId}`,
      );
    }
  }
  if (check?.status !== "pass") {
    issues.push(
      "independence check status must be derived as pass from distinct packages, digests, sessions, and both event traces",
    );
  }
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

export function deriveReproductionStatus(scope, checks) {
  return scope.status === "in_scope" &&
    checks.every((check) => !check.required || check.status === "pass")
    ? "reproduced"
    : "not_reproduced";
}

export function validateReproductionReportValue(
  report,
  capability,
  sourceResultContract,
  reproducedResultContract,
) {
  const schemaIssues = schemaIssuesFor(report);
  const issues = [
    ...schemaIssues,
    ...findSecretViolations(report, "reproductionReport"),
  ];
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

  const source = sourceResultContract.value;
  const reproduced = reproducedResultContract.value;
  validateDistinctExecutions(sourceResultContract, reproducedResultContract, issues);
  for (const resultPackage of [source, reproduced]) {
    if (
      resultPackage.capability.id !== report.capability.id ||
      resultPackage.capability.version !== report.capability.version
    ) {
      issues.push(`result package ${resultPackage.packageId} capability must match the report capability`);
    }
    if (Date.parse(report.generatedAt) < Date.parse(resultPackage.createdAt)) {
      issues.push(`generatedAt must not be earlier than result package ${resultPackage.packageId}`);
    }
  }
  if (
    source.acceptanceProfile.id !== reproduced.acceptanceProfile.id ||
    source.acceptanceProfile.version !== reproduced.acceptanceProfile.version
  ) {
    issues.push("source and reproduced result package profiles must match");
  }
  if (
    report.sourceResultPackage.packageId !== source.packageId ||
    report.sourceResultPackage.sha256 !== sourceResultContract.sourceDigest
  ) {
    issues.push("sourceResultPackage must reference the validated source package and digest");
  }
  if (
    report.reproducedResultPackage.packageId !== reproduced.packageId ||
    report.reproducedResultPackage.sha256 !== reproducedResultContract.sourceDigest
  ) {
    issues.push("reproducedResultPackage must reference the validated reproduced package and digest");
  }

  const profile = resolveProfile(capability, report.profile.id, issues);
  if (profile) {
    if (report.profile.version !== profile.version) {
      issues.push(`profile version must equal ${profile.version}`);
    }
    if (report.profile.sha256 !== profile.sha256) {
      issues.push("profile sha256 must match the loaded profile definition");
    }
  }

  const packages = new Map([
    [source.packageId, sourceResultContract],
    [reproduced.packageId, reproducedResultContract],
  ]);
  validateDeterminedScopeEvidence(report.scope, "reproduction scope", issues);
  report.scope.evidenceRefs.forEach((reference, index) =>
    validateEvidenceRef(reference, packages, `scope.evidenceRefs[${index}]`, issues),
  );
  issues.push(
    ...collectDuplicateIssues(report.checks, (item) => item.id, "reproduction check id"),
  );
  if (profile) {
    const definitions = new Map(profile.checks.map((item) => [item.id, item]));
    for (const definition of profile.checks) {
      if (!report.checks.some((item) => item.id === definition.id)) {
        issues.push(`missing reproduction check: ${definition.id}`);
      }
    }
    for (const check of report.checks) {
      const definition = definitions.get(check.id);
      if (!definition) {
        issues.push(`unknown reproduction check: ${check.id}`);
        continue;
      }
      for (const field of ["category", "required", "criterion", "threshold", "unit"]) {
        if (!isDeepStrictEqual(check[field], definition[field])) {
          issues.push(`check ${check.id}.${field} must be injected from the profile`);
        }
      }
    }
    const independence = report.checks.find((item) => item.id === profile.independenceCheck);
    if (!independence?.required) {
      issues.push("profile independenceCheck must resolve to a required report check");
    }
    validateIndependenceEvidence(
      independence,
      sourceResultContract,
      reproducedResultContract,
      issues,
    );
  }

  for (const check of report.checks) {
    if (check.status !== "pass" && !check.nextAction) {
      issues.push(`check ${check.id} must include nextAction when it does not pass`);
    }
    if (check.status !== "not_checked" && check.evidenceRefs.length === 0) {
      issues.push(`check ${check.id} must cite evidence when it was evaluated`);
    }
    check.evidenceRefs.forEach((reference, index) =>
      validateEvidenceRef(
        reference,
        packages,
        `check ${check.id}.evidenceRefs[${index}]`,
        issues,
      ),
    );
  }

  const status = deriveReproductionStatus(report.scope, report.checks);
  if (report.status !== status) {
    issues.push(`status must be derived as ${status}; received ${report.status}`);
  }
  for (const check of report.checks) {
    if (!check.required && check.status !== "pass") {
      const limitation = `Optional reproduction check ${check.id} did not pass.`;
      if (!report.limitations.includes(limitation)) {
        issues.push(`limitations must include: ${limitation}`);
      }
    }
  }
  return issues;
}

export function buildReproductionReport(options) {
  assertOnlyKeys(
    options,
    [
      "capability",
      "sourceResultPackage",
      "reproducedResultPackage",
      "profileId",
      "reportId",
      "generatedAt",
      "scope",
      "observations",
      "limitations",
      "statement",
    ],
    "reproduction report builder options",
  );
  const {
    capability,
    sourceResultPackage,
    reproducedResultPackage,
    profileId,
    reportId,
    generatedAt = new Date().toISOString(),
    scope,
    observations,
    limitations = [],
    statement,
  } = options;
  const issues = [];
  const profile = resolveProfile(capability, profileId, issues);
  validateDistinctExecutions(sourceResultPackage, reproducedResultPackage, issues);
  try {
    assertOnlyKeys(scope, ["status", "evidenceRefs", "statement"], "reproduction scope");
  } catch (error) {
    issues.push(...(error.issues ?? [error.message]));
  }
  if (!Array.isArray(observations)) {
    issues.push("observations must be an array");
  }
  for (const [index, observation] of (observations ?? []).entries()) {
    try {
      const isIndependenceCheck = observation.id === profile?.independenceCheck;
      assertOnlyKeys(
        observation,
        isIndependenceCheck
          ? ["id", "observed", "evidenceRefs"]
          : ["id", "status", "observed", "evidenceRefs", "nextAction"],
        `observations[${index}]`,
      );
    } catch (error) {
      issues.push(...(error.issues ?? [error.message]));
    }
  }
  issues.push(
    ...collectDuplicateIssues(observations ?? [], (item) => item.id, "reproduction observation id"),
  );
  const observationsById = new Map((observations ?? []).map((item) => [item.id, item]));
  for (const definition of profile?.checks ?? []) {
    if (!observationsById.has(definition.id)) {
      issues.push(`missing observation for reproduction check: ${definition.id}`);
    }
  }
  for (const observation of observations ?? []) {
    if (!profile?.checks.some((item) => item.id === observation.id)) {
      issues.push(`unknown reproduction check observation: ${String(observation.id)}`);
    }
  }
  if (scope && typeof scope === "object") {
    validateDeterminedScopeEvidence(scope, "reproduction scope", issues);
  }
  const independenceObservation = observationsById.get(profile?.independenceCheck);
  if (independenceObservation) {
    validateIndependenceEvidence(
      { ...independenceObservation, status: "pass" },
      sourceResultPackage,
      reproducedResultPackage,
      issues,
    );
  }
  assertValid("reproduction report observations", issues);

  const checks = profile.checks.map((definition) => {
    const observation = observationsById.get(definition.id);
    return {
      ...observation,
      ...(definition.id === profile.independenceCheck ? { status: "pass" } : {}),
      category: definition.category,
      required: definition.required,
      criterion: definition.criterion,
      ...(definition.threshold === undefined
        ? {}
        : { threshold: structuredClone(definition.threshold) }),
      ...(definition.unit === undefined ? {} : { unit: definition.unit }),
    };
  });
  const generatedLimitations = checks
    .filter((check) => !check.required && check.status !== "pass")
    .map((check) => `Optional reproduction check ${check.id} did not pass.`);
  const report = {
    schemaVersion: "1.1",
    reportId,
    capability: {
      id: capability.manifest.id,
      version: capability.manifest.version,
    },
    generatedAt,
    sourceResultPackage: {
      packageId: sourceResultPackage.value.packageId,
      sha256: sourceResultPackage.sourceDigest,
    },
    reproducedResultPackage: {
      packageId: reproducedResultPackage.value.packageId,
      sha256: reproducedResultPackage.sourceDigest,
    },
    profile: { id: profile.id, version: profile.version, sha256: profile.sha256 },
    status: deriveReproductionStatus(scope, checks),
    scope: structuredClone(scope),
    checks,
    limitations: [...new Set([...limitations, ...generatedLimitations])],
    statement,
  };
  assertValid(
    `reproduction report ${reportId ?? "<missing reportId>"}`,
    validateReproductionReportValue(
      report,
      capability,
      sourceResultPackage,
      reproducedResultPackage,
    ),
  );
  return report;
}

export function loadReproductionReport(
  reportPath,
  capability,
  sourceResultContract,
  reproducedResultContract,
) {
  const loaded = readJsonFile(reportPath);
  assertValid(
    `reproduction report ${loaded.path}`,
    validateReproductionReportValue(
      loaded.value,
      capability,
      sourceResultContract,
      reproducedResultContract,
    ),
  );
  return {
    kind: "openquantum-reproduction-report-v1.1",
    value: loaded.value,
    path: fs.realpathSync(loaded.path),
  };
}
