import { setTimeout as wait } from "node:timers/promises";

/** The first status request also compiles Next's server instrumentation and route. */
export async function waitForLearningUi({ url, instance, revision, signal, timeoutMs = 120_000, probeTimeoutMs = 15_000, pollMs = 400, observe = () => {} }) {
  const started = Date.now();
  const deadline = Date.now() + timeoutMs;
  let attempt = 0, previous;
  const report = (state, httpStatus = null) => {
    if (signal.aborted) return;
    const signature = `${state}:${httpStatus}`;
    if (signature !== previous || state === "ready" || state === "timeout") {
      try { observe({ phase: "ui-readiness", state, httpStatus, attempt, elapsedMs: Date.now() - started }); }
      catch { /* Diagnostics never decide readiness or override process cancellation. */ }
      previous = signature;
    }
  };
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    attempt++;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(Math.max(1, Math.min(probeTimeoutMs, deadline - Date.now())))]),
      });
      if (response.ok) {
        const status = await response.json();
        if (status.instance === instance && status.revision === revision) {
          signal.throwIfAborted();
          report("ready", response.status);
          return;
        }
        report("identity_mismatch", response.status);
      } else { report("http_error", response.status); await response.body?.cancel(); }
    } catch { report("request_failed"); }
    signal.throwIfAborted();
    const remaining = deadline - Date.now();
    if (remaining > 0) {
      try { await wait(Math.min(pollMs, remaining), undefined, { signal }); }
      catch (error) { signal.throwIfAborted(); throw error; }
    }
  }
  report("timeout");
  throw new TypeError("量子学习通启动超时，请重新打开。");
}
