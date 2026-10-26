/** Read-only presentation checks; never retries a classroom generation task. */
export async function watchLearningUi({ check, onUnavailable, signal, intervalMs = 5000, failureLimit = 3 }) {
  let failures = 0;
  while (!signal.aborted) {
    try { failures = (await check(signal)).state === "ready" ? 0 : failures + 1; }
    catch { failures++; }
    if (signal.aborted) return;
    if (failures >= failureLimit) { onUnavailable(); return; }
    await new Promise((resolve) => {
      const done = () => { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); };
      const timer = setTimeout(done, intervalMs);
      signal.addEventListener("abort", done, { once: true });
    });
  }
}
