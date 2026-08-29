import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { parseDocument } from "yaml";

import { loadCapability } from "../../.agents/skill-contracts/index.mjs";

const POLICY_PATH = ".agents/capability-packages.yml";
const POLICY_SCHEMA_VERSION = "1.1";
const REPORT_SCHEMA_VERSION = "1.1";
const PRESET_PATH =
  "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
const LEVELS = Object.freeze(["L0", "L1", "L2", "L3"]);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOOL_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const SAFE_PATH_SEGMENT = /^[A-Za-z0-9._-]+$/;
const TOOL_EFFECTS = new Set([
  "read-only",
  "workspace-write",
  "external-write",
]);
const ACTIVATIONS = new Set(["always", "conditional", "opt-in"]);
const MCP_EFFECT_EVIDENCE = new Set(["mcp-annotations", "reviewed-source"]);
const NATIVE_EFFECT_EVIDENCE = "conservative-provider";
const MCP_PLUGINS = new Set([
  "@deepseek-ai/dsh-mcp-client",
  "./credentialed-mcp-client.mjs",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function activationOf(entry) {
  if (entry.disabled === true) return "opt-in";
  if (entry.disabled === undefined || entry.disabled === false) return "always";
  return "conditional";
}

function exactKeys(value, allowed, label, issues) {
  if (!isRecord(value)) {
    issues.push(`${label} must be an object`);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(`${label} contains unsupported field ${key}`);
    }
  }
  return true;
}

function hasUnsafeExpressionCharacter(value) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      character === "'" ||
      character === '"' ||
      codePoint <= 0x1f ||
      codePoint === 0x7f
    );
  });
}

function readYaml(filePath, label, issues) {
  let source;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    issues.push(
      `${label} cannot be read: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
  const document = parseDocument(source, {
    schema: "core",
    strict: true,
    uniqueKeys: true,
    merge: false,
  });
  if (document.errors.length > 0) {
    issues.push(
      ...document.errors.map((error) => `${label} is invalid YAML: ${error.message}`),
    );
    return undefined;
  }
  return document.toJS({ maxAliasCount: 20, mapAsMap: false });
}

function inspectFile(projectRoot, relativePath, label, issues) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath)
  ) {
    issues.push(`${label} must be a non-empty project-relative path`);
    return undefined;
  }
  const normalized = path.normalize(relativePath);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    issues.push(`${label} must stay inside the project root`);
    return undefined;
  }
  const candidate = path.resolve(projectRoot, normalized);
  let resolved;
  try {
    const stats = fs.lstatSync(candidate);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      issues.push(`${label} must reference a regular non-symlink file`);
      return undefined;
    }
    resolved = fs.realpathSync(candidate);
  } catch (error) {
    issues.push(
      `${label} cannot be resolved: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
  if (!resolved.startsWith(`${projectRoot}${path.sep}`)) {
    issues.push(`${label} resolves outside the project root`);
    return undefined;
  }
  return resolved;
}

function inspectPackageEntrypoint(
  projectRoot,
  capabilityId,
  relativePath,
  label,
  issues,
) {
  const expectedPrefix = `.agents/skills/${capabilityId}/`;
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    issues.push(`${label} must be a non-empty project-relative path`);
    return undefined;
  }
  const segments = relativePath.split("/");
  if (
    path.posix.isAbsolute(relativePath) ||
    relativePath.includes("\\") ||
    hasUnsafeExpressionCharacter(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath ||
    !relativePath.startsWith(expectedPrefix) ||
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        !SAFE_PATH_SEGMENT.test(segment),
    )
  ) {
    issues.push(
      `${label} must be a safe canonical POSIX path inside ${expectedPrefix}`,
    );
    return undefined;
  }
  return inspectFile(projectRoot, relativePath, label, issues) === undefined
    ? undefined
    : relativePath;
}

function readSkillName(skillPath, label, issues) {
  const source = fs.readFileSync(skillPath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    issues.push(`${label} must begin with YAML frontmatter`);
    return undefined;
  }
  const document = parseDocument(match[1], {
    schema: "core",
    strict: true,
    uniqueKeys: true,
    merge: false,
  });
  if (document.errors.length > 0) {
    issues.push(
      ...document.errors.map((error) => `${label} frontmatter is invalid: ${error.message}`),
    );
    return undefined;
  }
  const frontmatter = document.toJS({ maxAliasCount: 20, mapAsMap: false });
  return isRecord(frontmatter) ? frontmatter.name : undefined;
}

function trackedSkillIds(projectRoot, issues) {
  let output;
  try {
    output = execFileSync(
      "git",
      [
        "ls-files",
        "--cached",
        "--",
        ":(glob).agents/skills/*/SKILL.md",
      ],
      { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    issues.push(
      `tracked Skill inventory cannot be read from Git: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((entry) => entry.split("/")[2])
    .sort();
}

function readExecutionSurface(projectRoot, issues) {
  const presetPath = path.join(projectRoot, PRESET_PATH);
  const value = readYaml(presetPath, PRESET_PATH, issues);
  if (!Array.isArray(value)) {
    issues.push(`${PRESET_PATH} must contain a Cordis entry list`);
    return { mcpServers: new Map(), nativeProviders: new Map() };
  }
  const mcpServers = new Map();
  const nativeProviders = new Map();
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    if (
      typeof entry.id === "string" &&
      entry.id.startsWith("tool-") &&
      typeof entry.name === "string" &&
      entry.name.length > 0
    ) {
      if (nativeProviders.has(entry.name)) {
        issues.push(
          `${PRESET_PATH} declares duplicate native Tool Provider ${entry.name}`,
        );
      } else {
        nativeProviders.set(entry.name, {
          id: entry.id,
          activation: activationOf(entry),
        });
      }
    }
    if (!MCP_PLUGINS.has(entry.name)) continue;
    const config = isRecord(entry.config) ? entry.config : {};
    const serverName = config.serverName;
    if (typeof serverName !== "string" || serverName.length === 0) continue;
    if (mcpServers.has(serverName)) {
      issues.push(`${PRESET_PATH} declares duplicate MCP server ${serverName}`);
      continue;
    }
    mcpServers.set(serverName, {
      command: config.command,
      args: Array.isArray(config.args) ? [...config.args] : [],
      cwd: config.cwd,
      activation: activationOf(entry),
    });
  }
  return { mcpServers, nativeProviders };
}

function validatePolicy(policy, issues) {
  if (!exactKeys(policy, new Set(["schemaVersion", "packages"]), "policy", issues)) {
    return [];
  }
  if (policy.schemaVersion !== POLICY_SCHEMA_VERSION) {
    issues.push(
      `policy.schemaVersion must equal "${POLICY_SCHEMA_VERSION}"`,
    );
  }
  if (!Array.isArray(policy.packages)) {
    issues.push("policy.packages must be an array");
    return [];
  }
  const seen = new Set();
  for (const [index, definition] of policy.packages.entries()) {
    const label = `policy.packages[${index}]`;
    if (
      !exactKeys(
        definition,
        new Set(["id", "level", "execution", "audit", "materialization"]),
        label,
        issues,
      )
    ) {
      continue;
    }
    if (typeof definition.id !== "string" || !ID.test(definition.id)) {
      issues.push(`${label}.id must be a kebab-case capability id`);
    } else if (seen.has(definition.id)) {
      issues.push(`policy contains duplicate capability ${definition.id}`);
    } else {
      seen.add(definition.id);
    }
    if (!LEVELS.includes(definition.level)) {
      issues.push(`${label}.level must be one of ${LEVELS.join(", ")}`);
    }
  }
  return policy.packages;
}

function validateExecution(definition, projectRoot, surface, issues) {
  const label = `${definition.id}.execution`;
  const levelIndex = LEVELS.indexOf(definition.level);
  if (levelIndex === 0) {
    if (definition.execution !== undefined) {
      issues.push(`${label} is not allowed for L0`);
    }
    return { mcpServers: [], nativeTools: [], checks: [] };
  }
  if (isRecord(definition.execution)) {
    if (Object.hasOwn(definition.execution, "servers")) {
      issues.push(`${label}.servers was renamed to mcpServers in policy v1.1`);
    }
    if (Object.hasOwn(definition.execution, "runners")) {
      issues.push(
        `${label}.runners is no longer an execution entry in policy v1.1; expose actions through a Tool Provider`,
      );
    }
    if (Object.hasOwn(definition.execution, "localRunners")) {
      issues.push(
        `${label}.localRunners is not allowed; Agent execution must enter through a declared Tool`,
      );
    }
  }
  if (
    !exactKeys(
      definition.execution,
      new Set(["mcpServers", "nativeTools", "checks"]),
      label,
      issues,
    )
  ) {
    return { mcpServers: [], nativeTools: [], checks: [] };
  }
  const serverDefinitions = definition.execution.mcpServers;
  const nativeToolDefinitions = definition.execution.nativeTools;
  const checks = definition.execution.checks;
  if (!Array.isArray(serverDefinitions)) {
    issues.push(`${label}.mcpServers must be an array`);
  }
  if (!Array.isArray(nativeToolDefinitions)) {
    issues.push(`${label}.nativeTools must be an array`);
  }
  if (!Array.isArray(checks) || checks.length === 0) {
    issues.push(`${label}.checks must be a non-empty array`);
  }
  const validServerDefinitions = Array.isArray(serverDefinitions)
    ? serverDefinitions
    : [];
  const validNativeTools = Array.isArray(nativeToolDefinitions)
    ? nativeToolDefinitions
    : [];
  const normalizedServers = [];
  let declaredToolCount = 0;
  const seenServers = new Set();
  for (const [index, serverDefinition] of validServerDefinitions.entries()) {
    const serverLabel = `${label}.mcpServers[${index}]`;
    if (
      !exactKeys(
        serverDefinition,
        new Set([
          "name",
          "source",
          "entrypoint",
          "activation",
          "contractCheck",
          "effectEvidence",
          "effectEvidenceRef",
          "tools",
        ]),
        serverLabel,
        issues,
      )
    ) {
      continue;
    }
    if (
      typeof serverDefinition.name !== "string" ||
      serverDefinition.name.length === 0
    ) {
      issues.push(`${serverLabel}.name must be a non-empty string`);
      continue;
    }
    if (seenServers.has(serverDefinition.name)) {
      issues.push(
        `${label} declares duplicate MCP server ${serverDefinition.name}`,
      );
      continue;
    }
    seenServers.add(serverDefinition.name);
    if (!new Set(["package", "external"]).has(serverDefinition.source)) {
      issues.push(`${serverLabel}.source must be package or external`);
    }
    let validatedPackageEntrypoint;
    if (serverDefinition.source === "package") {
      validatedPackageEntrypoint = inspectPackageEntrypoint(
        projectRoot,
        definition.id,
        serverDefinition.entrypoint,
        `${definition.id}: MCP server ${serverDefinition.name} entrypoint`,
        issues,
      );
    } else if (
      serverDefinition.source === "external" &&
      serverDefinition.entrypoint !== undefined
    ) {
      issues.push(`${serverLabel}.entrypoint is only allowed for package sources`);
    }
    if (!ACTIVATIONS.has(serverDefinition.activation)) {
      issues.push(
        `${serverLabel}.activation must be one of ${[...ACTIVATIONS].join(", ")}`,
      );
    }
    inspectFile(
      projectRoot,
      serverDefinition.contractCheck,
      `${serverLabel}.contractCheck`,
      issues,
    );
    if (!MCP_EFFECT_EVIDENCE.has(serverDefinition.effectEvidence)) {
      issues.push(
        `${serverLabel}.effectEvidence must be one of ${[...MCP_EFFECT_EVIDENCE].join(", ")}`,
      );
    }
    if (serverDefinition.effectEvidence === "reviewed-source") {
      inspectFile(
        projectRoot,
        serverDefinition.effectEvidenceRef,
        `${serverLabel}.effectEvidenceRef`,
        issues,
      );
    } else if (serverDefinition.effectEvidenceRef !== undefined) {
      issues.push(
        `${serverLabel}.effectEvidenceRef is only allowed for reviewed-source evidence`,
      );
    }
    const toolDefinitions = serverDefinition.tools;
    if (!Array.isArray(toolDefinitions) || toolDefinitions.length === 0) {
      issues.push(`${serverLabel}.tools must be a non-empty array`);
    }
    const normalizedTools = [];
    const seenTools = new Set();
    for (const [toolIndex, toolDefinition] of (
      Array.isArray(toolDefinitions) ? toolDefinitions : []
    ).entries()) {
      const toolLabel = `${serverLabel}.tools[${toolIndex}]`;
      if (
        !exactKeys(
          toolDefinition,
          new Set(["name", "effect"]),
          toolLabel,
          issues,
        )
      ) {
        continue;
      }
      if (
        typeof toolDefinition.name !== "string" ||
        !TOOL_NAME.test(toolDefinition.name)
      ) {
        issues.push(`${toolLabel}.name must be a valid Tool name`);
        continue;
      }
      if (seenTools.has(toolDefinition.name)) {
        issues.push(
          `${serverLabel} declares duplicate Tool ${toolDefinition.name}`,
        );
        continue;
      }
      seenTools.add(toolDefinition.name);
      if (!TOOL_EFFECTS.has(toolDefinition.effect)) {
        issues.push(
          `${toolLabel}.effect must be one of ${[...TOOL_EFFECTS].join(", ")}`,
        );
        continue;
      }
      normalizedTools.push({
        name: toolDefinition.name,
        effect: toolDefinition.effect,
      });
    }
    declaredToolCount += normalizedTools.length;
    normalizedServers.push({
      name: serverDefinition.name,
      source: serverDefinition.source,
      ...(typeof serverDefinition.entrypoint === "string"
        ? { entrypoint: serverDefinition.entrypoint }
        : {}),
      activation: serverDefinition.activation,
      contractCheck: serverDefinition.contractCheck,
      effectEvidence: serverDefinition.effectEvidence,
      ...(typeof serverDefinition.effectEvidenceRef === "string"
        ? { effectEvidenceRef: serverDefinition.effectEvidenceRef }
        : {}),
      tools: normalizedTools,
    });
    const actual = surface.mcpServers.get(serverDefinition.name);
    if (!actual) {
      issues.push(
        `${definition.id}: MCP server ${serverDefinition.name} is not declared by an MCP Client in the Agent Preset`,
      );
      continue;
    }
    if (actual.activation !== serverDefinition.activation) {
      issues.push(
        `${definition.id}: MCP server ${serverDefinition.name} activation is ${actual.activation} in the Agent Preset, not ${serverDefinition.activation}`,
      );
    }
    const packageArguments = actual.args.filter(
      (argument) =>
        typeof argument === "string" &&
        argument.includes(".agents/skills/"),
    );
    if (serverDefinition.source === "package") {
      const expectedArgument =
        validatedPackageEntrypoint !== undefined
          ? `process.cwd() + '/${validatedPackageEntrypoint}'`
          : undefined;
      const canonicalPackageEntrypoint =
        validatedPackageEntrypoint !== undefined &&
        actual.command === "process.execPath" &&
        actual.cwd === "process.cwd()" &&
        actual.args.length === 1 &&
        typeof actual.args[0] === "string" &&
        packageArguments.length === 1 &&
        packageArguments[0] === expectedArgument;
      if (!canonicalPackageEntrypoint) {
        issues.push(
          `${definition.id}: MCP server ${serverDefinition.name} does not use its declared package entrypoint as the unique Node launch target`,
        );
      }
    }
    if (serverDefinition.source === "external" && packageArguments.length > 0) {
      issues.push(
        `${definition.id}: external MCP server ${serverDefinition.name} unexpectedly executes package-local code`,
      );
    }
  }
  const seenNativeTools = new Set();
  const normalizedNativeTools = [];
  for (const [index, toolDefinition] of validNativeTools.entries()) {
    const toolLabel = `${label}.nativeTools[${index}]`;
    if (
      !exactKeys(
        toolDefinition,
        new Set([
          "name",
          "providerPlugin",
          "activation",
          "contractCheck",
          "effect",
          "effectEvidence",
        ]),
        toolLabel,
        issues,
      )
    ) {
      continue;
    }
    if (
      typeof toolDefinition.name !== "string" ||
      !TOOL_NAME.test(toolDefinition.name)
    ) {
      issues.push(`${toolLabel}.name must be a valid Tool name`);
      continue;
    }
    if (seenNativeTools.has(toolDefinition.name)) {
      issues.push(
        `${label} declares duplicate native Tool ${toolDefinition.name}`,
      );
      continue;
    }
    seenNativeTools.add(toolDefinition.name);
    if (
      typeof toolDefinition.providerPlugin !== "string" ||
      toolDefinition.providerPlugin.length === 0
    ) {
      issues.push(`${toolLabel}.providerPlugin must be a non-empty string`);
      continue;
    }
    if (!ACTIVATIONS.has(toolDefinition.activation)) {
      issues.push(
        `${toolLabel}.activation must be one of ${[...ACTIVATIONS].join(", ")}`,
      );
    }
    inspectFile(
      projectRoot,
      toolDefinition.contractCheck,
      `${toolLabel}.contractCheck`,
      issues,
    );
    if (!TOOL_EFFECTS.has(toolDefinition.effect)) {
      issues.push(
        `${toolLabel}.effect must be one of ${[...TOOL_EFFECTS].join(", ")}`,
      );
      continue;
    }
    if (toolDefinition.effectEvidence !== NATIVE_EFFECT_EVIDENCE) {
      issues.push(
        `${toolLabel}.effectEvidence must equal ${NATIVE_EFFECT_EVIDENCE}`,
      );
    }
    normalizedNativeTools.push({
      name: toolDefinition.name,
      providerPlugin: toolDefinition.providerPlugin,
      activation: toolDefinition.activation,
      contractCheck: toolDefinition.contractCheck,
      effect: toolDefinition.effect,
      effectEvidence: toolDefinition.effectEvidence,
    });
    declaredToolCount += 1;
    const actualProvider = surface.nativeProviders.get(
      toolDefinition.providerPlugin,
    );
    if (!actualProvider) {
      issues.push(
        `${definition.id}: native Tool ${toolDefinition.name} provider ${toolDefinition.providerPlugin} is not declared in the Agent Preset`,
      );
    } else if (actualProvider.activation !== toolDefinition.activation) {
      issues.push(
        `${definition.id}: native Tool ${toolDefinition.name} activation is ${actualProvider.activation} in the Agent Preset, not ${toolDefinition.activation}`,
      );
    }
  }
  if (declaredToolCount === 0) {
    issues.push(`${label} must declare at least one Tool contract`);
  }
  const validChecks = Array.isArray(checks) ? checks : [];
  for (const [index, check] of validChecks.entries()) {
    inspectFile(projectRoot, check, `${label}.checks[${index}]`, issues);
  }
  return {
    mcpServers: normalizedServers,
    nativeTools: normalizedNativeTools,
    checks: validChecks,
  };
}

async function validateAudit(definition, projectRoot, packageRoot, issues) {
  const levelIndex = LEVELS.indexOf(definition.level);
  const label = `${definition.id}.audit`;
  const capabilityPath = path.join(packageRoot, "capability.yaml");
  const hasCapability = fs.existsSync(capabilityPath);
  if (levelIndex < 2) {
    if (definition.audit !== undefined || hasCapability) {
      issues.push(`${definition.id}: capability.yaml requires conformance level L2 or L3`);
    }
    return null;
  }
  if (!exactKeys(definition.audit, new Set(["manifest"]), label, issues)) {
    return null;
  }
  if (definition.audit.manifest !== "capability.yaml") {
    issues.push(`${label}.manifest must equal capability.yaml`);
    return null;
  }
  inspectFile(
    projectRoot,
    path.relative(projectRoot, capabilityPath),
    `${label}.manifest`,
    issues,
  );
  try {
    const capability = await loadCapability(packageRoot);
    return {
      manifest: path.relative(projectRoot, capability.manifestPath),
      schemaVersion: capability.manifest.schemaVersion,
      version: capability.manifest.version,
    };
  } catch (error) {
    const details = Array.isArray(error?.issues) ? error.issues : [error?.message];
    issues.push(
      ...details.filter(Boolean).map((detail) => `${definition.id}: ${detail}`),
    );
    return null;
  }
}

function validateMaterialization(definition, projectRoot, issues) {
  const levelIndex = LEVELS.indexOf(definition.level);
  const label = `${definition.id}.materialization`;
  if (levelIndex < 3) {
    if (definition.materialization !== undefined) {
      issues.push(`${label} is only allowed for L3`);
    }
    return null;
  }
  if (
    !exactKeys(
      definition.materialization,
      new Set(["adapter", "checks"]),
      label,
      issues,
    )
  ) {
    return null;
  }
  inspectFile(
    projectRoot,
    definition.materialization.adapter,
    `${label}.adapter`,
    issues,
  );
  if (
    !Array.isArray(definition.materialization.checks) ||
    definition.materialization.checks.length === 0
  ) {
    issues.push(`${label}.checks must be a non-empty array`);
    return null;
  }
  for (const [index, check] of definition.materialization.checks.entries()) {
    inspectFile(projectRoot, check, `${label}.checks[${index}]`, issues);
  }
  return {
    adapter: definition.materialization.adapter,
    checks: definition.materialization.checks,
  };
}

async function inspectPackage(definition, projectRoot, executionSurface) {
  const issues = [];
  const packageRoot = path.join(projectRoot, ".agents", "skills", definition.id);
  const skillRelative = `.agents/skills/${definition.id}/SKILL.md`;
  const skillPath = inspectFile(projectRoot, skillRelative, `${definition.id}.skill`, issues);
  if (skillPath) {
    const skillName = readSkillName(skillPath, `${definition.id}.skill`, issues);
    if (skillName !== definition.id) {
      issues.push(
        `${definition.id}: SKILL frontmatter name must equal the package id`,
      );
    }
  }
  const pythonProject = path.join(packageRoot, "pyproject.toml");
  if (fs.existsSync(pythonProject)) {
    inspectFile(
      projectRoot,
      `.agents/skills/${definition.id}/uv.lock`,
      `${definition.id}.pythonLock`,
      issues,
    );
  }
  const execution = validateExecution(
    definition,
    projectRoot,
    executionSurface,
    issues,
  );
  const audit = await validateAudit(
    definition,
    projectRoot,
    packageRoot,
    issues,
  );
  const materialization = validateMaterialization(
    definition,
    projectRoot,
    issues,
  );
  return {
    id: definition.id,
    level: definition.level,
    status: issues.length === 0 ? "pass" : "fail",
    skill: skillRelative,
    execution,
    audit,
    materialization,
    issues,
  };
}

export async function auditCapabilityPackages(options = {}) {
  const requestedRoot = path.resolve(options.projectRoot ?? process.cwd());
  let projectRoot;
  try {
    projectRoot = fs.realpathSync(requestedRoot);
  } catch (error) {
    return {
      schemaVersion: REPORT_SCHEMA_VERSION,
      scope: "static-declaration",
      status: "fail",
      packages: [],
      summary: {
        packageCount: 0,
        levelCounts: { L0: 0, L1: 0, L2: 0, L3: 0 },
        issueCount: 1,
      },
      issues: [
        `project root cannot be resolved: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
  const issues = [];
  const policy = readYaml(
    path.join(projectRoot, POLICY_PATH),
    POLICY_PATH,
    issues,
  );
  const definitions = validatePolicy(policy, issues);
  const definitionIds = definitions
    .map((definition) => definition?.id)
    .filter((id) => typeof id === "string")
    .sort();
  const trackedIds = trackedSkillIds(projectRoot, issues);
  for (const id of trackedIds) {
    if (!definitionIds.includes(id)) {
      issues.push(`tracked capability ${id} is missing from ${POLICY_PATH}`);
    }
  }
  for (const id of definitionIds) {
    if (!trackedIds.includes(id)) {
      issues.push(`${POLICY_PATH} declares non-tracked capability ${id}`);
    }
  }
  const executionSurface = readExecutionSurface(projectRoot, issues);
  const packages = [];
  for (const definition of definitions) {
    if (!isRecord(definition) || !ID.test(definition.id ?? "")) continue;
    packages.push(
      await inspectPackage(definition, projectRoot, executionSurface),
    );
  }
  issues.push(...packages.flatMap((entry) => entry.issues));
  const levelCounts = Object.fromEntries(
    LEVELS.map((level) => [
      level,
      packages.filter((entry) => entry.level === level).length,
    ]),
  );
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    scope: "static-declaration",
    status: issues.length === 0 ? "pass" : "fail",
    packages,
    summary: {
      packageCount: packages.length,
      levelCounts,
      issueCount: issues.length,
    },
    issues,
  };
}
