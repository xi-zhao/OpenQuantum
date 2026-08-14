import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { assertValid } from "./errors.mjs";
import {
  collectDuplicateIssues,
  digestFile,
  findSecretViolations,
  inspectContainedFile,
  readJsonFile,
  readYamlFile,
  validateContractSchema,
} from "./shared.mjs";

export const RESULT_COMMIT_MAX_BYTES = 64 * 1024;

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function inspectCommitFile(root, reference, label, issues) {
  const inspected = inspectContainedFile(root, reference.path, `${label}.path`);
  issues.push(...inspected.issues);
  if (!inspected.path || !inspected.stats?.isFile()) {
    return;
  }
  if (inspected.stats.size !== reference.bytes) {
    issues.push(`${label}.bytes must equal ${inspected.stats.size}`);
  }
  if (digestFile(inspected.path) !== reference.sha256) {
    issues.push(`${label}.sha256 does not match file content`);
  }
}

function addMismatch(issues, label, expected, actual) {
  if (actual !== expected) {
    issues.push(`${label} must match the trusted ${label} (${String(expected)})`);
  }
}

function resolveTrustedRoot(context, issues) {
  const candidate = context.artifactRoot ?? context.resultPackage?.root;
  if (typeof candidate !== "string" || candidate.length === 0) {
    issues.push("trustedContext.artifactRoot or resultPackage.root is required");
    return undefined;
  }
  try {
    return fs.realpathSync(path.resolve(candidate));
  } catch (error) {
    issues.push(
      `trustedContext.artifactRoot cannot be resolved: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }
}

function inspectTrustedFile(root, absolutePath, label, issues) {
  if (typeof absolutePath !== "string" || absolutePath.length === 0) {
    issues.push(`${label} is required in the trusted context`);
    return undefined;
  }

  let resolvedPath;
  try {
    resolvedPath = fs.realpathSync(path.resolve(absolutePath));
  } catch (error) {
    issues.push(
      `${label} cannot be resolved: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }

  const relativePath = toPosixPath(path.relative(root, resolvedPath));
  const inspected = inspectContainedFile(root, relativePath, label);
  issues.push(...inspected.issues);
  if (!inspected.path || !inspected.stats?.isFile()) {
    return undefined;
  }
  return {
    path: relativePath,
    bytes: inspected.stats.size,
    sha256: digestFile(inspected.path),
    absolutePath: inspected.path,
  };
}

function validateLoadedValue(filePath, value, label, reader, issues) {
  let current;
  try {
    current = reader(filePath).value;
  } catch (error) {
    issues.push(
      `${label} cannot be read: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }
  if (!isDeepStrictEqual(current, value)) {
    issues.push(`${label}.value must match its currently loaded file`);
  }
  return current;
}

function isLoadedContract(contract, kinds) {
  return (
    contract !== null &&
    typeof contract === "object" &&
    kinds.includes(contract.kind) &&
    contract.value !== null &&
    typeof contract.value === "object" &&
    typeof contract.path === "string"
  );
}

function validateTrustedContext(context, issues) {
  if (context === null || typeof context !== "object" || Array.isArray(context)) {
    issues.push(
      "trustedContext with loaded capability and resultPackage is required",
    );
    return undefined;
  }
  const {
    capability,
    resultPackage,
    acceptanceReport,
    scoreReport,
    reproductionReport,
  } = context;
  if (
    capability === null ||
    typeof capability !== "object" ||
    !["openquantum-capability-v1", "openquantum-capability-v1.1"].includes(
      capability.kind,
    ) ||
    !capability.manifest ||
    typeof capability.manifestPath !== "string"
  ) {
    issues.push("trustedContext.capability must be a loaded Capability");
  }
  if (
    resultPackage === null ||
    typeof resultPackage !== "object" ||
    ![
      "openquantum-result-package-v1",
      "openquantum-result-package-v1.1",
    ].includes(resultPackage.kind) ||
    !resultPackage.value ||
    typeof resultPackage.path !== "string" ||
    typeof resultPackage.root !== "string" ||
    typeof resultPackage.sourceDigest !== "string"
  ) {
    issues.push("trustedContext.resultPackage must be a loaded Result Package");
  }
  if (
    acceptanceReport !== undefined &&
    !isLoadedContract(acceptanceReport, [
      "openquantum-acceptance-report-v1",
      "openquantum-acceptance-report-v1.1",
    ])
  ) {
    issues.push(
      "trustedContext.acceptanceReport must be a loaded Acceptance Report when provided",
    );
  }
  if (
    scoreReport !== undefined &&
    !isLoadedContract(scoreReport, ["openquantum-score-report-v1.1"])
  ) {
    issues.push(
      "trustedContext.scoreReport must be a loaded Score Report when provided",
    );
  }
  if (
    reproductionReport !== undefined &&
    !isLoadedContract(reproductionReport, [
      "openquantum-reproduction-report-v1.1",
    ])
  ) {
    issues.push(
      "trustedContext.reproductionReport must be a loaded Reproduction Report when provided",
    );
  }
  if (issues.length > 0) {
    return undefined;
  }

  const root = resolveTrustedRoot(context, issues);
  if (!root) {
    return undefined;
  }
  return {
    capability,
    resultPackage,
    acceptanceReport,
    scoreReport,
    reproductionReport,
    root,
  };
}

function validateCapabilityBinding(commit, trusted, issues) {
  const { capability, resultPackage } = trusted;
  const manifest =
    validateLoadedValue(
      capability.manifestPath,
      capability.manifest,
      "trusted Capability",
      readYamlFile,
      issues,
    ) ?? capability.manifest;
  addMismatch(
    issues,
    "capability.id",
    manifest.id,
    commit.capability.id,
  );
  addMismatch(
    issues,
    "capability.version",
    manifest.version,
    commit.capability.version,
  );
  addMismatch(
    issues,
    "capability.manifestSha256",
    digestFile(capability.manifestPath),
    commit.capability.manifestSha256,
  );
  if (
    resultPackage.value.capability.id !== manifest.id ||
    resultPackage.value.capability.version !== manifest.version
  ) {
    issues.push(
      "trusted Result Package capability must match the trusted Capability",
    );
  }
}

function validateResultPackageBinding(commit, trusted, issues) {
  const { resultPackage, root } = trusted;
  const expectedFile = inspectTrustedFile(
    root,
    resultPackage.path,
    "trustedContext.resultPackage.path",
    issues,
  );
  addMismatch(
    issues,
    "createdAt",
    resultPackage.value.createdAt,
    commit.createdAt,
  );
  addMismatch(
    issues,
    "resultPackage.packageId",
    resultPackage.value.packageId,
    commit.resultPackage.packageId,
  );
  if (!expectedFile) {
    return;
  }
  validateLoadedValue(
    expectedFile.absolutePath,
    resultPackage.value,
    "trusted Result Package",
    readJsonFile,
    issues,
  );
  if (expectedFile.sha256 !== resultPackage.sourceDigest) {
    issues.push(
      "trusted Result Package sourceDigest does not match its current file bytes",
    );
  }
  addMismatch(
    issues,
    "resultPackage.path",
    expectedFile.path,
    commit.resultPackage.path,
  );
  addMismatch(
    issues,
    "resultPackage.bytes",
    expectedFile.bytes,
    commit.resultPackage.bytes,
  );
  addMismatch(
    issues,
    "resultPackage.sha256",
    resultPackage.sourceDigest,
    commit.resultPackage.sha256,
  );
}

function validateArtifactBinding(commit, trusted, issues) {
  const { resultPackage, root } = trusted;
  const expectedArtifacts = resultPackage.value.artifacts;
  if (commit.artifacts.length !== expectedArtifacts.length) {
    issues.push(
      `artifacts must exactly cover the trusted Result Package artifacts (${expectedArtifacts.length})`,
    );
  }

  const commitById = new Map(commit.artifacts.map((artifact) => [artifact.id, artifact]));
  const expectedIds = new Set(expectedArtifacts.map((artifact) => artifact.id));
  for (const artifact of commit.artifacts) {
    if (!expectedIds.has(artifact.id)) {
      issues.push(`artifacts contains unknown trusted Result Package artifact ${artifact.id}`);
    }
  }

  for (const expected of expectedArtifacts) {
    const actual = commitById.get(expected.id);
    if (!actual) {
      issues.push(`artifacts is missing trusted Result Package artifact ${expected.id}`);
      continue;
    }
    const inspected = inspectContainedFile(
      resultPackage.root,
      expected.path,
      `trusted Result Package artifact ${expected.id}.path`,
    );
    issues.push(...inspected.issues);
    const expectedPath = inspected.path
      ? toPosixPath(path.relative(root, inspected.path))
      : undefined;
    if (expectedPath !== undefined) {
      const contained = inspectContainedFile(
        root,
        expectedPath,
        `trusted Result Package artifact ${expected.id}.commitPath`,
      );
      issues.push(...contained.issues);
      if (!contained.path) {
        continue;
      }
      addMismatch(issues, `artifact ${expected.id}.path`, expectedPath, actual.path);
    }
    addMismatch(issues, `artifact ${expected.id}.type`, expected.type, actual.type);
    addMismatch(
      issues,
      `artifact ${expected.id}.mediaType`,
      expected.mediaType,
      actual.mediaType,
    );
    addMismatch(issues, `artifact ${expected.id}.bytes`, expected.bytes, actual.bytes);
    addMismatch(issues, `artifact ${expected.id}.sha256`, expected.sha256, actual.sha256);
  }
}

function validateAcceptanceBinding(commit, trusted, issues) {
  const { acceptanceReport, capability, resultPackage, root } = trusted;
  if (!acceptanceReport) {
    if (commit.acceptanceReport) {
      issues.push(
        "acceptanceReport must be absent without a trusted Acceptance Report",
      );
    }
    return;
  }
  if (!commit.acceptanceReport) {
    issues.push(
      "acceptanceReport must reference the trusted Acceptance Report when provided",
    );
    return;
  }

  const report = acceptanceReport.value;
  if (
    report.capability.id !== capability.manifest.id ||
    report.capability.version !== capability.manifest.version
  ) {
    issues.push(
      "trusted Acceptance Report capability must match the trusted Capability",
    );
  }
  if (
    report.resultPackage.packageId !== resultPackage.value.packageId ||
    report.resultPackage.sha256 !== resultPackage.sourceDigest
  ) {
    issues.push(
      "trusted Acceptance Report must reference the trusted Result Package",
    );
  }

  const expectedFile = inspectTrustedFile(
    root,
    acceptanceReport.path,
    "trustedContext.acceptanceReport.path",
    issues,
  );
  if (expectedFile) {
    validateLoadedValue(
      expectedFile.absolutePath,
      report,
      "trusted Acceptance Report",
      readJsonFile,
      issues,
    );
  }
  addMismatch(
    issues,
    "acceptanceReport.reportId",
    report.reportId,
    commit.acceptanceReport.reportId,
  );
  addMismatch(
    issues,
    "acceptanceReport.status",
    report.status,
    commit.acceptanceReport.status,
  );
  if (!expectedFile) {
    return;
  }
  addMismatch(
    issues,
    "acceptanceReport.path",
    expectedFile.path,
    commit.acceptanceReport.path,
  );
  addMismatch(
    issues,
    "acceptanceReport.bytes",
    expectedFile.bytes,
    commit.acceptanceReport.bytes,
  );
  addMismatch(
    issues,
    "acceptanceReport.sha256",
    expectedFile.sha256,
    commit.acceptanceReport.sha256,
  );
}

function reportReferencesResultPackage(report, resultPackage) {
  return report.resultPackages?.some(
    (reference) =>
      reference.packageId === resultPackage.value.packageId &&
      reference.sha256 === resultPackage.sourceDigest,
  );
}

function reproductionReferencesResultPackage(report, resultPackage) {
  return [report.sourceResultPackage, report.reproducedResultPackage].some(
    (reference) =>
      reference?.packageId === resultPackage.value.packageId &&
      reference?.sha256 === resultPackage.sourceDigest,
  );
}

function validateOptionalReportBinding({
  commitReference,
  trustedReport,
  label,
  capability,
  resultPackage,
  root,
  statuses,
  referencesResultPackage,
  issues,
}) {
  if (!trustedReport) {
    if (commitReference) {
      issues.push(`${label} must be absent without a trusted ${label}`);
    }
    return;
  }
  if (!commitReference) {
    issues.push(`${label} must reference the trusted ${label} when provided`);
    return;
  }

  const report = trustedReport.value;
  if (
    report.capability?.id !== capability.manifest.id ||
    report.capability?.version !== capability.manifest.version
  ) {
    issues.push(`trusted ${label} capability must match the trusted Capability`);
  }
  if (!referencesResultPackage(report, resultPackage)) {
    issues.push(`trusted ${label} must reference the trusted Result Package`);
  }
  if (!statuses.includes(report.status)) {
    issues.push(`trusted ${label}.status is unsupported: ${String(report.status)}`);
  }

  const expectedFile = inspectTrustedFile(
    root,
    trustedReport.path,
    `trustedContext.${label}.path`,
    issues,
  );
  if (expectedFile) {
    validateLoadedValue(
      expectedFile.absolutePath,
      report,
      `trusted ${label}`,
      readJsonFile,
      issues,
    );
  }
  addMismatch(
    issues,
    `${label}.reportId`,
    report.reportId,
    commitReference.reportId,
  );
  addMismatch(
    issues,
    `${label}.status`,
    report.status,
    commitReference.status,
  );
  if (!expectedFile) {
    return;
  }
  for (const field of ["path", "bytes", "sha256"]) {
    addMismatch(
      issues,
      `${label}.${field}`,
      expectedFile[field],
      commitReference[field],
    );
  }
}

function validateScoreBinding(commit, trusted, issues) {
  validateOptionalReportBinding({
    commitReference: commit.scoreReport,
    trustedReport: trusted.scoreReport,
    label: "scoreReport",
    capability: trusted.capability,
    resultPackage: trusted.resultPackage,
    root: trusted.root,
    statuses: ["invalid", "valid"],
    referencesResultPackage: reportReferencesResultPackage,
    issues,
  });
}

function validateReproductionBinding(commit, trusted, issues) {
  validateOptionalReportBinding({
    commitReference: commit.reproductionReport,
    trustedReport: trusted.reproductionReport,
    label: "reproductionReport",
    capability: trusted.capability,
    resultPackage: trusted.resultPackage,
    root: trusted.root,
    statuses: ["reproduced", "not_reproduced"],
    referencesResultPackage: reproductionReferencesResultPackage,
    issues,
  });
}

export function validateResultCommitValue(commit, trustedContext) {
  const schemaIssues = validateContractSchema(
    "result-commit-envelope.schema.json",
    commit,
  );
  const issues = [...schemaIssues, ...findSecretViolations(commit, "resultCommit")];
  if (schemaIssues.length > 0) {
    return issues;
  }

  const serializedBytes = Buffer.byteLength(JSON.stringify(commit), "utf8");
  if (serializedBytes > RESULT_COMMIT_MAX_BYTES) {
    issues.push(
      `result commit exceeds ${RESULT_COMMIT_MAX_BYTES} serialized bytes (${serializedBytes})`,
    );
  }

  issues.push(
    ...collectDuplicateIssues(commit.artifacts, (artifact) => artifact.id, "artifact id"),
    ...collectDuplicateIssues(commit.artifacts, (artifact) => artifact.path, "artifact path"),
  );

  const contextIssues = [];
  const trusted = validateTrustedContext(trustedContext, contextIssues);
  issues.push(...contextIssues);
  if (!trusted) {
    return issues;
  }

  inspectCommitFile(trusted.root, commit.resultPackage, "resultPackage", issues);
  if (commit.acceptanceReport) {
    inspectCommitFile(
      trusted.root,
      commit.acceptanceReport,
      "acceptanceReport",
      issues,
    );
  }
  if (commit.scoreReport) {
    inspectCommitFile(trusted.root, commit.scoreReport, "scoreReport", issues);
  }
  if (commit.reproductionReport) {
    inspectCommitFile(
      trusted.root,
      commit.reproductionReport,
      "reproductionReport",
      issues,
    );
  }
  commit.artifacts.forEach((artifact, index) =>
    inspectCommitFile(trusted.root, artifact, `artifacts[${index}]`, issues),
  );

  validateCapabilityBinding(commit, trusted, issues);
  validateResultPackageBinding(commit, trusted, issues);
  validateArtifactBinding(commit, trusted, issues);
  validateAcceptanceBinding(commit, trusted, issues);
  validateScoreBinding(commit, trusted, issues);
  validateReproductionBinding(commit, trusted, issues);

  return issues;
}

function relativeFileRef(root, absolutePath, label) {
  const relativePath = toPosixPath(
    path.relative(root, path.resolve(absolutePath)),
  );
  const inspected = inspectContainedFile(root, relativePath, label);
  assertValid(label, inspected.issues);
  return {
    path: relativePath,
    bytes: inspected.stats.size,
    sha256: digestFile(inspected.path),
  };
}

export function buildResultCommit({
  capability,
  resultPackage,
  acceptanceReport,
  scoreReport,
  reproductionReport,
  artifactRoot = resultPackage.root,
}) {
  const root = fs.realpathSync(path.resolve(artifactRoot));
  const resultPackageRef = relativeFileRef(
    root,
    resultPackage.path,
    "resultPackage.path",
  );
  const artifacts = resultPackage.value.artifacts.map((artifact) => {
    const absolutePath = path.resolve(resultPackage.root, artifact.path);
    return {
      id: artifact.id,
      type: artifact.type,
      mediaType: artifact.mediaType,
      ...relativeFileRef(root, absolutePath, `artifact ${artifact.id}.path`),
    };
  });

  const commit = {
    kind: "openquantum.result-commit",
    schemaVersion: "1.0",
    createdAt: resultPackage.value.createdAt,
    capability: {
      id: capability.manifest.id,
      version: capability.manifest.version,
      manifestSha256: digestFile(capability.manifestPath),
    },
    resultPackage: {
      packageId: resultPackage.value.packageId,
      ...resultPackageRef,
    },
    ...(acceptanceReport
      ? {
          acceptanceReport: {
            reportId: acceptanceReport.value.reportId,
            status: acceptanceReport.value.status,
            ...relativeFileRef(
              root,
              acceptanceReport.path,
              "acceptanceReport.path",
            ),
          },
        }
      : {}),
    ...(scoreReport
      ? {
          scoreReport: {
            reportId: scoreReport.value.reportId,
            status: scoreReport.value.status,
            ...relativeFileRef(root, scoreReport.path, "scoreReport.path"),
          },
        }
      : {}),
    ...(reproductionReport
      ? {
          reproductionReport: {
            reportId: reproductionReport.value.reportId,
            status: reproductionReport.value.status,
            ...relativeFileRef(
              root,
              reproductionReport.path,
              "reproductionReport.path",
            ),
          },
        }
      : {}),
    artifacts,
  };

  const issues = validateResultCommitValue(commit, {
    capability,
    resultPackage,
    acceptanceReport,
    scoreReport,
    reproductionReport,
    artifactRoot: root,
  });
  assertValid(`result commit ${resultPackage.value.packageId}`, issues);
  return commit;
}
