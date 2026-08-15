/**
 * Thin credential adapter for the Harness-native MCP client.
 *
 * Harness owns credential storage and MCP lifecycle. This trusted preset
 * plugin only resolves named credential references once at startup and passes
 * them to the official stdio child-process environment. Secret values never
 * enter Cordis YAML, browser snapshots, logs, or Session events.
 */

import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { apply as applyMcpClient } from "@deepseek-ai/dsh-mcp-client";

const ENVIRONMENT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_CREDENTIALS = 8;

export const name = "openquantum-credentialed-mcp-client";
export const inject = ["tools", "credentials"];

function record(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

/**
 * Resolve a bounded env-name -> credential-ref mapping without mutating input.
 * Exported as the module's test seam; callers still use the ordinary Cordis
 * apply Interface.
 */
export async function resolveCredentialedMcpConfig(config, resolveCredential) {
  const source = record(config, "credentialed MCP config");
  const credentialEnv = record(source.credentialEnv ?? {}, "credentialEnv");
  const optionalCredentialEnv = record(
    source.optionalCredentialEnv ?? {},
    "optionalCredentialEnv",
  );
  const requiredEntries = Object.entries(credentialEnv);
  const optionalEntries = Object.entries(optionalCredentialEnv);
  if (
    requiredEntries.length + optionalEntries.length === 0 ||
    requiredEntries.length + optionalEntries.length > MAX_CREDENTIALS
  ) {
    throw new TypeError(
      `credentialEnv and optionalCredentialEnv must contain between one and ${MAX_CREDENTIALS} total entries`,
    );
  }

  const env = { ...record(source.env ?? {}, "env") };
  const seenEnvironmentNames = new Set();
  const inject = async (environmentName, referenceValue, required) => {
    if (
      !ENVIRONMENT_NAME.test(environmentName) ||
      typeof referenceValue !== "string" ||
      !ENVIRONMENT_NAME.test(referenceValue) ||
      seenEnvironmentNames.has(environmentName)
    ) {
      throw new TypeError(
        "credentialEnv names and references must be unique POSIX identifiers",
      );
    }
    seenEnvironmentNames.add(environmentName);
    const resolved = await resolveCredential(referenceValue);
    if (required && !resolved?.value) {
      throw new Error(`MCP credential ${referenceValue} is not configured`);
    }
    if (resolved?.value) env[environmentName] = resolved.value;
  };
  for (const [environmentName, referenceValue] of requiredEntries) {
    await inject(environmentName, referenceValue, true);
  }
  for (const [environmentName, referenceValue] of optionalEntries) {
    await inject(environmentName, referenceValue, false);
  }

  const mcpConfig = { ...source };
  delete mcpConfig.credentialEnv;
  delete mcpConfig.optionalCredentialEnv;
  return { ...mcpConfig, env };
}

export async function apply(ctx, config) {
  const credentials = ctx.get("credentials");
  if (!credentials) {
    throw new Error("Harness credential service is unavailable");
  }
  const resolved = await resolveCredentialedMcpConfig(config, async (reference) =>
    credentials.resolve(credentialRef(reference)),
  );
  await applyMcpClient(ctx, resolved);
}
