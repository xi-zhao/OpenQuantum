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

/** Read the pinned runtime's event-log history through its native RPC. */
export async function harnessSessionSnapshot(baseUrl, cookie, sessionId, maxMessages = 200) {
  const method = "session.history";
  const response = await fetch(new URL(`/api/${method}`, baseUrl), {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ type: "client-request", rpcId: crypto.randomUUID(), method, payload: { sessionId, maxMessages } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Harness history failed: HTTP ${response.status}`);
  const { result } = await response.json();
  if (!result?.ok) throw new Error(`Harness history failed: ${result?.error?.code ?? "unknown"}`);
  return { records: result.value.events, projections: result.value.projections, hasMore: result.value.hasMore };
}
