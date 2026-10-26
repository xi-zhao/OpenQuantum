import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { projectRoot as repositoryRoot } from "../../project-root.mjs";
import { pathToFileURL } from "node:url";

// Agent presets are copied into DSH_HOME before loading. Project-owned
// scientific modules therefore resolve from the configured project root,
// never from this copied preset file's physical location.
const capabilityPromises = new Map();
let contractsPromise;

function moduleUrl(relativePath) {
  return pathToFileURL(path.join(repositoryRoot, relativePath)).href;
}

function contracts() {
  contractsPromise ??= import(moduleUrl(".agents/skill-contracts/index.mjs"));
  return contractsPromise;
}

function capability(skillPath) {
  if (!capabilityPromises.has(skillPath)) {
    capabilityPromises.set(
      skillPath,
      contracts().then(({ loadCapability }) =>
        loadCapability(path.join(repositoryRoot, skillPath)),
      ),
    );
  }
  return capabilityPromises.get(skillPath);
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
    throw new Error(
      `scientific artifact path escapes the Harness workspace: ${relativePath}`,
    );
  }
  return target;
}

async function writeNewText({
  fileSystem,
  workspaceTarget,
  workspaceRoot,
  sandboxPolicy,
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
    sandboxPolicy,
  );
  return target;
}

function resultDirectory(resultRoot, sessionId, callId, callEventSeq) {
  const sessionDigest = identityDigest({ kind: "session", id: sessionId });
  // Providers may reuse a call id in a later step. The native event sequence
  // distinguishes the actual executions without adding runtime identity.
  const callDigest = identityDigest({ kind: "tool-call", id: callId, callEventSeq });
  return {
    relativePath: `${resultRoot}/${sessionDigest}/${callDigest}`,
    callDigest,
  };
}

function provenance(definition, loadedCapability) {
  const environment = Object.freeze({
    runtime: "node",
    version: process.version,
    platform: process.platform,
    architecture: process.arch,
  });
  return {
    tools: definition.provenanceTools.map((tool) => ({
      id: tool.id,
      version:
        typeof tool.version === "function"
          ? tool.version(loadedCapability)
          : tool.version,
      digest: digestFile(path.join(repositoryRoot, tool.path)),
    })),
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

function assertMaterializerDefinition(definition) {
  for (const field of [
    "capabilityId",
    "skillPath",
    "resultRoot",
    "packagePrefix",
    "inputId",
    "profileId",
    "validatorId",
  ]) {
    if (typeof definition?.[field] !== "string" || definition[field].length === 0) {
      throw new Error(`scientific materializer definition.${field} is required`);
    }
  }
  if (
    !Array.isArray(definition.provenanceTools) ||
    definition.provenanceTools.length === 0 ||
    typeof definition.prepare !== "function"
  ) {
    throw new Error(
      "scientific materializer requires provenanceTools and a prepare function",
    );
  }
}

function readPersistedJson(fileSystem, target) {
  return JSON.parse(fs.readFileSync(fileSystem.processPath(target), "utf8"));
}

/**
 * Define one capability Adapter behind the common Harness materialization
 * Interface. The returned function writes new workspace bytes, loads those
 * exact bytes through the central contracts, reruns the capability Validator,
 * and returns a bounded Result Commit.
 */
export function defineScientificResultMaterializer(definition) {
  assertMaterializerDefinition(definition);

  return async function materializeScientificResult({
    fileSystem,
    workspaceRoot,
    sandboxPolicy,
    sessionId,
    callId,
    eventRange,
    request,
    structuredContent,
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

    signal?.throwIfAborted();
    if (!sandboxPolicy || sandboxPolicy.mode === "read-only") {
      throw new Error("Scientific materialization requires the effective writable session sandbox policy");
    }

    const {
      buildAcceptanceReport,
      buildResultCommit,
      loadAcceptanceReport,
      loadResultPackage,
    } = await contracts();
    const loadedCapability = await capability(definition.skillPath);
    if (loadedCapability.manifest.id !== definition.capabilityId) {
      throw new Error(
        `Scientific Adapter ${definition.capabilityId} loaded mismatched Capability ${loadedCapability.manifest.id}`,
      );
    }
    const profileReference = loadedCapability.manifest.acceptanceProfiles.find(
      (candidate) => candidate.id === definition.profileId,
    );
    const profile = loadedCapability.acceptanceProfileDefinitions.get(
      definition.profileId,
    );
    if (!profileReference || !profile) {
      throw new Error(
        `Capability does not contain Acceptance Profile ${definition.profileId}`,
      );
    }

    const prepared = await definition.prepare({
      request,
      structuredContent,
      capability: loadedCapability,
      profile,
    });
    if (
      !prepared ||
      !Array.isArray(prepared.artifacts) ||
      prepared.artifacts.length === 0 ||
      typeof prepared.validate !== "function"
    ) {
      throw new Error(
        `Scientific Adapter ${definition.capabilityId} returned an invalid materialization plan`,
      );
    }

    const workspaceTarget = await fileSystem.resolve(".", {
      cwd: workspaceRoot,
      signal,
    });
    const workspaceProcessPath = fileSystem.processPath(workspaceTarget);
    const directory = resultDirectory(
      definition.resultRoot,
      sessionId,
      callId,
      eventRange.from,
    );
    const inputContent = canonicalJson(prepared.request);
    const inputReference = fileReference({
      id: definition.inputId,
      type: loadedCapability.manifest.input.id,
      relativePath: "input/request.json",
      content: inputContent,
    });
    const artifactEntries = prepared.artifacts.map((artifact) => {
      const content = canonicalJson(artifact.value);
      return {
        ...artifact,
        content,
        reference: fileReference({
          id: artifact.id,
          type: artifact.type,
          relativePath: `artifacts/${artifact.fileName}`,
          content,
        }),
      };
    });

    const createdAt = safeTimestamp(now);
    const resultPackageValue = {
      schemaVersion: "1.1",
      packageId: `${definition.packagePrefix}-${directory.callDigest}`,
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
      provenance: provenance(definition, loadedCapability),
    };

    const inputTarget = await writeNewText({
      fileSystem,
      workspaceTarget,
      workspaceRoot,
      sandboxPolicy,
      relativePath: `${directory.relativePath}/${inputReference.path}`,
      content: inputContent,
      signal,
    });
    const artifactTargets = new Map();
    for (const entry of artifactEntries) {
      const target = await writeNewText({
        fileSystem,
        workspaceTarget,
        workspaceRoot,
        sandboxPolicy,
        relativePath: `${directory.relativePath}/${entry.reference.path}`,
        content: entry.content,
        signal,
      });
      artifactTargets.set(entry.key, target);
    }

    const resultPackageRelativePath =
      `${directory.relativePath}/result-package.json`;
    const resultPackageTarget = await writeNewText({
      fileSystem,
      workspaceTarget,
      workspaceRoot,
      sandboxPolicy,
      relativePath: resultPackageRelativePath,
      content: canonicalJson(resultPackageValue),
      signal,
    });
    const resultPackage = loadResultPackage(
      fileSystem.processPath(resultPackageTarget),
      loadedCapability,
    );
    const persistedArtifacts = Object.fromEntries(
      artifactEntries.map((entry) => [
        entry.key,
        readPersistedJson(fileSystem, artifactTargets.get(entry.key)),
      ]),
    );
    const validation = await prepared.validate({
      resultPackage,
      profile,
      signal,
      request: readPersistedJson(fileSystem, inputTarget),
      artifacts: persistedArtifacts,
    });
    const acceptanceValue = buildAcceptanceReport({
      capability: loadedCapability,
      resultPackage,
      validatorId: definition.validatorId,
      profileId: definition.profileId,
      reportId: `${definition.packagePrefix}-acceptance-${directory.callDigest}`,
      generatedAt: safeTimestamp(now),
      scopeMatch: validation.scopeMatch,
      observations: validation.observations,
      limitations: validation.limitations,
      statement: validation.statement,
    });
    const acceptanceRelativePath =
      `${directory.relativePath}/acceptance-report.json`;
    const acceptanceTarget = await writeNewText({
      fileSystem,
      workspaceTarget,
      workspaceRoot,
      sandboxPolicy,
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

    let readableReport;
    if (typeof prepared.renderReport === "function") {
      const content = prepared.renderReport({
        request: readPersistedJson(fileSystem, inputTarget), artifacts: persistedArtifacts,
        acceptanceReport: acceptanceReport.value, resultPackage: resultPackage.value,
        acceptanceReportPath: acceptanceRelativePath, resultPackagePath: resultPackageRelativePath,
      });
      if (typeof content !== "string" || content.length === 0 || Buffer.byteLength(content) > 65536) {
        throw new Error("Scientific readable report exceeds its bounded contract");
      }
      const relativePath = `${directory.relativePath}/readable-report.md`;
      const target = await writeNewText({ fileSystem, workspaceTarget, workspaceRoot, sandboxPolicy, relativePath, content, signal });
      if (fs.readFileSync(fileSystem.processPath(target), "utf8") !== content) {
        throw new Error("Scientific readable report readback differs");
      }
      readableReport = { path: relativePath, sha256: sha256Text(content), bytes: Buffer.byteLength(content) };
    }

    return Object.freeze({
      validation,
      acceptanceStatus: acceptanceReport.value.status,
      resultCommit,
      resultPackagePath: resultPackageRelativePath,
      acceptanceReportPath: acceptanceRelativePath,
      ...(readableReport ? { readableReport } : {}),
    });
  };
}
