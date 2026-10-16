import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { locateSdkRuntime } from "./sdk-access.mjs";

// Packaged inside platform-diagnostics/scripts alongside the shared locator.
const pluginRoot = fileURLToPath(new URL("../../../", import.meta.url));
try {
  if (process.argv.length !== 2) throw new Error("Usage: node diagnostics.mjs (JSON report on stdout)");
  const root = await locateSdkRuntime(pluginRoot);
  const { diagnoseCodex } = await import(pathToFileURL(path.join(root, "runtime/chatgpt/platform-diagnostics.mjs")));
  console.log(JSON.stringify(await diagnoseCodex({ root, pluginRoot }), null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
