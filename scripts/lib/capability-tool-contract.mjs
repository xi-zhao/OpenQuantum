import fs from "node:fs";
import path from "node:path";

import { parseDocument } from "yaml";

const POLICY_PATH = ".agents/capability-packages.yml";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function requiredProjectFile(projectRoot, value, label) {
  const relativePath = requiredString(value, label);
  if (path.isAbsolute(relativePath)) {
    throw new TypeError(`${label} must be a project-relative path`);
  }
  const candidate = path.resolve(projectRoot, relativePath);
  const stats = fs.lstatSync(candidate);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new TypeError(`${label} must reference a regular non-symlink file`);
  }
  const resolved = fs.realpathSync(candidate);
  if (!resolved.startsWith(`${projectRoot}${path.sep}`)) {
    throw new TypeError(`${label} must stay inside the project root`);
  }
  return relativePath;
}

function readPolicy(projectRoot) {
  const policyPath = path.join(projectRoot, POLICY_PATH);
  const document = parseDocument(fs.readFileSync(policyPath, "utf8"), {
    schema: "core",
    strict: true,
    uniqueKeys: true,
    merge: false,
  });
  if (document.errors.length > 0) {
    throw new Error(
      `${POLICY_PATH} is invalid YAML: ${document.errors[0].message}`,
    );
  }
  const policy = document.toJS({ maxAliasCount: 20, mapAsMap: false });
  if (!isRecord(policy) || !Array.isArray(policy.packages)) {
    throw new TypeError(`${POLICY_PATH} must contain a packages array`);
  }
  return policy;
}

/**
 * Read the canonical static Tool contract for one MCP Server.
 * Runtime tests use this Interface so policy and tools/list cannot drift apart.
 */
export function readDeclaredMcpToolContract(options) {
  if (!isRecord(options)) {
    throw new TypeError("options must be an object");
  }
  const projectRoot = fs.realpathSync(
    path.resolve(requiredString(options.projectRoot, "projectRoot")),
  );
  const capabilityId = requiredString(options.capabilityId, "capabilityId");
  const serverName = requiredString(options.serverName, "serverName");
  const policy = readPolicy(projectRoot);
  const packages = policy.packages.filter(
    (definition) => isRecord(definition) && definition.id === capabilityId,
  );
  if (packages.length !== 1) {
    throw new Error(
      `${POLICY_PATH} must declare capability ${capabilityId} exactly once`,
    );
  }
  const servers = packages[0].execution?.mcpServers;
  if (!Array.isArray(servers)) {
    throw new TypeError(`${capabilityId}.execution.mcpServers must be an array`);
  }
  const matches = servers.filter(
    (definition) => isRecord(definition) && definition.name === serverName,
  );
  if (matches.length !== 1) {
    throw new Error(
      `${capabilityId} must declare MCP server ${serverName} exactly once`,
    );
  }
  if (!Array.isArray(matches[0].tools) || matches[0].tools.length === 0) {
    throw new TypeError(
      `${capabilityId}.${serverName}.tools must be a non-empty array`,
    );
  }
  const effectEvidence = requiredString(
    matches[0].effectEvidence,
    `${capabilityId}.${serverName}.effectEvidence`,
  );
  const effectEvidenceRef = matches[0].effectEvidenceRef === undefined
    ? undefined
    : requiredString(
      matches[0].effectEvidenceRef,
      `${capabilityId}.${serverName}.effectEvidenceRef`,
    );
  const seen = new Set();
  const tools = matches[0].tools.map((tool, index) => {
    if (!isRecord(tool)) {
      throw new TypeError(
        `${capabilityId}.${serverName}.tools[${index}] must be an object`,
      );
    }
    const name = requiredString(
      tool.name,
      `${capabilityId}.${serverName}.tools[${index}].name`,
    );
    const effect = requiredString(
      tool.effect,
      `${capabilityId}.${serverName}.tools[${index}].effect`,
    );
    if (seen.has(name)) {
      throw new Error(`${capabilityId}.${serverName} repeats Tool ${name}`);
    }
    seen.add(name);
    return Object.freeze({
      name,
      effect,
      effectEvidence,
      ...(effectEvidenceRef ? { effectEvidenceRef } : {}),
    });
  });
  return Object.freeze(tools);
}

/** Read the canonical static Tool contracts supplied by native Tool Plugins. */
export function readDeclaredNativeToolContracts(options) {
  if (!isRecord(options)) {
    throw new TypeError("options must be an object");
  }
  const projectRoot = fs.realpathSync(
    path.resolve(requiredString(options.projectRoot, "projectRoot")),
  );
  const capabilityId = requiredString(options.capabilityId, "capabilityId");
  const policy = readPolicy(projectRoot);
  const packages = policy.packages.filter(
    (definition) => isRecord(definition) && definition.id === capabilityId,
  );
  if (packages.length !== 1) {
    throw new Error(
      `${POLICY_PATH} must declare capability ${capabilityId} exactly once`,
    );
  }
  const nativeTools = packages[0].execution?.nativeTools;
  if (!Array.isArray(nativeTools) || nativeTools.length === 0) {
    throw new TypeError(
      `${capabilityId}.execution.nativeTools must be a non-empty array`,
    );
  }
  const seen = new Set();
  const contracts = nativeTools.map((tool, index) => {
    if (!isRecord(tool)) {
      throw new TypeError(
        `${capabilityId}.nativeTools[${index}] must be an object`,
      );
    }
    const name = requiredString(
      tool.name,
      `${capabilityId}.nativeTools[${index}].name`,
    );
    if (seen.has(name)) {
      throw new Error(`${capabilityId} repeats native Tool ${name}`);
    }
    seen.add(name);
    return Object.freeze({
      name,
      providerPlugin: requiredString(
        tool.providerPlugin,
        `${capabilityId}.nativeTools[${index}].providerPlugin`,
      ),
      activation: requiredString(
        tool.activation,
        `${capabilityId}.nativeTools[${index}].activation`,
      ),
      contractCheck: requiredString(
        tool.contractCheck,
        `${capabilityId}.nativeTools[${index}].contractCheck`,
      ),
      effect: requiredString(
        tool.effect,
        `${capabilityId}.nativeTools[${index}].effect`,
      ),
      effectEvidence: requiredString(
        tool.effectEvidence,
        `${capabilityId}.nativeTools[${index}].effectEvidence`,
      ),
    });
  });
  return Object.freeze(contracts);
}

/** Read contract checks that the default offline CI must execute. */
export function readDefaultCapabilityContractChecks(options) {
  if (!isRecord(options)) {
    throw new TypeError("options must be an object");
  }
  const projectRoot = fs.realpathSync(
    path.resolve(requiredString(options.projectRoot, "projectRoot")),
  );
  const policy = readPolicy(projectRoot);
  const checks = new Set();

  for (const definition of policy.packages) {
    if (!isRecord(definition) || !isRecord(definition.execution)) continue;
    const capabilityId = requiredString(definition.id, "capability.id");
    const servers = definition.execution.mcpServers;
    if (Array.isArray(servers)) {
      for (const [index, server] of servers.entries()) {
        if (!isRecord(server) || server.source !== "package") continue;
        checks.add(
          requiredProjectFile(
            projectRoot,
            server.contractCheck,
            `${capabilityId}.mcpServers[${index}].contractCheck`,
          ),
        );
      }
    }
    const nativeTools = definition.execution.nativeTools;
    if (Array.isArray(nativeTools)) {
      for (const [index, tool] of nativeTools.entries()) {
        if (!isRecord(tool)) continue;
        checks.add(
          requiredProjectFile(
            projectRoot,
            tool.contractCheck,
            `${capabilityId}.nativeTools[${index}].contractCheck`,
          ),
        );
      }
    }
  }

  return Object.freeze([...checks].sort());
}
