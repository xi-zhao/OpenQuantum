import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Agent presets are copied into DSH_HOME before loading. Project-owned
// scientific modules therefore resolve from Harness's configured process cwd,
// never from this copied preset file's physical location.
const repositoryRoot = process.cwd();
const skillRoot = path.join(
  repositoryRoot,
  ".agents/skills/quantum-ground-state",
);
const RESULT_ROOT = "results/openquantum/quantum-ground-state";
const PROFILE_ID = "supplied-pauli-statevector";
const VALIDATOR_ID = "ground-state-validator";
const FACT_FILES = Object.freeze({
  problemSpec: "problem-spec.json",
  hamiltonianManifest: "hamiltonian-manifest.json",
  exactReference: "exact-reference.json",
  groundStateResult: "ground-state-result.json",
  convergenceTrace: "convergence-trace.json",
  resourceEstimate: "resource-estimate.json",
});

let capabilityPromise;
let runtimePromise;

function moduleUrl(relativePath) {
  return pathToFileURL(path.join(repositoryRoot, relativePath)).href;
}

function runtime() {
  runtimePromise ??= Promise.all([
    import(moduleUrl(".agents/skill-contracts/index.mjs")),
    import(
      moduleUrl(
        ".agents/skills/quantum-ground-state/mcp/contracts.mjs",
      )
    ),
    import(
      moduleUrl(
        ".agents/skills/quantum-ground-state/validators/validate-result.mjs",
      )
    ),
  ]).then(([contracts, mcpContracts, validator]) => ({
    ...contracts,
    ...mcpContracts,
    ...validator,
  }));
  return runtimePromise;
}

function capability() {
  capabilityPromise ??= runtime().then(({ loadCapability }) =>
    loadCapability(skillRoot),
  );
  return capabilityPromise;
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function digestFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function identityDigest(value) {
  return sha256Text(JSON.stringify(value));
}

function safeTimestamp(now) {
  const value = now();
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("scientific materialization clock must return an ISO date-time");
  }
  return value;
}

function fileReference({ id, type, relativePath, content }) {
  return Object.freeze({
    id,
    type,
    path: relativePath,
    mediaType: "application/json",
    bytes: Buffer.byteLength(content, "utf8"),
    sha256: sha256Text(content),
  });
}

async function resolveContainedTarget({
  fileSystem,
  workspaceTarget,
  workspaceRoot,
  relativePath,
  signal,
}) {
  const target = await fileSystem.resolve(relativePath, {
    cwd: workspaceRoot,
    signal,
  });
  if (!fileSystem.contains(workspaceTarget, target)) {
    throw new Error(`scientific artifact path escapes the Harness workspace: ${relativePath}`);
  }
  return target;
}

async function writeNewText({
  fileSystem,
  workspaceTarget,
  workspaceRoot,
  sessionId,
  relativePath,
  content,
  signal,
}) {
  const target = await resolveContainedTarget({
    fileSystem,
    workspaceTarget,
    workspaceRoot,
    relativePath,
    signal,
  });
  await fileSystem.writeText(
    target,
    content,
    { kind: "createIfAbsent" },
    signal,
    {
      mode: "workspace-write",
      workspaceRoot,
      sessionId,
    },
  );
  return target;
}

function resultDirectory(sessionId, callId) {
  const sessionDigest = identityDigest({ kind: "session", id: sessionId });
  const callDigest = identityDigest({ kind: "tool-call", id: callId });
  return {
    relativePath: `${RESULT_ROOT}/${sessionDigest}/${callDigest}`,
    callDigest,
  };
}

function provenance(loadedCapability) {
  const validator = loadedCapability.manifest.validators.find(
    (candidate) => candidate.id === VALIDATOR_ID,
  );
  if (!validator) {
    throw new Error(`Capability does not declare Validator ${VALIDATOR_ID}`);
  }
  const mcpServerPath = path.join(skillRoot, "mcp/server.mjs");
  const validatorPath = path.join(skillRoot, validator.command.script);
  const environment = Object.freeze({
    runtime: "node",
    version: process.version,
    platform: process.platform,
    architecture: process.arch,
  });
  return {
    tools: [
      {
        id: "quantum-ground-state-mcp",
        version: loadedCapability.manifest.version,
        digest: digestFile(mcpServerPath),
      },
      {
        id: validator.id,
        version: validator.version,
        digest: digestFile(validatorPath),
      },
    ],
    environment: [
      {
        id: "node-runtime",
        version: process.version,
        digest: identityDigest(environment),
      },
    ],
    dependencies: loadedCapability.manifest.dependencies.map((dependency) => ({
      ...dependency,
    })),
  };
}

/**
 * Materialize one completed Harness-owned quantum tool call into the session
 * workspace, rerun the independent Validator against those exact bytes, and
 * derive Acceptance through the central contract builder.
 */
export async function materializeGroundStateResult({
  fileSystem,
  workspaceRoot,
  sessionId,
  callId,
  eventRange,
  request,
  facts,
  signal,
  now = () => new Date().toISOString(),
}) {
  if (!fileSystem || typeof fileSystem.resolve !== "function") {
    throw new Error("Harness ctx.fs is required for scientific materialization");
  }
  if (typeof workspaceRoot !== "string" || !path.isAbsolute(workspaceRoot)) {
    throw new Error("Harness session workspace must be an absolute path");
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("Harness session id is required for scientific provenance");
  }
  if (typeof callId !== "string" || callId.length === 0) {
    throw new Error("Harness tool call id is required for scientific provenance");
  }
  if (
    !Number.isSafeInteger(eventRange?.from) ||
    !Number.isSafeInteger(eventRange?.to) ||
    eventRange.from < 0 ||
    eventRange.from > eventRange.to
  ) {
    throw new Error("Harness execution event range is invalid");
  }

  const {
    buildAcceptanceReport,
    buildResultCommit,
    loadAcceptanceReport,
    loadResultPackage,
    requireSolveAndValidateRequest,
    validateFacts,
    validateValidationBundle,
  } = await runtime();
  const canonicalRequest = requireSolveAndValidateRequest({ request });
  const canonicalFacts = validateFacts(facts);
  const loadedCapability = await capability();
  const profileReference = loadedCapability.manifest.acceptanceProfiles.find(
    (candidate) => candidate.id === PROFILE_ID,
  );
  const profile = loadedCapability.acceptanceProfileDefinitions.get(PROFILE_ID);
  if (!profileReference || !profile) {
    throw new Error(`Capability does not contain Acceptance Profile ${PROFILE_ID}`);
  }

  const workspaceTarget = await fileSystem.resolve(".", {
    cwd: workspaceRoot,
    signal,
  });
  const workspaceProcessPath = fileSystem.processPath(workspaceTarget);
  const directory = resultDirectory(sessionId, callId);
  const inputContent = canonicalJson(canonicalRequest);
  const inputReference = fileReference({
    id: "ground-state-request",
    type: loadedCapability.manifest.input.id,
    relativePath: "input/request.json",
    content: inputContent,
  });
  const artifactEntries = Object.entries(FACT_FILES).map(([key, fileName]) => {
    const content = canonicalJson(canonicalFacts[key]);
    const type = canonicalFacts[key].artifactType;
    return {
      key,
      content,
      reference: fileReference({
        id: type,
        type,
        relativePath: `artifacts/${fileName}`,
        content,
      }),
    };
  });

  const createdAt = safeTimestamp(now);
  const resultPackageValue = {
    schemaVersion: "1.1",
    packageId: `qgs-${directory.callDigest}`,
    capability: {
      id: loadedCapability.manifest.id,
      version: loadedCapability.manifest.version,
    },
    createdAt,
    executionRef: {
      sessionId,
      eventRange: { from: eventRange.from, to: eventRange.to },
    },
    acceptanceProfile: {
      id: profileReference.id,
      version: profileReference.version,
      sha256: profileReference.definition.sha256,
    },
    inputs: [inputReference],
    artifacts: artifactEntries.map((entry) => entry.reference),
    provenance: provenance(loadedCapability),
  };

  await writeNewText({
    fileSystem,
    workspaceTarget,
    workspaceRoot,
    sessionId,
    relativePath: `${directory.relativePath}/${inputReference.path}`,
    content: inputContent,
    signal,
  });
  for (const entry of artifactEntries) {
    await writeNewText({
      fileSystem,
      workspaceTarget,
      workspaceRoot,
      sessionId,
      relativePath: `${directory.relativePath}/${entry.reference.path}`,
      content: entry.content,
      signal,
    });
  }

  const resultPackageRelativePath = `${directory.relativePath}/result-package.json`;
  const resultPackageTarget = await writeNewText({
    fileSystem,
    workspaceTarget,
    workspaceRoot,
    sessionId,
    relativePath: resultPackageRelativePath,
    content: canonicalJson(resultPackageValue),
    signal,
  });
  const resultPackage = loadResultPackage(
    fileSystem.processPath(resultPackageTarget),
    loadedCapability,
  );
  const validation = validateValidationBundle({
    schemaVersion: "1.0",
    resultPackage: {
      kind: resultPackage.kind,
      value: resultPackage.value,
    },
    profile,
    request: canonicalRequest,
    facts: canonicalFacts,
  });
  const acceptanceValue = buildAcceptanceReport({
    capability: loadedCapability,
    resultPackage,
    validatorId: VALIDATOR_ID,
    profileId: PROFILE_ID,
    reportId: `qgs-acceptance-${directory.callDigest}`,
    generatedAt: safeTimestamp(now),
    scopeMatch: validation.scopeMatch,
    observations: validation.observations,
    limitations: validation.limitations,
    statement: validation.statement,
  });
  const acceptanceRelativePath = `${directory.relativePath}/acceptance-report.json`;
  const acceptanceTarget = await writeNewText({
    fileSystem,
    workspaceTarget,
    workspaceRoot,
    sessionId,
    relativePath: acceptanceRelativePath,
    content: canonicalJson(acceptanceValue),
    signal,
  });
  const acceptanceReport = loadAcceptanceReport(
    fileSystem.processPath(acceptanceTarget),
    loadedCapability,
    resultPackage,
  );
  const resultCommit = buildResultCommit({
    capability: loadedCapability,
    resultPackage,
    acceptanceReport,
    artifactRoot: workspaceProcessPath,
  });

  return Object.freeze({
    validation,
    acceptanceStatus: acceptanceReport.value.status,
    resultCommit,
    resultPackagePath: resultPackageRelativePath,
    acceptanceReportPath: acceptanceRelativePath,
  });
}
