import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const name = "openquantum-desktop-branding";
export const inject = ["desktopProfiles"];

const iconPath = fileURLToPath(new URL("assets/icon-512.png", import.meta.url));

/** Use public Electron APIs; the original application and its UI stay intact. */
export function installDesktopIcon({ app, BrowserWindow, nativeImage }, platform = process.platform) {
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) throw new Error("OpenQuantum Desktop icon is missing");
  const previousDockIcon = platform === "darwin" ? app.dock?.getIcon() : undefined;
  const previousWindowIcon = platform === "win32"
    ? nativeImage.createFromPath(path.join(app.getAppPath(), "build/app-icon.png")) : undefined;
  const windows = new Map();
  const refresh = () => { if (platform === "darwin") app.dock?.setIcon(icon); };
  const brandWindow = (_event, window) => {
    if (windows.has(window)) return;
    const closed = () => { window.removeListener("ready-to-show", refresh); windows.delete(window); };
    windows.set(window, closed);
    // The upstream shell sets its Dock icon before constructing each window.
    // Reapply after construction and after readiness, including shell restarts.
    refresh();
    if (platform === "win32") window.setIcon(icon);
    window.on("ready-to-show", refresh);
    window.once("closed", closed);
  };
  app.on("browser-window-created", brandWindow);
  for (const window of BrowserWindow.getAllWindows()) brandWindow(null, window);
  refresh();
  return () => {
    app.removeListener("browser-window-created", brandWindow);
    for (const [window, closed] of windows) {
      window.removeListener("ready-to-show", refresh);
      window.removeListener("closed", closed);
      if (!window.isDestroyed() && previousWindowIcon && !previousWindowIcon.isEmpty()) window.setIcon(previousWindowIcon);
    }
    windows.clear();
    if (previousDockIcon && !previousDockIcon.isEmpty()) app.dock?.setIcon(previousDockIcon);
  };
}

export function apply(ctx) {
  if (!process.versions.electron) return;
  const electron = createRequire(import.meta.url)("electron");
  ctx.effect(() => installDesktopIcon(electron), "OpenQuantum Desktop icon");
}
