import { mkdir, readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { compareVersions, DEFAULT_UPDATE_FEED, fetchRelease, httpsUrl, MAX_MANIFEST_BYTES, parseVersion, validateRelease } from "./release.mjs";

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MANUAL_COOLDOWN_MS = 60 * 1000;
const emptyState = () => ({ schemaVersion: 1, automatic: true, lastCheckedAt: 0, lastCheckStatus: "idle", release: null, skippedVersion: null, notifiedVersion: null, remindAfter: 0, remindVersion: null });

function releaseStatus(release, installed, fallback = "unpublished") {
  if (!release) return fallback;
  return compareVersions(release.version, installed) > 0 ? "available" : "current";
}

/** Owns update discovery and reminder preferences; never installs or restarts. */
export async function createUpdateService({
  currentVersion, statePath, feedUrl = DEFAULT_UPDATE_FEED, request = fetch,
  now = Date.now, timeoutMs = 10_000, automatic = true,
} = {}) {
  if (!parseVersion(currentVersion)) throw new TypeError("Invalid installed OpenQuantum version");
  feedUrl = httpsUrl(feedUrl);
  let state = emptyState();
  try {
    if ((await stat(statePath)).size > MAX_MANIFEST_BYTES) throw new Error("Oversized update state");
    const saved = JSON.parse(await readFile(statePath, "utf8"));
    if (saved.schemaVersion === 1) {
      state = {
        ...state, automatic: typeof saved.automatic === "boolean" ? saved.automatic : true,
        lastCheckedAt: Number.isFinite(saved.lastCheckedAt) && saved.lastCheckedAt <= now() ? Math.max(0, saved.lastCheckedAt) : 0,
        lastCheckStatus: ["error", "unpublished"].includes(saved.lastCheckStatus) ? saved.lastCheckStatus : "idle",
        release: saved.release ? validateRelease(saved.release) : null,
        skippedVersion: parseVersion(saved.skippedVersion) ? saved.skippedVersion : null,
        notifiedVersion: parseVersion(saved.notifiedVersion) ? saved.notifiedVersion : null,
        remindAfter: Number.isFinite(saved.remindAfter) ? Math.min(Math.max(0, saved.remindAfter), now() + CHECK_INTERVAL_MS) : 0,
        remindVersion: parseVersion(saved.remindVersion) ? saved.remindVersion : null,
      };
    }
  } catch { /* Missing or damaged optional state cannot prevent startup. */ }
  let status = state.lastCheckStatus === "error" ? "error" : releaseStatus(state.release, currentVersion, state.lastCheckStatus);
  let revision = 0;
  const instanceId = randomUUID();
  let desktopCheck = 0;
  let disposed = false;
  let pending;
  let controller;
  let timer;
  let writes = Promise.resolve();
  let commands = Promise.resolve();
  const enqueue = (operation) => {
    const result = commands.then(operation);
    commands = result.catch(() => {});
    return result;
  };
  const publish = () => { revision++; };
  const persist = () => {
    const body = JSON.stringify(state);
    writes = writes.catch(() => {}).then(async () => {
      await mkdir(path.dirname(statePath), { recursive: true });
      await writeFileAtomic(statePath, body, { mode: 0o600 });
    });
    // Discovery still works on read-only deployments; preference writes report failure.
    return writes;
  };
  const snapshot = () => ({
    currentVersion, channel: "stable", status, checking: Boolean(pending),
    automatic: automatic && state.automatic, automaticAllowed: automatic,
    lastCheckedAt: state.lastCheckedAt, release: state.release,
    skippedVersion: state.skippedVersion, instanceId, revision, desktopCheck,
    notify: automatic && state.automatic && status === "available" && state.release.version !== state.skippedVersion
      && state.release.version !== state.notifiedVersion && (state.remindVersion !== state.release.version || state.remindAfter <= now()),
  });

  const check = ({ manual = false } = {}) => {
    if (disposed) return Promise.resolve(snapshot());
    if (pending) return pending;
    if (!manual && (!automatic || !state.automatic)) return Promise.resolve(snapshot());
    if (state.lastCheckedAt && now() - state.lastCheckedAt < (manual ? MANUAL_COOLDOWN_MS : CHECK_INTERVAL_MS)) return Promise.resolve(snapshot());
    controller = new AbortController();
    const deadline = setTimeout(() => controller?.abort(), timeoutMs);
    publish();
    pending = (async () => {
      let release;
      let failed = false;
      try {
        release = await fetchRelease(feedUrl, { request, signal: controller.signal });
      } catch {
        failed = true;
      } finally { clearTimeout(deadline); }
      await enqueue(async () => {
        if (!disposed) {
          // Preserve verified metadata while a newer release asset is being prepared.
          if (release) state.release = release;
          status = failed ? "error" : releaseStatus(state.release, currentVersion);
          state.lastCheckStatus = status;
          state.lastCheckedAt = now();
          await persist().catch(() => {});
        }
      });
    })().finally(() => { pending = undefined; controller = undefined; publish(); }).then(snapshot);
    return pending;
  };

  function dispatch(command) {
    if (!command || typeof command !== "object" || Array.isArray(command)) throw new TypeError("Invalid update command");
    const allowed = { snapshot: [], check: [], automatic: ["enabled"], skip: ["version"], later: ["version"], claim: [] };
    if (!Object.hasOwn(allowed, command.action) || Object.keys(command).some((key) => key !== "action" && !allowed[command.action].includes(key))) throw new TypeError("Invalid update command");
    if (command.action === "snapshot") return snapshot();
    if (command.action === "check") return check({ manual: true }).then(async () => {
      // The user is already viewing this result; do not show a second automatic reminder.
      await dispatch({ action: "claim" });
      return snapshot();
    });
    const operation = async () => {
      if (disposed) throw new Error("Update service is closed");
      const before = structuredClone(state);
      let claimed = false;
      if (command.action === "automatic") {
        if (typeof command.enabled !== "boolean") throw new TypeError("Invalid automatic-update preference");
        state.automatic = command.enabled;
      } else if (command.action === "claim") {
        claimed = snapshot().notify;
        if (!claimed) return { ...snapshot(), claimed: false };
        state.notifiedVersion = state.release.version;
      } else {
        if (!state.release || command.version !== state.release.version) throw new TypeError("The update version has changed");
        if (command.action === "skip") state.skippedVersion = command.version;
        else { state.remindAfter = now() + CHECK_INTERVAL_MS; state.remindVersion = command.version; state.notifiedVersion = null; }
      }
      try { await persist(); } catch (error) {
        if (command.action !== "claim") { state = before; throw error; }
        // A read-only data directory still permits one in-memory notification.
      }
      publish();
      return { ...snapshot(), ...(command.action === "claim" ? { claimed } : {}) };
    };
    return enqueue(operation);
  }

  return {
    snapshot, check, dispatch,
    async checkFromDesktop() { await dispatch({ action: "check" }); desktopCheck++; publish(); },
    start({ initialDelayMs = 60_000 } = {}) {
      if (timer || disposed) return;
      const tick = async () => {
        await check();
        if (!disposed) { timer = setTimeout(tick, MANUAL_COOLDOWN_MS); timer.unref?.(); }
      };
      timer = setTimeout(tick, initialDelayMs);
      timer.unref?.();
    },
    async dispose() {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      await Promise.allSettled([pending, writes, commands]);
    },
  };
}
