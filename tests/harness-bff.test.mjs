import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("credential seam accepts only built-in or project-declared references", async () => {
  const { isAllowedCredentialPayload } = await import(
    "../src/app/api/harness/[method]/route.ts"
  );
  const allowed = new Set(["OPENQUANTUM_PUBLIC_API_KEY", "COMMUNITY_QUANTUM_TOKEN"]);
  assert.equal(
    isAllowedCredentialPayload(
      "credentials.set",
      { ref: "COMMUNITY_QUANTUM_TOKEN", value: "redacted" },
      allowed,
    ),
    true,
  );
  assert.equal(
    isAllowedCredentialPayload(
      "credentials.set",
      { ref: "UNRELATED_SECRET", value: "redacted" },
      allowed,
    ),
    false,
  );
  assert.equal(
    isAllowedCredentialPayload(
      "credentials.describe",
      { refs: ["OPENQUANTUM_PUBLIC_API_KEY", "COMMUNITY_QUANTUM_TOKEN"] },
      allowed,
    ),
    true,
  );
});

test("Harness BFF enforces the browser boundary and owns deployment cwd", async (t) => {
  const upstreamRequests = [];
  const upstream = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
    }
    const envelope = JSON.parse(body);
    upstreamRequests.push({ url: request.url, envelope });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        type: "server-response",
        rpcId: envelope.rpcId,
        result: { ok: true, value: { sessionId: "session-safe" } },
      }),
    );
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const address = upstream.address();
  assert(address && typeof address !== "string");
  process.env.HARNESS_BASE_URL = `http://127.0.0.1:${address.port}`;
  t.after(() => closeServer(upstream));

  const { POST } = await import(
    "../src/app/api/harness/[method]/route.ts"
  );
  const publicOrigin = "http://127.0.0.1:3000";
  const envelope = {
    type: "client-request",
    rpcId: crypto.randomUUID(),
    method: "session.create",
    payload: { cwd: "/attacker/path", workspaceId: "attacker-workspace" },
  };
  const invoke = (headers, method = "session.create", body = envelope) =>
    POST(
      new Request(`${publicOrigin}/api/harness/${method}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ method }) },
    );

  const crossOrigin = await invoke({
    "content-type": "application/json",
    host: "127.0.0.1:3000",
    origin: "http://malicious.example",
    "sec-fetch-site": "cross-site",
  });
  assert.equal(crossOrigin.status, 403);

  const reboundHost = await invoke({
    "content-type": "application/json",
    host: "attacker.example",
    origin: "http://attacker.example",
    "sec-fetch-site": "same-origin",
  });
  assert.equal(reboundHost.status, 403);

  const simpleRequest = await invoke({
    "content-type": "text/plain",
    host: "127.0.0.1:3000",
    origin: publicOrigin,
  });
  assert.equal(simpleRequest.status, 415);

  const oversized = await invoke({
    "content-type": "application/json",
    "content-length": String(1024 * 1024 + 1),
    host: "127.0.0.1:3000",
    origin: publicOrigin,
  });
  assert.equal(oversized.status, 413);
  assert.equal(upstreamRequests.length, 0);

  const accepted = await invoke({
    "content-type": "application/json",
    host: "127.0.0.1:3000",
    origin: publicOrigin,
    "sec-fetch-site": "same-origin",
  });
  assert.equal(accepted.status, 200);
  assert.equal(upstreamRequests.length, 1);
  assert.equal(upstreamRequests[0].url, "/api/session.create");
  assert.equal(upstreamRequests[0].envelope.payload.cwd, process.cwd());
  assert.equal(
    Object.hasOwn(upstreamRequests[0].envelope.payload, "workspaceId"),
    false,
  );

  const settingsEnvelope = {
    type: "client-request",
    rpcId: crypto.randomUUID(),
    method: "settings.mutate",
    payload: {
      ns: "llm-pi-ai",
      expectedRevision: 2,
      ops: [
        {
          op: "set",
          path: ["providers", "quantum", "baseURL"],
          value: "https://models.example/v1",
        },
      ],
    },
  };
  const settingsResponse = await invoke(
    {
      "content-type": "application/json",
      host: "127.0.0.1:3000",
      origin: publicOrigin,
      "sec-fetch-site": "same-origin",
    },
    "settings.mutate",
    settingsEnvelope,
  );
  assert.equal(settingsResponse.status, 200);
  assert.equal(upstreamRequests[1].url, "/api/settings.mutate");
  assert.deepEqual(upstreamRequests[1].envelope.payload, settingsEnvelope.payload);

  const privilegeEscalation = await invoke(
    {
      "content-type": "application/json",
      host: "127.0.0.1:3000",
      origin: publicOrigin,
      "sec-fetch-site": "same-origin",
    },
    "settings.mutate",
    {
      ...settingsEnvelope,
      rpcId: crypto.randomUUID(),
      payload: {
        ns: "permission",
        ops: [{ op: "set", path: ["defaultPreset"], value: "danger-full-access" }],
      },
    },
  );
  assert.equal(privilegeEscalation.status, 403);

  const qiskitCredential = await invoke(
    {
      "content-type": "application/json",
      host: "127.0.0.1:3000",
      origin: publicOrigin,
      "sec-fetch-site": "same-origin",
    },
    "credentials.set",
    {
      type: "client-request",
      rpcId: crypto.randomUUID(),
      method: "credentials.set",
      payload: { ref: "QISKIT_IBM_TOKEN", value: "ibm-test-token" },
    },
  );
  assert.equal(qiskitCredential.status, 200);
  assert.equal(upstreamRequests[2].url, "/api/credentials.set");
  assert.equal(upstreamRequests[2].envelope.payload.ref, "QISKIT_IBM_TOKEN");

  const arbitraryCredential = await invoke(
    {
      "content-type": "application/json",
      host: "127.0.0.1:3000",
      origin: publicOrigin,
      "sec-fetch-site": "same-origin",
    },
    "credentials.set",
    {
      type: "client-request",
      rpcId: crypto.randomUUID(),
      method: "credentials.set",
      payload: { ref: "UNRELATED_SECRET", value: "must-not-forward" },
    },
  );
  assert.equal(arbitraryCredential.status, 403);
  assert.equal(upstreamRequests.length, 3);
});

test("Harness BFF marks an upstream connection loss as an unknown mutation outcome", async (t) => {
  const upstream = createServer((request) => {
    request.socket.destroy();
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const address = upstream.address();
  assert(address && typeof address !== "string");
  process.env.HARNESS_BASE_URL = `http://127.0.0.1:${address.port}`;
  t.after(() => closeServer(upstream));

  const { POST } = await import(
    "../src/app/api/harness/[method]/route.ts"
  );
  const publicOrigin = "http://127.0.0.1:3000";
  const rpcId = crypto.randomUUID();
  const response = await POST(
    new Request(`${publicOrigin}/api/harness/session.prompt`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "127.0.0.1:3000",
        origin: publicOrigin,
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify({
        type: "client-request",
        rpcId,
        method: "session.prompt",
        payload: {
          sessionId: "session-safe",
          mode: "queue",
          content: [{ type: "text", text: "hello" }],
        },
      }),
    }),
    { params: Promise.resolve({ method: "session.prompt" }) },
  );

  assert.equal(response.status, 503);
  assert.equal(
    response.headers.get("x-openquantum-rpc-outcome"),
    "unknown-after-send",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.rpcId, rpcId);
  assert.equal(body.result.ok, false);
});
