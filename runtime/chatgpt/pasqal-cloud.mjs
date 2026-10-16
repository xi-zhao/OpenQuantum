import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { locateSdkRuntime } from "./sdk-access.mjs";

// Copied only into the Pasqal Skill. The host owns invocation and approval;
// the fixed runtime entry resolves credentials without returning them to it.
const pluginRoot = fileURLToPath(new URL("../../../", import.meta.url));
const controller = new AbortController();
const cancel = () => controller.abort();
process.once("SIGTERM", cancel); process.once("SIGINT", cancel);
try {
  const root = await locateSdkRuntime(pluginRoot);
  const { runPasqalWorkflow } = await import(pathToFileURL(path.join(root, "src/settings/codex/pasqal-workflow.mjs")));
  const { createBackend } = await import(pathToFileURL(path.join(root, "runtime/chatgpt/backend.mjs")));
  const { Settings } = await import(pathToFileURL(path.join(root, "src/settings/codex/application.mjs")));
  const settings = new Settings({ backend: await createBackend({ root }), skillRoot: path.join(pluginRoot, "skills"),
    ...(process.env.OPENQUANTUM_PLUGIN_SETTINGS_HOME ? { directory: process.env.OPENQUANTUM_PLUGIN_SETTINGS_HOME } : {}) });
  const result = await runPasqalWorkflow(process.argv.slice(2), { root, pluginRoot, settings, signal: controller.signal });
  process.stdout.write(result.stdout); process.stderr.write(result.stderr); process.exitCode = result.exitCode;
} catch (error) {
  process.stderr.write(`${error.message}\n`); process.exitCode = 1;
} finally {
  process.removeListener("SIGTERM", cancel); process.removeListener("SIGINT", cancel);
}
