import path from "node:path";
import { pathToFileURL } from "node:url";
import { recoverDesktopInstall } from "./lib/desktop-install-transaction.mjs";

// Installed launchers run this immutable payload entry before importing any
// project file that an interrupted upgrade may have replaced or removed.
const [projectRoot, ...args] = process.argv.slice(2);
if (!projectRoot || !path.isAbsolute(projectRoot)) throw new Error("Expected an absolute Desktop project path");
await recoverDesktopInstall(projectRoot);
const script = path.join(projectRoot, "scripts/run-desktop.mjs");
process.argv = [process.execPath, script, ...args];
await import(pathToFileURL(script));
