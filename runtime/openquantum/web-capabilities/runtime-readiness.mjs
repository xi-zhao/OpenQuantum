import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const APPLICATION_MODULE = "src/readiness/server/runtime-readiness.mjs";

function validateSnapshotCommand(command) {
  if (
    command === null ||
    typeof command !== "object" ||
    Array.isArray(command) ||
    command.action !== "snapshot" ||
    Object.keys(command).some((key) => key !== "action")
  ) {
    throw new TypeError("未知运行状态命令");
  }
}

async function applicationModule(projectRoot) {
  return import(
    pathToFileURL(path.join(projectRoot, APPLICATION_MODULE)).href
  );
}

async function presetMountReader(projectRoot) {
  const projectRequire = createRequire(path.join(projectRoot, "package.json"));
  const entrypoint = projectRequire.resolve("@deepseek-ai/dsh-agent-presets");
  const presets = await import(pathToFileURL(entrypoint).href);
  return presets.livePresetMounts;
}

function belongsToRuntime(mount, rootContext) {
  return mount?.fiber?.ctx?.root === rootContext;
}

/**
 * Harness observation Adapter. It never creates Runtime resources; Skill
 * snapshotting may still perform bounded local provider discovery.
 */
export function createHarnessRuntimeObserver({
  ctx,
  projectRoot,
  livePresetMounts,
}) {
  if (typeof livePresetMounts !== "function") {
    throw new TypeError("Runtime readiness requires livePresetMounts()");
  }
  return {
    listActivePresetScopes(presetId) {
      return livePresetMounts()
        .filter((mount) =>
          mount?.presetId === presetId &&
          mount.key !== undefined &&
          belongsToRuntime(mount, ctx.root),
        )
        .map((mount) => mount.key);
    },
    listSkills(scope, { signal } = {}) {
      return ctx.skills.snapshot({
        scope,
        cwd: projectRoot,
        signal,
      });
    },
    listTools(scope) {
      return ctx.tools.schemas(scope);
    },
    listModelRoutes() {
      return ctx.llm.listProviders();
    },
  };
}

/** Thin command dispatcher used by the bounded Browser -> Host route. */
export async function dispatchRuntimeReadinessCommand(
  projectRoot,
  command,
  { ctx, livePresetMounts } = {},
) {
  validateSnapshotCommand(command);
  const [{ createRuntimeReadinessReader }, readLivePresetMounts] =
    await Promise.all([
      applicationModule(projectRoot),
      livePresetMounts ?? presetMountReader(projectRoot),
    ]);
  const observer = createHarnessRuntimeObserver({
    ctx,
    projectRoot,
    livePresetMounts: readLivePresetMounts,
  });
  return createRuntimeReadinessReader({ observer })();
}
