import fs from "node:fs/promises";
import path from "node:path";
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
    console.log(JSON.stringify(await sdkCli(root, process.argv.slice(2)), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
