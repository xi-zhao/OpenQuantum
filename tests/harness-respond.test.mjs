import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("interaction BFF accepts only same-origin approval/question responses", async (t) => {
  const upstreamRequests = [];
  const upstream = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
    }
    upstreamRequests.push({ url: request.url, body: JSON.parse(body) });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ accepted: true }));
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const address = upstream.address();
  assert(address && typeof address !== "string");
  process.env.HARNESS_BASE_URL = `http://127.0.0.1:${address.port}`;
  t.after(() => closeServer(upstream));

  const { POST } = await import("../src/app/api/harness/respond/route.ts");
  const publicOrigin = "http://127.0.0.1:3000";
  const invoke = (body, overrides = {}) =>
    POST(
      new Request(`${publicOrigin}/api/harness/respond`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "127.0.0.1:3000",
          origin: publicOrigin,
          "sec-fetch-site": "same-origin",
          ...overrides,
        },
        body: JSON.stringify(body),
      }),
    );
  const responseEnvelope = (rpcId, value) => ({
    type: "client-response",
    rpcId,
    result: { ok: true, value },
  });

  const crossOrigin = await invoke(
    responseEnvelope("approval-1", {
      sessionId: "session-1",
      approvalId: "approval-id-1",
      outcome: "rejected",
    }),
    {
      host: "attacker.example",
      origin: "http://attacker.example",
    },
  );
  assert.equal(crossOrigin.status, 403);

  const arbitraryPayload = await invoke(
    responseEnvelope("host-request-1", { command: "open-path" }),
  );
  assert.equal(arbitraryPayload.status, 400);

  const misleadingMediaType = await invoke(
    responseEnvelope("approval-1", {
      sessionId: "session-1",
      approvalId: "approval-id-1",
      outcome: "rejected",
    }),
    { "content-type": "application/json-malformed" },
  );
  assert.equal(misleadingMediaType.status, 415);

  const invalidError = await invoke({
    type: "client-response",
    rpcId: "question-1",
    result: {
      ok: false,
      error: { code: "internal", message: "no", details: {} },
    },
  });
  assert.equal(invalidError.status, 400);
  assert.equal(upstreamRequests.length, 0);

  const approval = responseEnvelope("approval-1", {
    sessionId: "session-1",
    approvalId: "approval-id-1",
    outcome: "allowed-once",
  });
  const approvalResponse = await invoke(approval);
  assert.equal(approvalResponse.status, 200);
  assert.deepEqual(await approvalResponse.json(), { accepted: true });

  const question = responseEnvelope("question-1", {
    sessionId: "session-1",
    answer: {
      answers: [
        { id: "backend", selected: ["本地模拟器"], custom: "" },
      ],
    },
  });
  const questionResponse = await invoke(question);
  assert.equal(questionResponse.status, 200);
  assert.deepEqual(await questionResponse.json(), { accepted: true });

  const cancelledQuestion = {
    type: "client-response",
    rpcId: "question-2",
    result: {
      ok: false,
      error: {
        code: "cancelled",
        message: "User cancelled the question.",
        details: {},
      },
    },
  };
  const cancelResponse = await invoke(cancelledQuestion);
  assert.equal(cancelResponse.status, 200);

  assert.deepEqual(upstreamRequests, [
    { url: "/api/respond", body: approval },
    { url: "/api/respond", body: question },
    { url: "/api/respond", body: cancelledQuestion },
  ]);
});
