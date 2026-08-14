import assert from "node:assert/strict";
import test from "node:test";

import {
  HarnessRpcOutcomeUnknownError,
  OpenQuantumWebApiClient,
} from "../src/harness/web-api-client.ts";

test("startPrompt exposes the outbound rpcId before fetch settles", async () => {
  const originalFetch = globalThis.fetch;
  let settle;
  let outbound;
  globalThis.fetch = async (_input, init) => {
    outbound = JSON.parse(init.body);
    return new Promise((resolve) => {
      settle = resolve;
    });
  };

  try {
    const client = new OpenQuantumWebApiClient();
    const started = client.startPrompt({
      sessionId: "session-1",
      mode: "queue",
      content: [{ type: "text", text: "hello" }],
      clientTimeZone: "Asia/Shanghai",
    });

    assert.equal(started.rpcId, outbound.rpcId);
    assert.equal(outbound.method, "session.prompt");

    let completed = false;
    void started.completion.then(() => {
      completed = true;
    });
    await Promise.resolve();
    assert.equal(completed, false);

    settle(
      Response.json({
        type: "server-response",
        rpcId: started.rpcId,
        result: { ok: true, value: { accepted: true } },
      }),
    );
    const response = await started.completion;
    assert.equal(response.rpcId, started.rpcId);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unknown-after-send provenance rejects mutation completion", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json(
      { error: "upstream response lost" },
      {
        status: 503,
        headers: { "x-openquantum-rpc-outcome": "unknown-after-send" },
      },
    );

  try {
    const client = new OpenQuantumWebApiClient();
    const started = client.startPrompt({
      sessionId: "session-1",
      mode: "queue",
      content: [{ type: "text", text: "hello" }],
      clientTimeZone: "Asia/Shanghai",
    });
    await assert.rejects(
      started.completion,
      HarnessRpcOutcomeUnknownError,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
