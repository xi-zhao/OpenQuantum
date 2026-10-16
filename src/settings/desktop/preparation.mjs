import { setTimeout as delay } from "node:timers/promises";
import { inspectPreparation, prepareSkill, recordSkill } from "../codex/preparation.mjs";

// The existing installer has a 30-minute limit. Allow its cancellation and
// receipt to settle before the native Tool timeout. No model turn is needed
// while this one Tool call waits for that bounded installation.
export const PREPARATION_TIMEOUT_MS = 1_830_000;

export async function prepareDesktopSkill(settings, input, signal, { timeoutMs = PREPARATION_TIMEOUT_MS, intervalMs = 500, ...options } = {}) {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(new Error("等待环境准备超时，请检查网络与安装条件后重试。")), timeoutMs);
  timer.unref();
  const waiting = AbortSignal.any([signal, deadline.signal].filter(Boolean));
  let started, value, waited = false;
  try {
    value = await prepareSkill(settings, input, waiting, { ...options, onStarted: job => { started = job; } });
    const jobId = value.environment?.job?.id;
    while (value.state === "preparing") {
      waited = true;
      await delay(intervalMs, undefined, { signal: waiting });
      // Reuse the existing receipt and policy checks, including changes made
      // in settings while waiting. Never start a replacement or retry here.
      value = await inspectPreparation(settings, input);
      waiting.throwIfAborted();
      if (value.state === "preparing" && value.environment?.job?.id !== jobId) throw new Error("环境准备操作已变化，请重新准备所选 Skill。");
    }
  } catch (error) {
    throw waiting.aborted ? waiting.reason : error;
  } finally {
    try {
      if (started) await settings.environments.finishOwned(started.id, started.jobId, { cancel: waiting.aborted || value?.state !== "ready" });
    } finally { clearTimeout(timer); }
  }
  waiting.throwIfAborted();
  // Finishing the worker is asynchronous. Read policy/readiness once more
  // before returning success; preparation never invokes the scientific Tool.
  if (started || waited) value = await inspectPreparation(settings, input);
  if (value.state === "preparing") throw new Error("环境准备操作已变化，请重新准备所选 Skill。");
  await recordSkill(settings, input.skillId, value.state, { selection: value.selection, ...(value.serviceId ? { serviceId: value.serviceId } : {}) });
  return value;
}
