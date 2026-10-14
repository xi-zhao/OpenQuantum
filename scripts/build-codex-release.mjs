import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { zipSync } from "fflate";
import { buildPlugin } from "./build-codex-plugin.mjs";
import { git } from "./build-chatgpt.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

// These files must work without any sibling repository source after extraction.
export async function installerFiles(directory, prefix) {
  const files = {};
  const inputs = {
    "package.json": "distributions/codex-installer/package.json",
    "package-lock.json": "distributions/codex-installer/package-lock.json",
    "README.md": "distributions/codex-installer/README.md",
    "INSTALL.md": "docs/integrations/CODEX_AGENT_INSTALL.md",
    "LICENSE": "LICENSE",
    "THIRD_PARTY_NOTICES.md": "THIRD_PARTY_NOTICES.md",
  };
  for (const file of ["scripts/install-codex-plugin.mjs", "scripts/probe-chatgpt.mjs", "scripts/probe-codex-host.mjs", "runtime/chatgpt/server.mjs", "src/settings/credential-seal.mjs", "distributions/codex-plugin/package.json"]) inputs[file] = file;
  for (const [target, source] of Object.entries(inputs)) files[`${prefix}/${target}`] = new Uint8Array(await fs.readFile(path.join(directory, source)));
  return files;
}

export async function buildRelease({ directory = root } = {}) {
  if (git(directory, ["status", "--porcelain"])) throw new Error("Commit all release changes before building a public package");
  const installer = JSON.parse(await fs.readFile(path.join(directory, "distributions/codex-installer/package.json"), "utf8"));
  const plugin = JSON.parse(await fs.readFile(path.join(directory, "distributions/codex-plugin/package.json"), "utf8"));
  if (installer.version !== plugin.version) throw new Error("Installer and plugin versions must match");
  const built = await buildPlugin({ root: directory });
  const output = path.join(directory, "dist/codex-release");
  await fs.mkdir(output, { recursive: true });
  const prefix = `openquantum-${plugin.version}-codex-install`;
  const pluginName = path.basename(built.zipPath);
  const pluginBytes = await fs.readFile(built.zipPath);
  const files = await installerFiles(directory, prefix);
  files[`${prefix}/dist/codex-plugin/${pluginName}`] = new Uint8Array(pluginBytes);
  const installBytes = zipSync(files, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") });
  const installName = `${prefix}.zip`;
  await fs.writeFile(path.join(output, pluginName), pluginBytes);
  await fs.writeFile(path.join(output, installName), installBytes);
  const checksums = `${sha256(pluginBytes)}  ${pluginName}\n${sha256(installBytes)}  ${installName}\n`;
  await fs.writeFile(path.join(output, "SHA256SUMS"), checksums);
  return { ...built.release, tag: `codex-v${plugin.version}`, output, skills: built.skills, tools: built.tools,
    artifacts: [{ name: pluginName, sha256: sha256(pluginBytes) }, { name: installName, sha256: sha256(installBytes) }] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await buildRelease(), null, 2));
