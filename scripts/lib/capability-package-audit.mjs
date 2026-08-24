import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { parseDocument } from "yaml";

import { loadCapability } from "../../.agents/skill-contracts/index.mjs";

const POLICY_PATH = ".agents/capability-packages.yml";
const PRESET_PATH =
  "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
const LEVELS = Object.freeze(["L0", "L1", "L2", "L3"]);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MCP_PLUGINS = new Set([
  "@deepseek-ai/dsh-mcp-client",
  "./credentialed-mcp-client.mjs",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function readMcpServers(projectRoot, issues) {
  const presetPath = path.join(projectRoot, PRESET_PATH);
  const value = readYaml(presetPath, PRESET_PATH, issues);
  if (!Array.isArray(value)) {
    issues.push(`${PRESET_PATH} must contain a Cordis entry list`);
    return new Map();
  }
  const servers = new Map();
  for (const entry of value) {
    if (!isRecord(entry) || !MCP_PLUGINS.has(entry.name)) continue;
    const config = isRecord(entry.config) ? entry.config : {};
    const serverName = config.serverName;
    if (typeof serverName !== "string" || serverName.length === 0) continue;
    if (servers.has(serverName)) {
      issues.push(`${PRESET_PATH} declares duplicate MCP server ${serverName}`);
      continue;
    }
    servers.set(serverName, {
      args: Array.isArray(config.args)
        ? config.args.filter((argument) => typeof argument === "string")
        : [],
    });
  }
  return servers;
}

function validatePolicy(policy, issues) {
  if (!exactKeys(policy, new Set(["schemaVersion", "packages"]), "policy", issues)) {
    return [];
  }
  if (policy.schemaVersion !== "1.0") {
    issues.push('policy.schemaVersion must equal "1.0"');
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

function validateExecution(definition, projectRoot, servers, issues) {
  const label = `${definition.id}.execution`;
  const levelIndex = LEVELS.indexOf(definition.level);
  if (levelIndex === 0) {
    if (definition.execution !== undefined) {
      issues.push(`${label} is not allowed for L0`);
    }
    return { servers: [], runners: [], checks: [] };
  }
  if (
    !exactKeys(
      definition.execution,
      new Set(["servers", "runners", "checks"]),
      label,
      issues,
    )
  ) {
    return { servers: [], runners: [], checks: [] };
  }
  const serverDefinitions = definition.execution.servers;
  const runners = definition.execution.runners;
  const checks = definition.execution.checks;
  if (!Array.isArray(serverDefinitions)) {
    issues.push(`${label}.servers must be an array`);
  }
  if (!Array.isArray(runners)) {
    issues.push(`${label}.runners must be an array`);
  }
  if (!Array.isArray(checks) || checks.length === 0) {
    issues.push(`${label}.checks must be a non-empty array`);
  }
  const validServerDefinitions = Array.isArray(serverDefinitions)
    ? serverDefinitions
    : [];
  const validRunners = Array.isArray(runners) ? runners : [];
  if (validServerDefinitions.length === 0 && validRunners.length === 0) {
    issues.push(`${label} must declare at least one MCP server or local runner`);
  }
  const seenServers = new Set();
  for (const [index, serverDefinition] of validServerDefinitions.entries()) {
    const serverLabel = `${label}.servers[${index}]`;
    if (
      !exactKeys(
        serverDefinition,
        new Set(["name", "source"]),
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
      issues.push(`${label} declares duplicate server ${serverDefinition.name}`);
      continue;
    }
    seenServers.add(serverDefinition.name);
    if (!new Set(["package", "external"]).has(serverDefinition.source)) {
      issues.push(`${serverLabel}.source must be package or external`);
      continue;
    }
    const actual = servers.get(serverDefinition.name);
    if (!actual) {
      issues.push(`${definition.id}: MCP server ${serverDefinition.name} is not registered`);
      continue;
    }
    const packageFragment = `/.agents/skills/${definition.id}/`;
    const packageBound = actual.args.some((argument) =>
      argument.includes(packageFragment),
    );
    const anyPackageBound = actual.args.some((argument) =>
      argument.includes("/.agents/skills/"),
    );
    if (serverDefinition.source === "package" && !packageBound) {
      issues.push(
        `${definition.id}: MCP server ${serverDefinition.name} does not execute from its capability package`,
      );
    }
    if (serverDefinition.source === "external" && anyPackageBound) {
      issues.push(
        `${definition.id}: external MCP server ${serverDefinition.name} unexpectedly executes package-local code`,
      );
    }
  }
  for (const [index, runner] of validRunners.entries()) {
    inspectFile(projectRoot, runner, `${label}.runners[${index}]`, issues);
  }
  const validChecks = Array.isArray(checks) ? checks : [];
  for (const [index, check] of validChecks.entries()) {
    inspectFile(projectRoot, check, `${label}.checks[${index}]`, issues);
  }
  return {
    servers: validServerDefinitions.map((server) => server.name).filter(Boolean),
    runners: validRunners,
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

async function inspectPackage(definition, projectRoot, servers) {
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
  const execution = validateExecution(definition, projectRoot, servers, issues);
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
      schemaVersion: "1.0",
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
  const servers = readMcpServers(projectRoot, issues);
  const packages = [];
  for (const definition of definitions) {
    if (!isRecord(definition) || !ID.test(definition.id ?? "")) continue;
    packages.push(await inspectPackage(definition, projectRoot, servers));
  }
  issues.push(...packages.flatMap((entry) => entry.issues));
  const levelCounts = Object.fromEntries(
    LEVELS.map((level) => [
      level,
      packages.filter((entry) => entry.level === level).length,
    ]),
  );
  return {
    schemaVersion: "1.0",
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
