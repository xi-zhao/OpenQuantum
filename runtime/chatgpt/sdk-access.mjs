import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

// Copied into each generated Skill's scripts/. The installed MCP manifest is
// authoritative both in the archive and after the installer splits out runtime/.
export async function locateSdkRuntime(pluginRoot) {
  const manifest = JSON.parse(await fs.readFile(path.join(pluginRoot, "mcp.json"), "utf8"));
  const entry = manifest.mcpServers?.openquantum?.args?.[0];
  if (typeof entry !== "string") throw new Error("OpenQuantum runtime location is missing");
  const resolved = entry.replaceAll("${PLUGIN_ROOT}", pluginRoot);
  if (!path.isAbsolute(resolved) || !resolved.endsWith(path.join("runtime", "chatgpt", "main.mjs"))) throw new Error("Unsupported OpenQuantum runtime location");
  const root = path.resolve(path.dirname(resolved), "../..");
  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  if (pkg.name !== "openquantum-codex-plugin") throw new Error("Not an OpenQuantum plugin runtime");
  return root;
}

if (process.argv[1] && await fs.realpath(process.argv[1]).catch(() => null) === fileURLToPath(import.meta.url)) {
  try {
    const pluginRoot = fileURLToPath(new URL("../../../", import.meta.url));
    const root = await locateSdkRuntime(pluginRoot);
    const { sdkCli } = await import(pathToFileURL(path.join(root, "src/lib/sdk-access.mjs")));
    const { Environments } = await import(pathToFileURL(path.join(root, "src/settings/codex/environments.mjs")));
    const manager = new Environments({ root, directory: process.env.OPENQUANTUM_PLUGIN_SETTINGS_HOME || path.join(os.homedir(), ".openquantum/plugins/codex") });
    const args = process.argv.slice(2);
    if (args[0] === "inspect") {
      const { createBackend } = await import(pathToFileURL(path.join(root, "runtime/chatgpt/backend.mjs")));
      const { Settings, skillEnabled } = await import(pathToFileURL(path.join(root, "src/settings/codex/application.mjs")));
      const backend = await createBackend({ root });
      const settings = new Settings({ backend, environments: manager, directory: manager.directory, skillRoot: path.join(pluginRoot, "skills") });
      const { config, codex } = await settings.read();
      const id = path.basename(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
      if (!skillEnabled(codex, id, settings.skillRoot) || !settings.sdkAllowed(config, codex, args[1])) throw new Error("用户已禁止此 Skill 或关联的 Tool/MCP；不能通过 SDK 绕过。");
    }
    const value = await sdkCli(root, args, { environment: manager.environment });
    if (args[0] === "inspect") {
      const record = await manager.read(args[1]);
      const environment = manager.values(args[1], record);
      value.dashboard = await manager.status(args[1]);
      value.setup = { tool: "prepare_openquantum_skill", sdkId: args[1], effect: "workspace-write-and-download", note: "执行需要时准备；检查与定位本身不安装。" };
      if (value.run) value.run.environment = { ...environment, ...value.run.environment };
    }
    console.log(JSON.stringify(value, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
