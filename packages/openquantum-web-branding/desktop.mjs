import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const name = "openquantum-desktop-branding";
export const inject = ["desktopProfiles"];

const iconPath = fileURLToPath(new URL("assets/icon-512.png", import.meta.url));

export function desktopAssetRoot(appPath) {
  // Upstream's source launcher passes lib/main.js to Electron. Packaged clients
  // instead use the app.asar package root. Only accept the named upstream parent.
  if (path.basename(appPath) === "lib") {
    const parent = path.dirname(appPath);
    const manifest = JSON.parse(readFileSync(path.join(parent, "package.json"), "utf8"));
    if (manifest.name === "dsh-plugin-desktop") return parent;
    throw new Error("Unexpected Desktop source package");
  }
  return appPath;
}

/** Use public Electron APIs; the original application and its UI stay intact. */
export function installDesktopIcon({ app, BrowserWindow, nativeImage }, platform = process.platform) {
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) throw new Error("OpenQuantum Desktop icon is missing");
  // Electron exposes setIcon, but no Dock getIcon. Read the pinned client's
  // default asset for disposal; never depend on a private Electron interface.
  const originalIcon = nativeImage.createFromPath(path.join(desktopAssetRoot(app.getAppPath()), "build",
    platform === "darwin" ? "app-icon-mac.png" : "app-icon.png"));
  if (originalIcon.isEmpty()) throw new Error("Cannot read the original Desktop icon");
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
      if (!window.isDestroyed() && platform === "win32") window.setIcon(originalIcon);
    }
    windows.clear();
    if (platform === "darwin") app.dock?.setIcon(originalIcon);
  };
}

export function apply(ctx) {
  if (!process.versions.electron) return;
  const electron = createRequire(import.meta.url)("electron");
  ctx.effect(() => installDesktopIcon(electron), "OpenQuantum Desktop icon");
}
