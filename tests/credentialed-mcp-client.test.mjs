import assert from "node:assert/strict";
import test from "node:test";

import { resolveCredentialedMcpConfig } from "../runtime/openquantum/agent-presets/openquantum/credentialed-mcp-client.mjs";

test("credentialed MCP config resolves references without mutating or exposing source config", async () => {
  const source = {
    serverName: "qiskit_ibm_runtime",
    transport: "stdio",
    command: "uvx",
    args: ["qiskit-ibm-runtime-mcp-server"],
    env: { SAFE_SETTING: "visible" },
    credentialEnv: { QISKIT_IBM_TOKEN: "QISKIT_IBM_TOKEN" },
  };
  const resolved = await resolveCredentialedMcpConfig(source, async (ref) => {
    assert.equal(ref, "QISKIT_IBM_TOKEN");
    return { value: "secret-token", source: "file" };
  });

  assert.deepEqual(resolved.env, {
    SAFE_SETTING: "visible",
    QISKIT_IBM_TOKEN: "secret-token",
  });
  assert.equal(Object.hasOwn(resolved, "credentialEnv"), false);
  assert.deepEqual(source.env, { SAFE_SETTING: "visible" });
  assert.equal(JSON.stringify(source).includes("secret-token"), false);
});

test("credentialed MCP config fails closed for missing or malformed references", async () => {
  const config = {
    serverName: "qiskit_ibm_runtime",
    env: {},
    credentialEnv: { QISKIT_IBM_TOKEN: "QISKIT_IBM_TOKEN" },
  };
  await assert.rejects(
    resolveCredentialedMcpConfig(config, async () => undefined),
    /QISKIT_IBM_TOKEN is not configured/,
  );
  await assert.rejects(
    resolveCredentialedMcpConfig(
      { ...config, credentialEnv: { "BAD-NAME": "QISKIT_IBM_TOKEN" } },
      async () => ({ value: "secret-token" }),
    ),
    /POSIX identifiers/,
  );
});
