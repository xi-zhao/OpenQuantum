export const SOLVE_TOOL =
  "mcp__openquantum_quantum__solve_ground_state";
export const VALIDATE_TOOL =
  "mcp__openquantum_quantum__validate_ground_state";
export const SOLVE_AND_VALIDATE_TOOL =
  "mcp__openquantum_quantum__solve_and_validate_ground_state";

const ENVELOPE_PREFIX = "OPENQUANTUM_SCIENTIFIC_RESULT_V1 ";
const MAX_DETAILS = 10;
const MAX_LABEL_LENGTH = 80;
const MAX_VALUE_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 500;
const MAX_ENVELOPE_BYTES = 64 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;

const TOOL_DESCRIPTORS = Object.freeze({
  [SOLVE_AND_VALIDATE_TOOL]: Object.freeze({
    capabilityId: "quantum-ground-state",
    operation: "solve-and-validate",
    title: "量子基态求解与科学观察",
    scientificStatuses: Object.freeze([
      "observations_available",
      "acceptance_available",
    ]),
  }),
  [SOLVE_TOOL]: Object.freeze({
    capabilityId: "quantum-ground-state",
    operation: "solve",
    title: "量子基态事实",
    scientificStatuses: Object.freeze(["not_evaluated"]),
  }),
  [VALIDATE_TOOL]: Object.freeze({
    capabilityId: "quantum-ground-state",
    operation: "validate",
    title: "量子基态科学观察",
    scientificStatuses: Object.freeze(["observations_available"]),
  }),
});

const OBSERVATION_STATUSES = new Set(["pass", "warn", "fail", "not_checked"]);
const SCOPE_STATUSES = new Set(["in_scope", "out_of_scope", "indeterminate"]);
const ACCEPTANCE_STATUSES = new Set(["passed", "conditional", "failed"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function boundedString(value, maximum) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function hasExactKeys(value, required, optional = []) {
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => allowed.has(key))
  );
}

function safeRelativePath(value) {
  if (
    !boundedString(value, 500) ||
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    return false;
  }
  const segments = value.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

function utf8Bytes(value) {
  return new TextEncoder().encode(value).byteLength;
}

function formatNumber(value) {
  return Number(value.toPrecision(10)).toString();
}

function detail(label, value) {
  return Object.freeze({ label, value });
}

function safeFileRef(value) {
  return (
    isRecord(value) &&
    safeRelativePath(value.path) &&
    Number.isSafeInteger(value.bytes) &&
    value.bytes >= 0 &&
    SHA256.test(value.sha256)
  );
}

function validResultCommit(value, presentation) {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "kind",
      "schemaVersion",
      "createdAt",
      "capability",
      "resultPackage",
      "acceptanceReport",
      "artifacts",
    ], ["scoreReport", "reproductionReport"]) ||
    value.kind !== "openquantum.result-commit" ||
    value.schemaVersion !== "1.0" ||
    !boundedString(value.createdAt, 80) ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    !isRecord(value.capability) ||
    !hasExactKeys(value.capability, ["id", "version", "manifestSha256"]) ||
    value.capability.id !== presentation.capabilityId ||
    !boundedString(value.capability.version, 160) ||
    !SHA256.test(value.capability.manifestSha256) ||
    !isRecord(value.resultPackage) ||
    !hasExactKeys(value.resultPackage, [
      "packageId",
      "path",
      "bytes",
      "sha256",
    ]) ||
    !boundedString(value.resultPackage.packageId, 160) ||
    !safeFileRef(value.resultPackage) ||
    !isRecord(value.acceptanceReport) ||
    !hasExactKeys(value.acceptanceReport, [
      "reportId",
      "status",
      "path",
      "bytes",
      "sha256",
    ]) ||
    !boundedString(value.acceptanceReport.reportId, 160) ||
    value.acceptanceReport.status !== presentation.acceptanceStatus ||
    !safeFileRef(value.acceptanceReport) ||
    !Array.isArray(value.artifacts) ||
    value.artifacts.length !== 6 ||
    !value.artifacts.every(
      (artifact) =>
        isRecord(artifact) &&
        hasExactKeys(artifact, [
          "id",
          "type",
          "path",
          "mediaType",
          "bytes",
          "sha256",
        ]) &&
        boundedString(artifact.id, 160) &&
        boundedString(artifact.type, 160) &&
        boundedString(artifact.mediaType, 160) &&
        safeFileRef(artifact),
    )
  ) {
    return false;
  }
  const artifactIds = new Set(value.artifacts.map((artifact) => artifact.id));
  const artifactPaths = new Set(value.artifacts.map((artifact) => artifact.path));
  return (
    artifactIds.size === value.artifacts.length &&
    artifactPaths.size === value.artifacts.length &&
    value.scoreReport === undefined &&
    value.reproductionReport === undefined
  );
}

function solvePresentation(structuredContent) {
  if (!isRecord(structuredContent)) return undefined;
  const problem = structuredContent.problemSpec;
  const result = structuredContent.groundStateResult;
  const exact = structuredContent.exactReference;
  if (
    !isRecord(problem) ||
    !isRecord(result) ||
    !isRecord(exact) ||
    result.artifactType !== "ground-state-result" ||
    exact.artifactType !== "exact-reference" ||
    typeof problem.requestId !== "string" ||
    !finiteNumber(result.energyHartree) ||
    !finiteNumber(exact.groundEnergyHartree) ||
    typeof result.converged !== "boolean" ||
    !Number.isSafeInteger(result.evaluationCount)
  ) {
    return undefined;
  }

  const difference = Math.abs(result.energyHartree - exact.groundEnergyHartree);
  return Object.freeze({
    schemaVersion: "1.0",
    capabilityId: "quantum-ground-state",
    operation: "solve",
    title: "量子基态事实",
    summary: `已生成请求 ${problem.requestId} 的六类确定性事实；尚未形成科学验收结论。`,
    scientificStatus: "not_evaluated",
    details: Object.freeze([
      detail("VQE 扇区能量", `${formatNumber(result.energyHartree)} Ha`),
      detail("精确参考能量", `${formatNumber(exact.groundEnergyHartree)} Ha`),
      detail("绝对能量差", `${formatNumber(difference)} Ha`),
      detail("优化事实", result.converged ? "已收敛" : "未收敛"),
      detail("函数评估次数", String(result.evaluationCount)),
    ]),
  });
}

function validationPresentation(structuredContent) {
  if (!isRecord(structuredContent) || !Array.isArray(structuredContent.observations)) {
    return undefined;
  }
  const scopeMatch = structuredContent.scopeMatch;
  if (!isRecord(scopeMatch) || !SCOPE_STATUSES.has(scopeMatch.status)) {
    return undefined;
  }

  const counts = { pass: 0, warn: 0, fail: 0, not_checked: 0 };
  for (const observation of structuredContent.observations) {
    if (!isRecord(observation) || !OBSERVATION_STATUSES.has(observation.status)) {
      return undefined;
    }
    counts[observation.status] += 1;
  }

  return Object.freeze({
    schemaVersion: "1.0",
    capabilityId: "quantum-ground-state",
    operation: "validate",
    title: "量子基态科学观察",
    summary:
      "独立 Validator 已生成逐项观察；整体科学验收仍由中央规则单独派生。",
    scientificStatus: "observations_available",
    details: Object.freeze([
      detail("适用范围", scopeMatch.status),
      detail("观察总数", String(structuredContent.observations.length)),
      detail("通过", String(counts.pass)),
      detail("警告", String(counts.warn)),
      detail("失败", String(counts.fail)),
      detail("未检查", String(counts.not_checked)),
    ]),
  });
}

function solveAndValidatePresentation(structuredContent) {
  if (!isRecord(structuredContent)) return undefined;
  const solve = solvePresentation(structuredContent.facts);
  const validation = validationPresentation(structuredContent.validation);
  if (!solve || !validation) return undefined;

  return Object.freeze({
    schemaVersion: "1.0",
    capabilityId: "quantum-ground-state",
    operation: "solve-and-validate",
    title: "量子基态求解与科学观察",
    summary:
      "已生成六类确定性事实并完成计算级独立检查；来源链和整体科学验收仍需 Harness 物化后单独推导。",
    scientificStatus: "observations_available",
    details: Object.freeze([
      ...solve.details.slice(0, 3),
      ...validation.details.filter((item) => item.label !== "观察总数"),
    ]),
  });
}

const TOOL_PROJECTORS = Object.freeze({
  [SOLVE_AND_VALIDATE_TOOL]: solveAndValidatePresentation,
  [SOLVE_TOOL]: solvePresentation,
  [VALIDATE_TOOL]: validationPresentation,
});

function validPresentation(value, descriptor) {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "schemaVersion",
        "capabilityId",
        "operation",
        "title",
        "summary",
        "scientificStatus",
        "details",
      ],
      ["acceptanceStatus", "resultCommit"],
    ) ||
    value.schemaVersion !== "1.0" ||
    value.capabilityId !== descriptor.capabilityId ||
    value.operation !== descriptor.operation ||
    !boundedString(value.title, MAX_LABEL_LENGTH) ||
    !boundedString(value.summary, MAX_SUMMARY_LENGTH) ||
    !descriptor.scientificStatuses.includes(value.scientificStatus) ||
    !Array.isArray(value.details) ||
    value.details.length > MAX_DETAILS ||
    !value.details.every(
      (item) =>
        isRecord(item) &&
        hasExactKeys(item, ["label", "value"]) &&
        boundedString(item.label, MAX_LABEL_LENGTH) &&
        boundedString(item.value, MAX_VALUE_LENGTH),
    ) ||
    utf8Bytes(JSON.stringify(value)) > MAX_ENVELOPE_BYTES
  ) {
    return false;
  }
  if (value.scientificStatus === "acceptance_available") {
    return (
      ACCEPTANCE_STATUSES.has(value.acceptanceStatus) &&
      validResultCommit(value.resultCommit, value)
    );
  }
  return value.acceptanceStatus === undefined && value.resultCommit === undefined;
}

function freezeJson(value) {
  if (Array.isArray(value)) {
    value.forEach(freezeJson);
  } else if (isRecord(value)) {
    Object.values(value).forEach(freezeJson);
  }
  return Object.freeze(value);
}

export function scientificToolDescriptor(toolName) {
  return TOOL_DESCRIPTORS[toolName];
}

export function projectScientificToolResult(toolName, canonicalValue) {
  const descriptor = scientificToolDescriptor(toolName);
  if (!descriptor || !isRecord(canonicalValue)) return undefined;
  const structuredContent = canonicalValue.structuredContent;
  const projected = TOOL_PROJECTORS[toolName](structuredContent);
  return projected && validPresentation(projected, descriptor)
    ? projected
    : undefined;
}

export function projectMaterializedScientificResult(canonicalValue, materialized) {
  const computational = solveAndValidatePresentation(
    canonicalValue?.structuredContent,
  );
  if (
    !computational ||
    !isRecord(materialized) ||
    !ACCEPTANCE_STATUSES.has(materialized.acceptanceStatus) ||
    !isRecord(materialized.resultCommit)
  ) {
    return undefined;
  }
  if (
    materialized.resultPackagePath !==
    materialized.resultCommit.resultPackage?.path
  ) {
    return undefined;
  }
  const validation = validationPresentation(materialized.validation);
  if (!validation) return undefined;
  const presentation = {
    ...computational,
    title: "量子基态科学验收",
    summary: `Harness 已物化并复核 Result Package；中央规则派生整体验收：${materialized.acceptanceStatus}。`,
    scientificStatus: "acceptance_available",
    acceptanceStatus: materialized.acceptanceStatus,
    details: Object.freeze([
      ...computational.details.slice(0, 3),
      detail("整体验收", materialized.acceptanceStatus),
      ...validation.details.filter((item) =>
        ["通过", "警告", "失败", "未检查"].includes(item.label),
      ),
      detail("Result Package", materialized.resultPackagePath),
    ]),
    resultCommit: materialized.resultCommit,
  };
  return validPresentation(
    presentation,
    TOOL_DESCRIPTORS[SOLVE_AND_VALIDATE_TOOL],
  )
    ? freezeJson(presentation)
    : undefined;
}

export function encodeScientificToolResult(presentation) {
  return `${ENVELOPE_PREFIX}${JSON.stringify(presentation)}`;
}

export function parseScientificToolResult(toolName, text) {
  const descriptor = scientificToolDescriptor(toolName);
  if (!descriptor || typeof text !== "string") return undefined;
  const encoded = text
    .split("\n")
    .findLast((line) => line.startsWith(ENVELOPE_PREFIX));
  if (!encoded) return undefined;

  try {
    const value = JSON.parse(encoded.slice(ENVELOPE_PREFIX.length));
    if (!validPresentation(value, descriptor)) return undefined;
    return freezeJson(value);
  } catch {
    return undefined;
  }
}
