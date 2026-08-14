import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import WebSocket, { WebSocketServer } from "ws";

import { createOpenQuantumGateway } from "../scripts/lib/openquantum-gateway.mjs";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server) {
  if (!server.listening) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function expectRejectedUpgrade(url, origin, expectedStatus) {
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { origin });

    socket.once("open", () => {
      socket.close();
      reject(new Error(`Expected ${expectedStatus}, but WebSocket opened`));
    });
    socket.once("unexpected-response", (_request, response) => {
      try {
        assert.equal(response.statusCode, expectedStatus);
        response.resume();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    socket.once("error", () => {
      // `ws` may report the rejected handshake after unexpected-response.
    });
  });
}

test("gateway keeps HTTP behind the UI and exposes only trusted Harness event sockets", async (t) => {
  const uiRequests = [];
  const uiServer = createServer((request, response) => {
    uiRequests.push({ host: request.headers.host, url: request.url });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ servedBy: "ui" }));
  });
  const uiOrigin = await listen(uiServer);

  const harnessRequests = [];
  const harnessServer = createServer((_request, response) => {
    response.writeHead(426);
    response.end("Upgrade Required");
  });
  const harnessSockets = new WebSocketServer({ noServer: true });
  harnessServer.on("upgrade", (request, socket, head) => {
    const origin = new URL(request.headers.origin ?? "http://invalid");
    if (origin.host !== request.headers.host) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }

    harnessRequests.push({
      host: request.headers.host,
      origin: request.headers.origin,
      url: request.url,
    });
    harnessSockets.handleUpgrade(request, socket, head, (webSocket) => {
      harnessSockets.emit("connection", webSocket, request);
    });
  });
  harnessSockets.on("connection", (socket, request) => {
    if (request.url === "/api/events.host") {
      socket.send(
        JSON.stringify({
          type: "server-request",
          rpcId: "host-frame-1",
          method: "host/session-added",
          payload: {
            type: "host/session-added",
            sessionId: "session-1",
            blank: true,
            cwd: "/private/deployment/path",
            agentPreset: "openquantum",
          },
        }),
      );
      return;
    }

    socket.send(JSON.stringify({ path: request.url }));
  });
  const harnessOrigin = await listen(harnessServer);

  const gateway = createOpenQuantumGateway({
    uiTarget: uiOrigin,
    harnessTarget: harnessOrigin,
    logger: { error() {} },
  });
  const publicOrigin = await listen(gateway.server);
  const publicWebSocketOrigin = publicOrigin.replace("http://", "ws://");

  t.after(async () => {
    for (const client of harnessSockets.clients) {
      client.terminate();
    }
    harnessSockets.close();
    await gateway.close();
    await closeServer(harnessServer);
    await closeServer(uiServer);
  });

  const response = await fetch(`${publicOrigin}/api/harness/session.list`, {
    method: "POST",
  });
  assert.deepEqual(await response.json(), { servedBy: "ui" });
  assert.equal(uiRequests.length, 1);
  assert.equal(uiRequests[0].url, "/api/harness/session.list");
  assert.equal(uiRequests[0].host, new URL(publicOrigin).host);

  for (const eventPath of ["events.mux?since=2", "events.host"]) {
    const socket = new WebSocket(
      `${publicWebSocketOrigin}/api/harness/${eventPath}`,
      { origin: publicOrigin },
    );
    const messagePromise = once(socket, "message");
    await once(socket, "open");
    const [message] = await messagePromise;
    const received = JSON.parse(message.toString());
    if (eventPath === "events.host") {
      assert.equal(received.rpcId, "host-frame-1");
      assert.equal(received.payload.type, "host/session-added");
      assert.equal(received.payload.sessionId, "session-1");
      assert.equal(received.payload.cwd, undefined);
    } else {
      assert.equal(received.path, `/api/${eventPath}`);
    }
    socket.close();
    await once(socket, "close");
  }

  assert.deepEqual(
    harnessRequests.map((request) => request.url),
    ["/api/events.mux?since=2", "/api/events.host"],
  );
  assert(
    harnessRequests.every(
      (request) =>
        request.host === new URL(publicOrigin).host &&
        request.origin === publicOrigin,
    ),
  );

  await expectRejectedUpgrade(
    `${publicWebSocketOrigin}/api/harness/credentials.list`,
    publicOrigin,
    403,
  );
  await expectRejectedUpgrade(
    `${publicWebSocketOrigin}/api/harness/events.mux`,
    "http://malicious.example",
    403,
  );
});

test("host socket is not reported open before its Harness upstream is ready", async (t) => {
  const uiServer = createServer((_request, response) => response.end("ui"));
  const uiOrigin = await listen(uiServer);
  const unavailableHarness = createServer();
  const harnessOrigin = await listen(unavailableHarness);
  await closeServer(unavailableHarness);
  const gateway = createOpenQuantumGateway({
    uiTarget: uiOrigin,
    harnessTarget: harnessOrigin,
    logger: { error() {} },
  });
  const publicOrigin = await listen(gateway.server);
  const publicWebSocketOrigin = publicOrigin.replace("http://", "ws://");

  t.after(async () => {
    await gateway.close();
    await closeServer(uiServer);
  });

  await expectRejectedUpgrade(
    `${publicWebSocketOrigin}/api/harness/events.host`,
    publicOrigin,
    502,
  );
});
