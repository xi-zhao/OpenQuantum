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
