import { fileURLToPath } from "node:url";

export const name = "openquantum-desktop-branding";
export const inject = ["desktopRuntime"];
const iconPath = fileURLToPath(new URL("assets/icon-512.png", import.meta.url));

/** Supply a brand asset through the public shell contract, including Host IPC. */
export function installDesktopIcon(runtime) {
  const original = runtime.schedule;
  const schedule = spec => original.call(runtime, { ...spec, iconPath });
  runtime.schedule = schedule;
  return () => { if (runtime.schedule === schedule) runtime.schedule = original; };
}

export function apply(ctx) {
  ctx.effect(() => installDesktopIcon(ctx.get("desktopRuntime")), "OpenQuantum Desktop icon");
  // The shell depends on this service: it mounts after decoration and disposes
  // before the schedule method is restored when this Profile is unloaded.
  ctx.provide("openquantumDesktopIcon", true);
}
