import fs from "node:fs";
import path from "node:path";

import { assertValid } from "./errors.mjs";
import {
  collectDuplicateIssues,
  digestBuffer,
  digestFile,
  findSecretViolations,
  formatAjvErrors,
  inspectContainedFile,
  readJsonFile,
  validateContractSchema,
} from "./shared.mjs";

function resultSchemaName(schemaVersion) {
  return schemaVersion === "1.1"
    ? "v1.1/result-package.schema.json"
    : "result-package.schema.json";
}

function dependencyKey(dependency) {
  return `${dependency.kind}:${dependency.id}`;
}

function dependencySignature(dependency) {
  return `${dependency.kind}:${dependency.id}@${dependency.version}#${dependency.digest}`;
}

function validateDependencies(resultPackage, manifest, issues) {
  if (resultPackage.schemaVersion !== "1.1") {
    return;
  }
  const declared = manifest.dependencies ?? [];
  const recorded = resultPackage.provenance.dependencies;
  issues.push(...collectDuplicateIssues(recorded, dependencyKey, "provenance dependency id"));

  const declaredSignatures = new Set(declared.map(dependencySignature));
  const recordedSignatures = new Set(recorded.map(dependencySignature));
  for (const dependency of declared) {
    if (!recordedSignatures.has(dependencySignature(dependency))) {
      issues.push(
        `provenance dependencies must include manifest dependency ${dependencySignature(dependency)}`,
      );
    }
  }
  for (const dependency of recorded) {
    if (!declaredSignatures.has(dependencySignature(dependency))) {
      issues.push(
        `provenance dependency must exactly match the manifest: ${dependencySignature(dependency)}`,
      );
    }
  }
}

function validateJsonPayload(filePath, compiledSchema, label, issues) {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    issues.push(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  if (!compiledSchema.validate(payload)) {
    issues.push(
      ...formatAjvErrors(compiledSchema.validate.errors).map(
        (issue) => `${label} violates its declared schema: ${issue}`,
      ),
    );
  }
  issues.push(...findSecretViolations(payload, `${label}.payload`));
}

function validateTextPayload(filePath, label, issues) {
  let payload;
  try {
    payload = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    issues.push(
      `${label} cannot be scanned as text: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return;
  }
  issues.push(...findSecretViolations(payload, `${label}.payload`));
}

export function validateResultPackageValue(resultPackage, packageRoot, capability) {
  const schemaIssues = validateContractSchema(
    resultSchemaName(resultPackage?.schemaVersion),
    resultPackage,
  );
  const issues = [...schemaIssues, ...findSecretViolations(resultPackage, "resultPackage")];
  if (schemaIssues.length > 0) {
    return issues;
  }

  const manifest = capability.manifest;
  if (resultPackage.schemaVersion !== manifest.schemaVersion) {
    issues.push("result package schemaVersion must match the capability contract version");
  }
  if (
    resultPackage.capability.id !== manifest.id ||
    resultPackage.capability.version !== manifest.version
  ) {
    issues.push(
      `capability must equal ${manifest.id}@${manifest.version}`,
    );
  }

  const profile = manifest.acceptanceProfiles.find(
    (candidate) => candidate.id === resultPackage.acceptanceProfile.id,
  );
  if (!profile || profile.version !== resultPackage.acceptanceProfile.version) {
    issues.push(
      `acceptanceProfile must reference a declared profile with the same version`,
    );
  }
  if (
    resultPackage.schemaVersion === "1.1" &&
    profile?.definition &&
    profile.definition.sha256 !== resultPackage.acceptanceProfile.sha256
  ) {
    issues.push("acceptanceProfile sha256 must match the declared profile definition");
  }

  if (resultPackage.executionRef.eventRange.from > resultPackage.executionRef.eventRange.to) {
    issues.push("executionRef.eventRange.from must be less than or equal to .to");
  }

  const allFileRefs = [...resultPackage.inputs, ...resultPackage.artifacts];
  if (resultPackage.artifacts.length > manifest.permissions.limits.maxArtifacts) {
    issues.push(
      `artifacts exceed manifest permissions.limits.maxArtifacts (${manifest.permissions.limits.maxArtifacts})`,
    );
  }
  issues.push(...collectDuplicateIssues(allFileRefs, (item) => item.id, "input/artifact id"));
  issues.push(...collectDuplicateIssues(allFileRefs, (item) => item.path, "input/artifact path"));
  issues.push(
    ...collectDuplicateIssues(
      resultPackage.provenance.tools,
      (item) => item.id,
      "provenance tool id",
    ),
  );
  validateDependencies(resultPackage, manifest, issues);
  issues.push(
    ...collectDuplicateIssues(
      resultPackage.provenance.environment,
      (item) => item.id,
      "provenance environment id",
    ),
  );

  const totalInputBytes = resultPackage.inputs.reduce((total, item) => total + item.bytes, 0);
  if (manifest.input.maxBytes && totalInputBytes > manifest.input.maxBytes) {
    issues.push(`inputs exceed manifest input.maxBytes (${manifest.input.maxBytes})`);
  }

  for (const input of resultPackage.inputs) {
    if (input.type !== manifest.input.id) {
      issues.push(`input ${input.id} has undeclared type ${input.type}`);
    }
    if (
      manifest.input.mediaTypes &&
      !manifest.input.mediaTypes.includes(input.mediaType)
    ) {
      issues.push(`input ${input.id} has unsupported mediaType ${input.mediaType}`);
    }
  }

  const artifactDeclarations = new Map(
    manifest.artifacts.map((artifact) => [artifact.id, artifact]),
  );
  const presentTypes = new Set();
  for (const artifact of resultPackage.artifacts) {
    const declaration = artifactDeclarations.get(artifact.type);
    if (!declaration) {
      issues.push(`artifact ${artifact.id} has undeclared type ${artifact.type}`);
      continue;
    }
    presentTypes.add(artifact.type);
    if (artifact.mediaType !== declaration.mediaType) {
      issues.push(
        `artifact ${artifact.id} mediaType must be ${declaration.mediaType}`,
      );
    }
  }
  for (const declaration of manifest.artifacts) {
    if (declaration.required && !presentTypes.has(declaration.id)) {
      issues.push(`missing required artifact type: ${declaration.id}`);
    }
  }

  for (const fileRef of allFileRefs) {
    const label = `${resultPackage.inputs.includes(fileRef) ? "input" : "artifact"} ${fileRef.id}`;
    const inspected = inspectContainedFile(packageRoot, fileRef.path, `${label}.path`);
    issues.push(...inspected.issues);
    if (!inspected.path || !inspected.stats?.isFile()) {
      continue;
    }
    if (inspected.stats.size !== fileRef.bytes) {
      issues.push(`${label}.bytes must equal ${inspected.stats.size}`);
    }
    if (digestFile(inspected.path) !== fileRef.sha256) {
      issues.push(`${label}.sha256 does not match file content`);
    }

    const isJson = fileRef.mediaType === "application/json" || fileRef.path.endsWith(".json");
    const isText = fileRef.mediaType.startsWith("text/");
    if (!isJson && !isText) {
      continue;
    }
    if (isJson && resultPackage.inputs.includes(fileRef)) {
      validateJsonPayload(inspected.path, capability.inputSchema, label, issues);
    } else if (isJson) {
      const compiledSchema = capability.artifactSchemas.get(fileRef.type);
      if (compiledSchema) {
        validateJsonPayload(inspected.path, compiledSchema, label, issues);
      }
    } else {
      validateTextPayload(inspected.path, label, issues);
    }
  }

  return issues;
}

export function loadResultPackage(resultPackagePath, capability) {
  const loaded = readJsonFile(resultPackagePath);
  const root = fs.realpathSync(path.dirname(loaded.path));
  const issues = validateResultPackageValue(loaded.value, root, capability);
  assertValid(`result package ${loaded.path}`, issues);
  return {
    kind:
      loaded.value.schemaVersion === "1.1"
        ? "openquantum-result-package-v1.1"
        : "openquantum-result-package-v1",
    value: loaded.value,
    path: fs.realpathSync(loaded.path),
    root,
    sourceDigest: digestBuffer(Buffer.from(loaded.source, "utf8")),
  };
}
