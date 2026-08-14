import fs from "node:fs";
import path from "node:path";

import { parseDocument } from "yaml";

import { assertValid } from "./errors.mjs";
import {
  collectDuplicateIssues,
  compileSchemaFile,
  digestFile,
  findSecretViolations,
  inspectContainedFile,
  readJsonFile,
  readYamlFile,
  validateContractSchema,
} from "./shared.mjs";

function resolveManifestLocation(rootOrManifest) {
  const candidate = path.resolve(rootOrManifest);
  let stats;
  try {
    stats = fs.statSync(candidate);
  } catch {
    return {
      manifestPath: candidate.endsWith("capability.yaml")
        ? candidate
        : path.join(candidate, "capability.yaml"),
      root: candidate.endsWith("capability.yaml") ? path.dirname(candidate) : candidate,
    };
  }
  if (stats.isDirectory()) {
    return { root: candidate, manifestPath: path.join(candidate, "capability.yaml") };
  }
  return { root: path.dirname(candidate), manifestPath: candidate };
}

function readSkillName(entrypointPath) {
  const source = fs.readFileSync(entrypointPath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { issues: ["skill entrypoint must begin with YAML frontmatter"] };
  }

  const document = parseDocument(match[1], {
    schema: "core",
    strict: true,
    uniqueKeys: true,
    merge: false,
  });
  if (document.errors.length > 0) {
    return {
      issues: document.errors.map((error) => `invalid SKILL frontmatter: ${error.message}`),
    };
  }
  const frontmatter = document.toJS({ maxAliasCount: 20, mapAsMap: false });
  return {
    issues: [],
    name:
      frontmatter && typeof frontmatter === "object" && !Array.isArray(frontmatter)
        ? frontmatter.name
        : undefined,
  };
}

function validateNodeCommand(command, root, label, issues, referencedFiles) {
  if (!command || typeof command !== "object") {
    return;
  }
  if (command.executable !== "node") {
    issues.push(`${label}.executable must be node`);
  }
  if (command.shell !== false) {
    issues.push(`${label}.shell must be false`);
  }
  if (typeof command.script !== "string" || !command.script.endsWith(".mjs")) {
    issues.push(`${label}.script must be a package-local .mjs file`);
    return;
  }
  const inspected = inspectContainedFile(root, command.script, `${label}.script`);
  issues.push(...inspected.issues);
  if (inspected.path) {
    referencedFiles.set(`${label}.script`, inspected.path);
  }
}

function contractSchemaName(schemaVersion) {
  return schemaVersion === "1.1"
    ? "v1.1/capability-manifest.schema.json"
    : "capability-manifest.schema.json";
}

function loadDefinition(options) {
  const {
    root,
    reference,
    schemaName,
    label,
    issues,
    referencedFiles,
  } = options;
  const inspected = inspectContainedFile(root, reference.definition.path, `${label}.definition.path`);
  issues.push(...inspected.issues);
  if (!inspected.path) {
    return undefined;
  }
  referencedFiles.set(`${label}.definition.path`, inspected.path);
  const sourceDigest = digestFile(inspected.path);
  if (sourceDigest !== reference.definition.sha256) {
    issues.push(`${label} definition sha256 does not match its file`);
  }

  let definition;
  try {
    definition = readJsonFile(inspected.path).value;
  } catch (error) {
    issues.push(...(error.issues ?? [error.message]));
    return undefined;
  }
  const definitionSchemaIssues = validateContractSchema(schemaName, definition);
  issues.push(
    ...definitionSchemaIssues.map((issue) => `${label} definition ${issue}`),
    ...findSecretViolations(definition, `${label}.definition`),
  );
  if (definitionSchemaIssues.length > 0) {
    return undefined;
  }
  if (definition.id !== reference.id) {
    issues.push(`${label} definition id must equal ${reference.id}`);
  }
  if (definition.version !== reference.version) {
    issues.push(`${label} definition version must equal ${reference.version}`);
  }
  issues.push(
    ...collectDuplicateIssues(definition.checks, (item) => item.id, `check id in ${label}`),
  );
  return { ...definition, path: inspected.path, sha256: sourceDigest };
}

function loadEvaluationSuite(root, suiteReference, issues, referencedFiles) {
  const inspected = inspectContainedFile(root, suiteReference.path, "evals.suite.path");
  issues.push(...inspected.issues);
  if (!inspected.path) {
    return undefined;
  }
  referencedFiles.set("evals.suite.path", inspected.path);
  const sourceDigest = digestFile(inspected.path);
  if (sourceDigest !== suiteReference.sha256) {
    issues.push("evaluation suite sha256 does not match its file");
  }

  let suite;
  try {
    suite = readJsonFile(inspected.path).value;
  } catch (error) {
    issues.push(...(error.issues ?? [error.message]));
    return undefined;
  }
  const suiteSchemaIssues = validateContractSchema(
    "v1.1/evaluation-suite.schema.json",
    suite,
  );
  issues.push(
    ...suiteSchemaIssues.map((issue) => `evaluation suite ${issue}`),
    ...findSecretViolations(suite, "evaluationSuite"),
  );
  if (suiteSchemaIssues.length > 0) {
    return undefined;
  }
  if (suite.id !== suiteReference.id) {
    issues.push(`evaluation suite id must equal ${suiteReference.id}`);
  }
  if (suite.version !== suiteReference.version) {
    issues.push(`evaluation suite version must equal ${suiteReference.version}`);
  }
  if (suite.metric.maximum <= suite.metric.minimum) {
    issues.push("evaluation suite metric.maximum must be greater than metric.minimum");
  }
  issues.push(...collectDuplicateIssues(suite.cases, (item) => item.id, "evaluation case id"));
  if (suite.cases.reduce((total, item) => total + item.weight, 0) <= 0) {
    issues.push("evaluation suite case weights must have a positive total");
  }
  return { ...suite, path: inspected.path, sha256: sourceDigest };
}

export async function loadCapability(rootOrManifest) {
  const location = resolveManifestLocation(rootOrManifest);
  const { value: manifest, path: manifestPath } = readYamlFile(location.manifestPath);
  const schemaIssues = validateContractSchema(
    contractSchemaName(manifest?.schemaVersion),
    manifest,
  );
  const issues = [...schemaIssues, ...findSecretViolations(manifest, "manifest")];

  if (schemaIssues.length > 0) {
    assertValid(`capability manifest ${manifestPath}`, issues);
  }

  let root;
  try {
    root = fs.realpathSync(location.root);
  } catch (error) {
    issues.push(
      `skill root cannot be resolved: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    assertValid(`capability manifest ${manifestPath}`, issues);
  }

  if (path.basename(root) !== manifest.id) {
    issues.push(`manifest id must equal skill directory name ${path.basename(root)}`);
  }

  issues.push(...collectDuplicateIssues(manifest.artifacts, (item) => item.id, "artifact id"));
  issues.push(...collectDuplicateIssues(manifest.validators, (item) => item.id, "validator id"));
  issues.push(
    ...collectDuplicateIssues(
      manifest.acceptanceProfiles,
      (item) => item.id,
      "acceptance profile id",
    ),
  );
  if (manifest.schemaVersion === "1.1") {
    issues.push(
      ...collectDuplicateIssues(
        manifest.reproductionProfiles,
        (item) => item.id,
        "reproduction profile id",
      ),
    );
    issues.push(
      ...collectDuplicateIssues(
        [...manifest.acceptanceProfiles, ...manifest.reproductionProfiles],
        (item) => item.definition.path,
        "profile definition path",
      ),
    );
  }
  issues.push(
    ...collectDuplicateIssues(manifest.maturity.evidence, (item) => item.id, "maturity evidence id"),
  );
  if (manifest.dependencies) {
    issues.push(
      ...collectDuplicateIssues(
        manifest.dependencies,
        (item) => `${item.kind}:${item.id}`,
        "dependency id",
      ),
    );
  }

  const validatorIds = new Set(manifest.validators.map((validator) => validator.id));
  for (const profile of manifest.acceptanceProfiles) {
    if (!validatorIds.has(profile.validator)) {
      issues.push(
        `acceptance profile ${profile.id} references unknown validator ${profile.validator}`,
      );
    }
    if (manifest.schemaVersion === "1.0") {
      issues.push(
        ...collectDuplicateIssues(
          profile.checks,
          (item) => item.id,
          `check id in acceptance profile ${profile.id}`,
        ),
      );
    }
  }
  if (manifest.schemaVersion === "1.1") {
    for (const profile of manifest.reproductionProfiles) {
      if (!validatorIds.has(profile.validator)) {
        issues.push(
          `reproduction profile ${profile.id} references unknown validator ${profile.validator}`,
        );
      }
    }
  }

  const referencedFiles = new Map();
  const entrypoint = inspectContainedFile(root, manifest.skill.entrypoint, "skill.entrypoint");
  issues.push(...entrypoint.issues);
  if (entrypoint.path) {
    referencedFiles.set("skill.entrypoint", entrypoint.path);
    const frontmatter = readSkillName(entrypoint.path);
    issues.push(...frontmatter.issues);
    if (frontmatter.name !== manifest.skill.name) {
      issues.push(
        `SKILL frontmatter name must equal skill.name ${manifest.skill.name}, received ${String(
          frontmatter.name,
        )}`,
      );
    }
  }
  if (manifest.skill.name !== manifest.id) {
    issues.push("skill.name must equal manifest id");
  }

  const inputSchemaFile = inspectContainedFile(root, manifest.input.schema, "input.schema");
  issues.push(...inputSchemaFile.issues);
  let inputSchema;
  if (inputSchemaFile.path) {
    referencedFiles.set("input.schema", inputSchemaFile.path);
    try {
      inputSchema = compileSchemaFile(inputSchemaFile.path);
    } catch (error) {
      issues.push(...(error.issues ?? [error.message]));
    }
  }

  const artifactSchemas = new Map();
  for (const artifact of manifest.artifacts) {
    const inspected = inspectContainedFile(
      root,
      artifact.schema,
      `artifacts.${artifact.id}.schema`,
    );
    issues.push(...inspected.issues);
    if (inspected.path) {
      referencedFiles.set(`artifacts.${artifact.id}.schema`, inspected.path);
      try {
        artifactSchemas.set(artifact.id, compileSchemaFile(inspected.path));
      } catch (error) {
        issues.push(...(error.issues ?? [error.message]));
      }
    }
  }

  for (const validator of manifest.validators) {
    validateNodeCommand(
      validator.command,
      root,
      `validators.${validator.id}.command`,
      issues,
      referencedFiles,
    );
  }
  validateNodeCommand(
    manifest.evals.runner,
    root,
    "evals.runner",
    issues,
    referencedFiles,
  );
  const acceptanceProfileDefinitions = new Map();
  const reproductionProfileDefinitions = new Map();
  let evaluationSuite;
  if (manifest.schemaVersion === "1.1") {
    for (const profile of manifest.acceptanceProfiles) {
      const definition = loadDefinition({
        root,
        reference: profile,
        schemaName: "v1.1/acceptance-profile.schema.json",
        label: `acceptance profile ${profile.id}`,
        issues,
        referencedFiles,
      });
      if (definition) {
        acceptanceProfileDefinitions.set(profile.id, definition);
      }
    }
    for (const profile of manifest.reproductionProfiles) {
      const definition = loadDefinition({
        root,
        reference: profile,
        schemaName: "v1.1/reproduction-profile.schema.json",
        label: `reproduction profile ${profile.id}`,
        issues,
        referencedFiles,
      });
      if (definition) {
        const independenceCheck = definition.checks.find(
          (check) => check.id === definition.independenceCheck,
        );
        if (!independenceCheck) {
          issues.push(
            `reproduction profile ${profile.id} independenceCheck references an unknown check`,
          );
        } else if (!independenceCheck.required) {
          issues.push(
            `reproduction profile ${profile.id} independenceCheck must reference a required check`,
          );
        }
        reproductionProfileDefinitions.set(profile.id, definition);
      }
    }
    evaluationSuite = loadEvaluationSuite(
      root,
      manifest.evals.suite,
      issues,
      referencedFiles,
    );
  } else {
    const casesFile = inspectContainedFile(root, manifest.evals.cases, "evals.cases");
    issues.push(...casesFile.issues);
    if (casesFile.path) {
      referencedFiles.set("evals.cases", casesFile.path);
    }
  }

  for (const evidence of manifest.maturity.evidence) {
    const inspected = inspectContainedFile(
      root,
      evidence.path,
      `maturity.evidence.${evidence.id}.path`,
    );
    issues.push(...inspected.issues);
    if (inspected.path) {
      referencedFiles.set(`maturity.evidence.${evidence.id}.path`, inspected.path);
      if (digestFile(inspected.path) !== evidence.sha256) {
        issues.push(`maturity evidence ${evidence.id} sha256 does not match its file`);
      }
    }
  }

  const evidenceKinds = new Set(manifest.maturity.evidence.map((item) => item.kind));
  const hasValidationEvidence =
    evidenceKinds.has("validator-report") || evidenceKinds.has("scientific-review");
  if (
    ["validated", "released"].includes(manifest.maturity.status) &&
    !hasValidationEvidence
  ) {
    issues.push(
      `maturity ${manifest.maturity.status} requires validator-report or scientific-review evidence`,
    );
  }
  if (manifest.maturity.status === "released" && !evidenceKinds.has("release-record")) {
    issues.push("maturity released requires release-record evidence");
  }

  if (manifest.permissions.network.mode === "none" && manifest.permissions.network.destinations.length) {
    issues.push("network destinations must be empty when network mode is none");
  }
  if (
    manifest.permissions.cloudCompute.allowed === false &&
    manifest.permissions.cloudCompute.providers.length > 0
  ) {
    issues.push("cloudCompute providers must be empty when cloud compute is not allowed");
  }
  if (
    manifest.permissions.subprocess.allowed === false &&
    (manifest.permissions.subprocess.commands?.length ?? 0) > 0
  ) {
    issues.push("subprocess commands must be empty when subprocess is not allowed");
  }

  assertValid(`capability manifest ${manifestPath}`, issues);

  return {
    kind:
      manifest.schemaVersion === "1.1"
        ? "openquantum-capability-v1.1"
        : "openquantum-capability-v1",
    manifest,
    manifestPath: fs.realpathSync(manifestPath),
    root,
    inputSchema,
    artifactSchemas,
    referencedFiles,
    acceptanceProfileDefinitions,
    reproductionProfileDefinitions,
    evaluationSuite,
  };
}
