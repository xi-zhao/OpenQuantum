import WebSocket from "ws";

export function redactHarnessLaunchTokens(output) {
  return output.replace(/([?&]token=)[A-Za-z0-9_-]+/g, "$1[redacted]");
}

/** Exchange the current Harness launch URL for its authority-bound cookie.
 * Used by local integration probes; browser clients use Harness's native flow.
 * Never include the launch token or cookie in diagnostics or persisted output.
 */
export async function harnessHttpCookie(baseUrl, processOutput) {
  const candidate = processOutput.match(/https?:\/\/[^\s]+\/\?token=[A-Za-z0-9_-]+/g)
    ?.findLast((value) => new URL(value).origin === new URL(baseUrl).origin);
  if (!candidate) throw new Error("Harness has not published its authenticated launch URL");
  const response = await fetch(candidate, {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  const cookies = response.headers.getSetCookie().map((value) => value.split(";", 1)[0]);
  if (response.status !== 303 || cookies.length === 0) throw new Error("Harness browser authentication failed");
  return cookies.join("; ");
}

/** Read the opening snapshot through the official Remote stream carrier. */
export async function harnessSessionSnapshot(baseUrl, cookie, sessionId, maxMessages = 200) {
  const url = new URL("/api/remote.mux", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(url, { headers: { cookie }, handshakeTimeout: 5000 });
  const streamId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => finish(new Error("Harness session snapshot timed out")), 10_000);
    const finish = (error, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "cancel", streamId }));
        socket.close();
      } else if (socket.readyState !== WebSocket.CLOSED) socket.terminate();
      if (error) reject(error); else resolve(value);
    };
    socket.once("error", (error) => finish(error));
    socket.once("close", () => finish(new Error("Harness session stream closed before its snapshot")));
    socket.once("open", () => socket.send(JSON.stringify({
      type: "open", streamId, endpoint: "session/follow",
      payload: { args: { request: { address: { kind: "session", sessionId }, maxMessages } } },
    })));
    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.streamId !== streamId) return;
        if (message.type === "item" && message.value?.type === "snapshot") finish(undefined, message.value);
        if (message.type === "error") finish(new Error(`Harness session stream failed: ${message.error?.code ?? "unknown"}`));
      } catch (error) { finish(error); }
    });
  });
}
