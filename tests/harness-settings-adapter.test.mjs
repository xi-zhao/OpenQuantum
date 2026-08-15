import assert from "node:assert/strict";
import test from "node:test";

import { HarnessSettingsAdapter } from "../src/settings/harness-settings-adapter";

function ok(value) {
  return {
    type: "server-response",
    rpcId: "rpc-test",
    result: { ok: true, value },
  };
}

function projectSnapshot() {
  return {
    skills: [],
    mcpServers: [],
    mcpCredentials: [],
    mcpRevision: "a".repeat(64),
  };
}

test("settings adapter reads redacted Harness model settings", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => Response.json(projectSnapshot());
  const calls = [];
  const client = {
    settings: {
      describe: async () =>
        ok({
          writable: true,
          hasDocument: true,
          namespaces: [
            {
              ns: "llm-pi-ai",
              schema: {},
              value: {
                providers: {
                  quantum: {
                    displayName: "Quantum Gateway",
                    baseURL: "https://models.example/v1",
                    api: "openai-completions",
                    apiKeyEnv: "QUANTUM_API_KEY",
                    models: [{ id: "q-model", name: "Q Model" }],
                  },
                },
              },
              applies: "live",
              secrets: [],
              revision: 3,
            },
          ],
        }),
      mutate: async (payload) => {
        calls.push(["settings.mutate", payload]);
        return ok({});
      },
    },
    credentials: {
      describe: async ({ refs }) => {
        calls.push(["credentials.describe", refs]);
        return ok({
          credentials: {
            QUANTUM_API_KEY: {
              configured: true,
              source: "file",
              writable: true,
            },
          },
        });
      },
      set: async (payload) => {
        calls.push(["credentials.set", payload]);
        return ok({});
      },
      unset: async () => ok({}),
    },
    llm: {
      providers: async () =>
        ok({
          providers: [
            {
              provider: "quantum",
              displayName: "Quantum Gateway",
              settingsNs: "llm-pi-ai",
              settingsPath: ["providers", "quantum"],
              active: true,
              declared: true,
            },
          ],
        }),
    },
  };
  const adapter = new HarnessSettingsAdapter(client);
  const snapshot = await adapter.snapshot();

  assert.equal(snapshot.models.status, "ready");
  assert.deepEqual(snapshot.models.providers[0], {
    id: "quantum",
    displayName: "Quantum Gateway",
    baseUrl: "https://models.example/v1",
    protocol: "openai-completions",
    modelIds: ["q-model"],
    apiKeyRef: "QUANTUM_API_KEY",
    apiKeyConfigured: true,
    apiKeyWritable: true,
    active: true,
    revision: 3,
  });
  assert.equal(JSON.stringify(snapshot).includes("secret"), false);

  await adapter.execute({
    type: "model.update",
    provider: "quantum",
    revision: 3,
    displayName: "Updated Gateway",
    baseUrl: "https://new.example/v1",
    protocol: "openai-responses",
    modelIds: ["q-next"],
    apiKey: "test-key-value",
  });
  const mutate = calls.find(([name]) => name === "settings.mutate")[1];
  assert.equal(JSON.stringify(mutate).includes("test-key-value"), false);
  assert.deepEqual(
    calls.find(([name]) => name === "credentials.set")[1],
    { ref: "QUANTUM_API_KEY", value: "test-key-value" },
  );
});

test("settings adapter keeps IBM MCP credentials redacted and gates cloud enablement", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const projectCalls = [];
  let serverEnabled = false;
  const project = {
    skills: [],
    mcpServers: [
      {
        serverName: "qiskit_ibm_runtime",
        displayName: "IBM Quantum Runtime",
        description: "Cloud runtime",
        provider: "Qiskit / IBM Quantum",
        sourceUrl: "https://github.com/Qiskit/mcp-servers",
        packageName: "qiskit-ibm-runtime-mcp-server",
        packageVersion: "0.6.1",
        credentialRefs: ["QISKIT_IBM_TOKEN"],
        requiredCredentialRefs: ["QISKIT_IBM_TOKEN"],
        setup: null,
        managed: true,
        transport: "stdio",
        target: "uvx qiskit-ibm-runtime-mcp-server",
        enabled: false,
        toolCallTimeoutMs: 300000,
        failOnStartupError: true,
        reconnect: {
          enabled: true,
          initialDelayMs: 1000,
          maxDelayMs: 60000,
          maxAttempts: 10,
        },
      },
    ],
    mcpCredentials: [
      {
        ref: "QISKIT_IBM_TOKEN",
        displayName: "IBM Quantum API Token",
        description: "Shared cloud token",
        documentationUrl: "https://quantum.ibm.com/account",
        serverNames: ["qiskit_ibm_runtime"],
      },
    ],
    mcpRevision: "b".repeat(64),
  };
  globalThis.fetch = async (_url, init) => {
    const payload = JSON.parse(init.body);
    projectCalls.push(payload);
    if (payload.action === "mcp.update") serverEnabled = payload.enabled;
    return Response.json({
      ...project,
      mcpServers: project.mcpServers.map((server) => ({
        ...server,
        enabled: serverEnabled,
      })),
    });
  };

  let configured = false;
  const credentialCalls = [];
  const client = {
    settings: {
      describe: async () =>
        ok({ writable: true, hasDocument: true, namespaces: [] }),
      mutate: async () => ok({}),
    },
    credentials: {
      describe: async ({ refs }) => {
        credentialCalls.push(["describe", refs]);
        return ok({
          credentials: Object.fromEntries(
            refs.map((ref) => [ref, { configured, writable: true }]),
          ),
        });
      },
      set: async ({ ref, value }) => {
        credentialCalls.push(["set", { ref, value }]);
        configured = true;
        return ok({});
      },
      unset: async ({ ref }) => {
        credentialCalls.push(["unset", { ref }]);
        configured = false;
        return ok({});
      },
    },
    llm: { providers: async () => ok({ providers: [] }) },
  };
  const adapter = new HarnessSettingsAdapter(client);

  const initial = await adapter.snapshot();
  assert.equal(initial.project.mcpCredentials[0].configured, false);
  assert.equal(JSON.stringify(initial).includes("ibm-secret"), false);
  await assert.rejects(
    adapter.execute({
      type: "mcp.update",
      serverName: "qiskit_ibm_runtime",
      revision: project.mcpRevision,
      enabled: true,
      toolCallTimeoutMs: 300000,
      reconnect: project.mcpServers[0].reconnect,
    }),
    /先保存 IBM Quantum API Token/,
  );

  const configuredSnapshot = await adapter.execute({
    type: "mcp.credential.update",
    ref: "QISKIT_IBM_TOKEN",
    value: "ibm-secret-value",
  });
  assert.equal(configuredSnapshot.project.mcpCredentials[0].configured, true);
  assert.deepEqual(credentialCalls.find(([kind]) => kind === "set")[1], {
    ref: "QISKIT_IBM_TOKEN",
    value: "ibm-secret-value",
  });
  assert.equal(
    projectCalls.some((call) => JSON.stringify(call).includes("ibm-secret-value")),
    false,
  );

  await adapter.execute({
    type: "mcp.update",
    serverName: "qiskit_ibm_runtime",
    revision: project.mcpRevision,
    enabled: true,
    toolCallTimeoutMs: 300000,
    reconnect: project.mcpServers[0].reconnect,
  });
  assert.ok(
    projectCalls.some(
      (call) => call.action === "mcp.update" && call.enabled === true,
    ),
  );
  await assert.rejects(
    adapter.execute({
      type: "mcp.credential.update",
      ref: "QISKIT_IBM_TOKEN",
      remove: true,
    }),
    /先停用 IBM Quantum Runtime/,
  );
  assert.equal(credentialCalls.some(([kind]) => kind === "unset"), false);

  await adapter.execute({
    type: "mcp.update",
    serverName: "qiskit_ibm_runtime",
    revision: project.mcpRevision,
    enabled: false,
    toolCallTimeoutMs: 300000,
    reconnect: project.mcpServers[0].reconnect,
  });
  await adapter.execute({
    type: "mcp.credential.update",
    ref: "QISKIT_IBM_TOKEN",
    remove: true,
  });
  await adapter.execute({
    type: "mcp.remove",
    serverName: "qiskit_ibm_runtime",
    revision: project.mcpRevision,
  });
  assert.ok(projectCalls.some((call) => call.action === "mcp.remove"));

  await adapter.execute({
    type: "mcp.register",
    revision: project.mcpRevision,
    serverName: "community_quantum",
    transport: "stdio",
    command: "uvx",
    args: ["community-quantum-mcp"],
  });
  assert.ok(projectCalls.some((call) => call.action === "mcp.register"));
});

test("settings adapter blocks hardware MCP enablement until pinned source is ready", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const reconnect = {
    enabled: true,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    maxAttempts: 5,
  };
  globalThis.fetch = async () =>
    Response.json({
      skills: [],
      mcpServers: [
        {
          serverName: "quantum_hardware",
          displayName: "Quantum Hardware MCP",
          description: "Real QPU control",
          provider: "Community",
          sourceUrl: "https://github.com/Lokesh-2025/quantum-hardware-mcp",
          packageName: "quantum-hardware-mcp",
          packageVersion: "13fbe9f13fd6",
          credentialRefs: ["QISKIT_IBM_TOKEN"],
          requiredCredentialRefs: ["QISKIT_IBM_TOKEN"],
          setup: {
            status: "required",
            message: "尚未安装本地源码；安装完成前不能启用此 MCP。",
            command: "npm run mcp:quantum-hardware:setup",
          },
          managed: false,
          transport: "stdio",
          target: "./.openquantum/external/quantum-hardware-mcp/server.py",
          enabled: false,
          toolCallTimeoutMs: 600000,
          failOnStartupError: true,
          reconnect,
        },
      ],
      mcpCredentials: [],
      mcpRevision: "e".repeat(64),
    });
  const adapter = new HarnessSettingsAdapter({});

  await assert.rejects(
    adapter.execute({
      type: "mcp.update",
      serverName: "quantum_hardware",
      revision: "e".repeat(64),
      enabled: true,
      toolCallTimeoutMs: 600000,
      reconnect,
    }),
    /尚未安装本地源码/,
  );
});
