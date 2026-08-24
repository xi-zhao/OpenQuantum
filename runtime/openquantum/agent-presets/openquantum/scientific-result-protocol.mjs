import { scientificResultAdapter } from "./scientific-result-adapters.mjs";

export {
  QUANTUM_INFORMATION_AUDIT_TOOL,
  SOLVE_AND_VALIDATE_TOOL,
  SOLVE_TOOL,
  VALIDATE_TOOL,
} from "./scientific-result-adapters.mjs";

const ENVELOPE_PREFIX = "OPENQUANTUM_SCIENTIFIC_RESULT_V1 ";
const MAX_DETAILS = 10;
const MAX_LABEL_LENGTH = 80;
const MAX_VALUE_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 500;
const MAX_ENVELOPE_BYTES = 64 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const ACCEPTANCE_STATUSES = new Set(["passed", "conditional", "failed"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
  return value
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function utf8Bytes(value) {
  return new TextEncoder().encode(value).byteLength;
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

function validResultCommit(value, presentation, descriptor) {
  const expectedArtifactTypes = descriptor.materializedArtifactTypes;
  if (
    !Array.isArray(expectedArtifactTypes) ||
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "kind",
        "schemaVersion",
        "createdAt",
        "capability",
        "resultPackage",
        "acceptanceReport",
        "artifacts",
      ],
      ["scoreReport", "reproductionReport"],
    ) ||
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
    !hasExactKeys(value.resultPackage, ["packageId", "path", "bytes", "sha256"]) ||
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
    value.artifacts.length !== expectedArtifactTypes.length ||
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
  const artifactTypes = new Set(value.artifacts.map((artifact) => artifact.type));
  return (
    artifactIds.size === value.artifacts.length &&
    artifactPaths.size === value.artifacts.length &&
    artifactTypes.size === expectedArtifactTypes.length &&
    expectedArtifactTypes.every((type) => artifactTypes.has(type)) &&
    value.scoreReport === undefined &&
    value.reproductionReport === undefined
  );
}

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
      validResultCommit(value.resultCommit, value, descriptor)
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
  return scientificResultAdapter(toolName)?.descriptor;
}

export function projectScientificToolResult(toolName, canonicalValue) {
  const adapter = scientificResultAdapter(toolName);
  if (!adapter || !isRecord(canonicalValue)) return undefined;
  const projected = adapter.project(canonicalValue.structuredContent);
  return projected && validPresentation(projected, adapter.descriptor)
    ? freezeJson(projected)
    : undefined;
}

export function projectMaterializedScientificResult(
  toolName,
  canonicalValue,
  materialized,
) {
  const adapter = scientificResultAdapter(toolName);
  const projected = adapter?.projectMaterialized?.(
    canonicalValue,
    materialized,
  );
  return projected && validPresentation(projected, adapter.descriptor)
    ? freezeJson(projected)
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
