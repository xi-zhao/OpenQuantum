import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { probePlugin } from "./probe-chatgpt.mjs";
import { probeHostPlugin } from "./probe-codex-host.mjs";

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const desktopCli = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex";

export function installedMcpServer(runtimeDirectory, executablePath) {
  // Agent Plugins permits bare executable names and contained cwd paths.
  // The captured PATH selects the Node runtime verified by this installer.
  return { type: "stdio", command: "node", args: [path.join(runtimeDirectory, "runtime/chatgpt/main.mjs"), "--stdio"],
    cwd: "${PLUGIN_ROOT}", env: { PATH: executablePath, OPENQUANTUM_PLUGIN_ROOT: "${PLUGIN_ROOT}" } };
}

async function readOptional(file) {
  try { return await fs.readFile(file, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export function unpackPlugin(bytes) {
  if (bytes.length > 100 * 1024 * 1024) throw new Error("Plugin archive is too large");
  let expandedBytes = 0, count = 0;
  const files = unzipSync(bytes, { filter: file => {
    expandedBytes += file.originalSize;
    if (++count > 50000 || expandedBytes > 1024 * 1024 * 1024) throw new Error("Expanded plugin archive is too large");
    return true;
  } });
  for (const name of Object.keys(files)) {
    if (!name.startsWith("openquantum/") || name.includes("\\") || name.includes("\0") || name.includes(":") || name.split("/").some((part) => part === ".." || part === ".")) {
      throw new Error(`Unsafe archive path: ${name}`);
    }
  }
  const read = (name) => JSON.parse(Buffer.from(files[`openquantum/${name}`] ?? []).toString("utf8"));
  const manifest = read("plugin.json");
  const release = read("release.json");
  const runtime = read("server/package.json");
  if (manifest.name !== "openquantum" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version) ||
      release.version !== manifest.version || runtime.version !== manifest.version || release.connection !== "local-desktop") {
    throw new Error("Expected a matching OpenQuantum local desktop release");
  }
  return { files, version: manifest.version, digest: sha256(bytes) };
}

export function updateMarketplace(current, pluginDirectory, home) {
  const marketplace = current ? JSON.parse(current) : { name: "personal", interface: { displayName: "Personal" }, plugins: [] };
  if (typeof marketplace.name !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(marketplace.name) || !Array.isArray(marketplace.plugins)) throw new Error("Invalid local marketplace");
  const existing = marketplace.plugins.filter((item) => item.name === "openquantum");
  if (existing.length > 1) throw new Error("Duplicate OpenQuantum marketplace entries");
  if (existing.length) {
    const source = existing[0].source;
    const previous = path.resolve(home, source?.path ?? "");
    const managed = path.join(home, ".local/share/openquantum/desktop");
    if (source?.source !== "local" || !previous.startsWith(`${managed}${path.sep}`)) throw new Error("Existing OpenQuantum entry is not owned by this installer");
  }
  const entry = { ...(existing[0] ?? { name: "openquantum", policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Productivity" }),
    source: { source: "local", path: `./${path.relative(home, pluginDirectory).split(path.sep).join("/")}` } };
  if (existing.length) marketplace.plugins[marketplace.plugins.indexOf(existing[0])] = entry;
  else marketplace.plugins.push(entry);
  return marketplace;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status ?? result.signal})`);
  return result;
}

export async function installPlugin(archivePath, { home = os.homedir(), offline = false,
  codexHome = process.env.CODEX_HOME || path.join(home, ".codex"),
  codex = process.env.OPENQUANTUM_CODEX_CLI ?? (existsSync(desktopCli) ? desktopCli : "codex") } = {}) {
  if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Node.js >=24 is required");
  // Check prerequisites before changing the source marketplace or active plugin.
  const env = { ...process.env, HOME: home, CODEX_HOME: codexHome, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ""}` };
  run(codex, ["plugin", "add", "--help"], { env, stdio: "pipe" });
  await fs.mkdir(codexHome, { recursive: true, mode: 0o700 });
  const archive = unpackPlugin(await fs.readFile(archivePath));
  const base = path.join(home, ".local/share/openquantum/desktop");
  const destination = path.join(base, `${archive.version}-${archive.digest.slice(0, 16)}`);
  const pluginDirectory = path.join(destination, "plugin");
  const runtimeDirectory = path.join(destination, "runtime");
  const marker = path.join(destination, "installed.json");
  const existing = await readOptional(marker);
  let probe;
  if (existing && JSON.parse(existing).sha256 !== archive.digest) throw new Error("Existing installation has a different archive digest");
  if (!existing) {
    await fs.mkdir(base, { recursive: true });
    // Exclusive creation avoids changing an unknown or half-installed directory.
    await fs.mkdir(destination);
    try {
      for (const [name, bytes] of Object.entries(archive.files)) {
        if (name.endsWith("/")) continue;
        const relative = name.slice("openquantum/".length);
        const file = relative.startsWith("server/") ? path.join(runtimeDirectory, relative.slice(7)) : path.join(pluginDirectory, relative);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, bytes, { mode: bytes[0] === 35 && bytes[1] === 33 ? 0o755 : 0o644 });
      }
      const npmArgs = ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund", ...(offline ? ["--offline"] : [])];
      if (process.env.npm_execpath) run(process.execPath, [process.env.npm_execpath, ...npmArgs], { cwd: runtimeDirectory, env });
      else run(process.platform === "win32" ? "npm.cmd" : "npm", npmArgs, { cwd: runtimeDirectory, env });
      // Keep large numerical/runtime dependencies outside the host's plugin cache.
      const manifestPath = path.join(pluginDirectory, "mcp.json");
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      manifest.mcpServers.openquantum = installedMcpServer(runtimeDirectory, env.PATH);
      await fs.writeFile(manifestPath, json(manifest));
      probe = await probePlugin(pluginDirectory);
      if (probe.version !== archive.version) throw new Error("Installed runtime version mismatch");
      await fs.writeFile(marker, json({ sha256: archive.digest, version: archive.version, probe }));
    } catch (error) {
      await fs.rm(destination, { recursive: true, force: true });
      throw error;
    }
  }
  probe ??= await probePlugin(pluginDirectory);
  if (probe.version !== archive.version) throw new Error("Installed runtime version mismatch");
  const marketplacePath = path.join(home, ".agents/plugins/marketplace.json");
  const previous = await readOptional(marketplacePath);
  const marketplace = updateMarketplace(previous, pluginDirectory, home);
  const updated = json(marketplace);
  await fs.mkdir(path.dirname(marketplacePath), { recursive: true });
  const temporary = `${marketplacePath}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, updated);
  try {
    if (await readOptional(marketplacePath) !== previous) throw new Error("Marketplace changed during installation; retry");
    await fs.rename(temporary, marketplacePath);
  } finally { await fs.rm(temporary, { force: true }); }
  try {
    const host = await probeHostPlugin({ codex, marketplacePath, env });
    if (!host.mcpServers.includes("openquantum")) throw new Error("Desktop host did not register the OpenQuantum MCP server; installation stopped");
    run(codex, ["plugin", "add", `openquantum@${marketplace.name}`, "--json"], { env });
  } catch (error) {
    if (await readOptional(marketplacePath) === updated) {
      if (previous === null) await fs.rm(marketplacePath);
      else await fs.writeFile(marketplacePath, previous);
    }
    throw error;
  }
  return { version: archive.version, pluginDirectory, runtimeDirectory, archiveSha256: archive.digest, probe };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const { version } = JSON.parse(await fs.readFile(path.join(root, "distributions/codex-plugin/package.json"), "utf8"));
  const args = process.argv.slice(2);
  if (args.some((arg) => arg.startsWith("--") && arg !== "--offline") || args.filter((arg) => !arg.startsWith("--")).length > 1) throw new Error("Usage: npm run plugin:install -- [plugin.zip] [--offline]");
  const archive = args.find((arg) => !arg.startsWith("--")) ?? path.join(root, `dist/codex-plugin/openquantum-${version}-codex-plugin.zip`);
  console.log(JSON.stringify(await installPlugin(path.resolve(archive), { offline: args.includes("--offline") }), null, 2));
}
