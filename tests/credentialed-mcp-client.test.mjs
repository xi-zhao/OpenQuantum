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

test("credentialed MCP injects configured optional provider credentials without requiring them", async () => {
  const requested = [];
  const resolved = await resolveCredentialedMcpConfig(
    {
      serverName: "quantum_hardware",
      env: { IBM_SHOW_ACCOUNT_INFO: "false" },
      credentialEnv: { IBM_QUANTUM_TOKEN: "QISKIT_IBM_TOKEN" },
      optionalCredentialEnv: {
        IONQ_API_KEY: "IONQ_API_KEY",
        AWS_ACCESS_KEY_ID: "AWS_ACCESS_KEY_ID",
      },
    },
    async (ref) => {
      requested.push(ref);
      if (ref === "QISKIT_IBM_TOKEN") return { value: "ibm-secret" };
      if (ref === "IONQ_API_KEY") return { value: "ionq-secret" };
      return undefined;
    },
  );

  assert.deepEqual(requested, [
    "QISKIT_IBM_TOKEN",
    "IONQ_API_KEY",
    "AWS_ACCESS_KEY_ID",
  ]);
  assert.deepEqual(resolved.env, {
    IBM_SHOW_ACCOUNT_INFO: "false",
    IBM_QUANTUM_TOKEN: "ibm-secret",
    IONQ_API_KEY: "ionq-secret",
  });
  assert.equal(Object.hasOwn(resolved, "optionalCredentialEnv"), false);
});
