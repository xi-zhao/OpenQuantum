import { app, dialog } from "electron";
import { execFile } from "node:child_process";
import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

// Keep the upstream Electron/Harness runtime intact. This bootstrap only gives
// it a writable deployment and the pinned runtimes shipped with the installer.
async function start() {
  const requestedRoot = path.resolve(process.env.OPENQUANTUM_DESKTOP_DATA_DIR
    || path.join(app.getPath("appData"), "OpenQuantum"));
  await mkdir(requestedRoot, { recursive: true });
  const dataRoot = await realpath(requestedRoot);
  const nativeData = path.join(dataRoot, "native");
  await mkdir(nativeData, { recursive: true });
  app.setPath("userData", nativeData);
  app.setName("OpenQuantum Desktop");
  // Repeated requests in this process retain the lock for upstream main.js.
  // A second launch forwards its arguments to the running Desktop without
  // rewriting live configuration or racing a first-install preparation.
  if (!process.argv.includes("--export-diagnostics") && !app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  const projectRoot = path.join(dataRoot, "project");
  const payload = path.join(process.resourcesPath, "openquantum");
  const bin = path.join(process.resourcesPath, "runtimes", "bin");
  const node = path.join(bin, process.platform === "win32" ? "node.exe" : "node");
  process.env.PATH = `${bin}${path.delimiter}${process.env.PATH || ""}`;
  process.env.OPENQUANTUM_BUNDLED_BIN = bin;
  process.env.OPENQUANTUM_NODE_EXECUTABLE = node;
  process.env.DSH_HOME = path.join(projectRoot, ".openquantum", "dsh");
  process.env.DSH_TELEMETRY_DISABLED = "1";
  if (!process.argv.includes("--export-diagnostics")) {
    await promisify(execFile)(node, [path.join(payload, "scripts/prepare-installed-desktop.mjs"), payload, projectRoot], {
      env: process.env, windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024,
    });
  } else {
    // Diagnostics must also work when initial deployment failed before creating
    // the project directory. Do not retry or modify distributed files here.
    await mkdir(projectRoot, { recursive: true });
  }
  process.chdir(projectRoot);
  await import("./lib/main.js");
}

// Electron must wait for the writable paths and environment before `ready`.
// The error dialog is scheduled after module initialization to avoid waiting
// for `ready` from a top-level await that itself prevents `ready`.
await start().catch((error) => {
  console.error("OpenQuantum Desktop could not start:", error.message);
  void app.whenReady().then(() => {
    dialog.showErrorBox("OpenQuantum Desktop", `Unable to prepare the installed application. Your data has been kept.\n\n${error.message}`);
    app.exit(1);
  });
});
