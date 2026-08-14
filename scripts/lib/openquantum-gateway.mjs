import { createServer } from "node:http";
import { serverRequestSchema } from "@deepseek-ai/dsh-host-apiproxy/api";
import { hostFrameSchema } from "@deepseek-ai/dsh-host-apiproxy/api/events.schema";
import httpProxy from "http-proxy";
import WebSocket, { WebSocketServer } from "ws";

export const HARNESS_EVENT_PATHS = new Set([
  "/api/harness/events.mux",
  "/api/harness/events.host",
]);
const MAX_BUFFERED_BYTES = 1024 * 1024;

function parseRequestUrl(requestUrl) {
  try {
    return new URL(requestUrl ?? "/", "http://openquantum.local");
  } catch {
    return null;
  }
}

function rejectUpgrade(socket, status, message) {
  if (socket.destroyed) {
    return;
  }

  socket.end(
    `HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`,
  );
}

function hasSameOriginAuthority(request) {
  const host = request.headers.host;
  const originValue = request.headers.origin;
  if (typeof host !== "string" || typeof originValue !== "string") {
    return false;
  }

  try {
    const origin = new URL(originValue);
    return (
      (origin.protocol === "http:" || origin.protocol === "https:") &&
      origin.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}

function harnessWebSocketUrl(harnessTarget, pathname) {
  const target = new URL(pathname, harnessTarget);
  target.protocol = target.protocol === "https:" ? "wss:" : "ws:";
  return target;
}

function safeHostEnvelope(data, isBinary) {
  if (isBinary) {
    throw new Error("Harness host stream sent a binary frame");
  }

  const envelope = serverRequestSchema.parse(JSON.parse(data.toString()));
  const payload = hostFrameSchema.parse(envelope.payload);
  if (envelope.method !== payload.type) {
    throw new Error(
      `Harness host event method mismatch: ${envelope.method} != ${payload.type}`,
    );
  }

  // Workspace and remote-event frames can carry deployment paths or extension
  // payloads. P1's UI does not need them, so they are not exposed to browsers.
  if (
    payload.type === "host/workspace-changed" ||
    payload.type === "host/workspace-removed" ||
    payload.type === "host/workspace-order-changed" ||
    payload.type === "host/archived-sessions-changed" ||
    payload.type === "host/remote-event"
  ) {
    return null;
  }

  if (payload.type === "host/session-added") {
    const safePayload = { ...payload };
    delete safePayload.cwd;
    return JSON.stringify({ ...envelope, payload: safePayload });
  }

  return JSON.stringify({ ...envelope, payload });
}

function prepareSanitizedHostStream({
  request,
  harnessTarget,
  logger,
  onReady,
  onFailure,
  isDownstreamAvailable,
}) {
  const upstream = new WebSocket(
    harnessWebSocketUrl(harnessTarget, "/api/events.host"),
    {
      origin: request.headers.origin,
      headers: { host: request.headers.host },
      perMessageDeflate: false,
    },
  );
  let settled = false;
  let downstream;
  const handshakeTimeout = globalThis.setTimeout(() => {
    fail("Harness host event stream did not open within 3 seconds");
  }, 3_000);

  const closeUpstream = () => {
    if (
      upstream.readyState === WebSocket.CONNECTING ||
      upstream.readyState === WebSocket.OPEN
    ) {
      upstream.terminate();
    }
  };
  const cancelIfUnavailable = () => {
    if (!settled && !isDownstreamAvailable()) {
      settled = true;
      globalThis.clearTimeout(handshakeTimeout);
      closeUpstream();
    }
  };
  request.socket.once("close", cancelIfUnavailable);
  request.socket.once("error", cancelIfUnavailable);
  const fail = (message) => {
    if (settled) {
      return;
    }

    settled = true;
    globalThis.clearTimeout(handshakeTimeout);
    request.socket.removeListener("close", cancelIfUnavailable);
    request.socket.removeListener("error", cancelIfUnavailable);
    logger.error(`[gateway] ${message}`);
    if (downstream?.readyState === WebSocket.OPEN) {
      downstream.close(1011, "Harness host event stream unavailable");
    } else {
      onFailure(message);
    }
    closeUpstream();
  };

  upstream.once("open", () => {
    if (settled || !isDownstreamAvailable()) {
      settled = true;
      globalThis.clearTimeout(handshakeTimeout);
      request.socket.removeListener("close", cancelIfUnavailable);
      request.socket.removeListener("error", cancelIfUnavailable);
      closeUpstream();
      return;
    }

    globalThis.clearTimeout(handshakeTimeout);
    request.socket.removeListener("close", cancelIfUnavailable);
    request.socket.removeListener("error", cancelIfUnavailable);
    try {
      downstream = onReady();
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : "browser host stream upgrade failed",
      );
      return;
    }
    if (!downstream) {
      settled = true;
      closeUpstream();
      return;
    }
    downstream.on("message", () => {
      if (downstream.readyState === WebSocket.OPEN) {
        downstream.close(1008, "Harness event streams are downlink only");
      }
      closeUpstream();
    });
    downstream.once("close", closeUpstream);
    downstream.once("error", closeUpstream);
  });

  upstream.on("message", (data, isBinary) => {
    try {
      const safeEnvelope = safeHostEnvelope(data, isBinary);
      if (
        safeEnvelope === null ||
        downstream?.readyState !== WebSocket.OPEN
      ) {
        return;
      }
      if (
        downstream.bufferedAmount + Buffer.byteLength(safeEnvelope) >
        MAX_BUFFERED_BYTES
      ) {
        fail("browser host event buffer exceeded its safe limit");
        return;
      }
      downstream.send(safeEnvelope);
    } catch (error) {
      fail(
        error instanceof Error ? error.message : "invalid Harness host frame",
      );
    }
  });
  upstream.once("unexpected-response", (_request, response) => {
    response.resume();
    fail(`Harness rejected host event stream with HTTP ${response.statusCode}`);
  });
  upstream.once("error", (error) => {
    fail(`Harness host event stream failed: ${error.message}`);
  });
  upstream.once("close", (code, reason) => {
    if (settled) {
      return;
    }

    settled = true;
    globalThis.clearTimeout(handshakeTimeout);
    if (downstream?.readyState === WebSocket.OPEN) {
      const downstreamCode = code >= 1000 && code !== 1005 && code !== 1006
        ? code
        : 1011;
      downstream.close(downstreamCode, reason.toString().slice(0, 123));
    } else {
      onFailure("Harness host event stream closed before it was ready");
    }
  });
}

function proxyErrorHandler(logger) {
  return (error, _request, response) => {
    logger.error(`[gateway] ${error.message}`);

    if (response && "writeHead" in response && !response.headersSent) {
      response.writeHead(502, {
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("OpenQuantum upstream unavailable");
      return;
    }

    if (response && "destroy" in response) {
      response.destroy();
    }
  };
}

/**
 * Create the single public-origin gateway used by the browser.
 *
 * Normal HTTP remains behind the Next.js BFF. Only the two explicitly listed
 * Harness event sockets bypass it, and their Host/Origin headers are preserved
 * so the Harness trusted-host check remains effective.
 */
export function createOpenQuantumGateway({
  uiTarget,
  harnessTarget,
  logger = console,
}) {
  const uiProxy = httpProxy.createProxyServer({
    target: uiTarget,
    changeOrigin: false,
    ws: true,
  });
  const harnessProxy = httpProxy.createProxyServer({
    target: harnessTarget,
    changeOrigin: false,
    ws: true,
  });
  const hostStreamServer = new WebSocketServer({ noServer: true });
  const handleProxyError = proxyErrorHandler(logger);

  uiProxy.on("error", handleProxyError);
  harnessProxy.on("error", handleProxyError);

  const server = createServer((request, response) => {
    uiProxy.web(request, response);
  });

  server.on("upgrade", (request, socket, head) => {
    const parsedUrl = parseRequestUrl(request.url);
    const pathname = parsedUrl?.pathname ?? "";

    if (HARNESS_EVENT_PATHS.has(pathname) && !hasSameOriginAuthority(request)) {
      rejectUpgrade(socket, "403 Forbidden", "WebSocket origin is not trusted");
      return;
    }

    if (pathname === "/api/harness/events.host") {
      let upgradeCancelled = false;
      const cancelUpgrade = () => {
        upgradeCancelled = true;
      };
      socket.once("close", cancelUpgrade);
      socket.once("error", cancelUpgrade);
      prepareSanitizedHostStream({
        request,
        harnessTarget,
        logger,
        onReady: () => {
          socket.removeListener("close", cancelUpgrade);
          socket.removeListener("error", cancelUpgrade);
          let downstream;
          hostStreamServer.handleUpgrade(request, socket, head, (client) => {
            downstream = client;
          });
          return downstream;
        },
        onFailure: () => {
          rejectUpgrade(
            socket,
            "502 Bad Gateway",
            "Harness host event stream unavailable",
          );
        },
        isDownstreamAvailable: () =>
          !upgradeCancelled && socket.readable && socket.writable,
      });
      return;
    }

    if (pathname === "/api/harness/events.mux") {
      request.url = `${pathname.replace("/api/harness/", "/api/")}${parsedUrl?.search ?? ""}`;
      harnessProxy.ws(request, socket, head);
      return;
    }

    if (pathname.startsWith("/_next/")) {
      uiProxy.ws(request, socket, head);
      return;
    }

    rejectUpgrade(socket, "403 Forbidden", "WebSocket path is not exposed");
  });

  return {
    server,
    close() {
      return new Promise((resolve, reject) => {
        for (const client of hostStreamServer.clients) {
          client.terminate();
        }
        hostStreamServer.close();

        if (!server.listening) {
          resolve();
          return;
        }

        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
        uiProxy.close();
        harnessProxy.close();
      });
    },
  };
}
