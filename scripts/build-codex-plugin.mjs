import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { zipSync } from "fflate";
import { buildChatgpt, git, json } from "./build-chatgpt.mjs";
import { readCapabilities, PROJECT_ROOT } from "../runtime/chatgpt/catalog.mjs";
import { readSdkLibraries } from "../src/lib/sdk-access.mjs";

export async function buildPlugin({ root = PROJECT_ROOT, output = path.join(root, "dist/codex-plugin") } = {}) {
  const runtimePackage = JSON.parse(await fs.readFile(path.join(root, "distributions/codex-plugin/package.json"), "utf8"));
  const release = { version: runtimePackage.version, coreVersion: JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version,
    commit: git(root, ["rev-parse", "HEAD"]), dirty: Boolean(git(root, ["status", "--porcelain"])), connection: "local-desktop" };
  const built = await buildChatgpt({ root, release });
  const selected = (await readCapabilities(root)).filter(item => item.status === "available");
  const skillCount = selected.filter(item => item.skill).length;
  const owned = new Set(selected.map(item => item.id));
  const sdkIds = new Set((await readSdkLibraries(root)).map(item => item.id));
  const pluginRoot = path.join(output, "openquantum");
  await fs.rm(pluginRoot, { recursive: true, force: true });
  const serverRoot = path.join(pluginRoot, "server");
  const copy = async (source, target = source) => {
    const stat = await fs.lstat(path.join(root, source));
    if (!stat.isFile()) throw new Error(`Only ordinary source files can be packaged: ${source}`);
    const dest = path.join(serverRoot, target); await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.copyFile(path.join(root, source), dest);
  };
  // Explicit product inputs, not an archive of the whole repository.
  const prefixes = ["runtime/chatgpt/", "src/capabilities/", "src/settings/codex/", "src/lib/", "src/quantum-practices/", "src/metriq-data/", ".agents/skill-contracts/", "examples/quantum-algorithms/"];
  const metadataFiles = ["src/settings/server/project-settings-catalog.mjs", "src/settings/server/quantum-hardware-mcp.mjs", "src/settings/server/qpanda-runtime-mcp.mjs", "src/settings/server/qpanda-skill.mjs", ".agents/sdk-libraries.json", "scripts/sdk-access.mjs", "scripts/setup-sdk.mjs", "scripts/setup-paper-tools.mjs", "scripts/setup-open-algorithm-examples.mjs", "scripts/setup-qdmi.mjs"];
  const files = git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);
  for (const file of files) {
    const capability = file.match(/^\.agents\/skills\/([^/]+)\//)?.[1];
    if (prefixes.some(prefix => file.startsWith(prefix)) || metadataFiles.includes(file) || owned.has(capability) || sdkIds.has(capability)) {
      if (/(?:^|\/)(?:test|tests|evals|__pycache__|artifacts)\//.test(file) && !file.startsWith(".agents/skills/quantum-ground-state/")) continue;
      if (/\.env(?:\.|$)|\.(?:key|pem)$/.test(file)) throw new Error("Credential-like source cannot be packaged");
      await copy(file);
    }
  }
  const policy = parse(await fs.readFile(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  await fs.mkdir(path.join(serverRoot, ".agents"), { recursive: true });
  // Retain opt-in capability metadata for SDK discovery without enabling its MCP.
  await fs.writeFile(path.join(serverRoot, ".agents/capability-packages.yml"), stringify({ ...policy, packages: policy.packages.filter(item => owned.has(item.id) || sdkIds.has(item.id)) }));
  await copy("distributions/codex-plugin/package.json", "package.json");
  await copy("distributions/codex-plugin/package-lock.json", "package-lock.json");
  await fs.cp(built.output, path.join(serverRoot, "dist/chatgpt"), { recursive: true });
  await fs.cp(path.join(built.output, "skills"), path.join(pluginRoot, "skills"), { recursive: true });
  await fs.mkdir(path.join(pluginRoot, "assets"), { recursive: true });
  await fs.copyFile(path.join(root, "packages/openquantum-web-branding/assets/mark.svg"), path.join(pluginRoot, "assets/mark.svg"));
  const presentation = { displayName: "OpenQuantum", shortDescription: "量子科研能力与设置", longDescription: "在 Codex 原生对话中使用量子 Skill 与科学 Tool；通过设置页管理 MCP 连接、能力开关和系统凭据。量子学习通属于 Desktop 发行版。", developerName: "OpenQuantum contributors", category: "Developer Tools", capabilities: ["Interactive"], logo: "./assets/mark.svg", composerIcon: "./assets/mark.svg", defaultPrompt: "帮我选择合适的量子研究工具，并解释计算结果。" };
  const manifest = { "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name: "openquantum", version: release.version, description: presentation.longDescription, author: { name: "OpenQuantum contributors" }, license: "MIT", extensions: { "com.openai": { interface: presentation } } };
  await fs.writeFile(path.join(pluginRoot, "plugin.json"), json(manifest));
  await fs.mkdir(path.join(pluginRoot, ".codex-plugin"), { recursive: true });
  await fs.writeFile(path.join(pluginRoot, ".codex-plugin/plugin.json"), json({ name: manifest.name, version: manifest.version, description: manifest.description, author: manifest.author, license: manifest.license, skills: "./skills/", mcpServers: "./mcp.json", interface: presentation }));
  await fs.writeFile(path.join(pluginRoot, "mcp.json"), json({ "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", mcpServers: { openquantum: { type: "stdio", command: "node", args: ["${PLUGIN_ROOT}/server/runtime/chatgpt/main.mjs", "--stdio"], cwd: "${PLUGIN_ROOT}", env: { OPENQUANTUM_PLUGIN_ROOT: "${PLUGIN_ROOT}" } } } }));
  await fs.writeFile(path.join(pluginRoot, "release.json"), json({ ...release, contractDigest: built.contractDigest, capabilities: owned.size, skills: skillCount, tools: built.tools.length }));
  await fs.copyFile(path.join(root, "LICENSE"), path.join(pluginRoot, "LICENSE"));
  await fs.copyFile(path.join(root, "THIRD_PARTY_NOTICES.md"), path.join(pluginRoot, "THIRD_PARTY_NOTICES.md"));
  const entries = {};
  async function archive(directory, relative = "openquantum") {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error("Plugin archive cannot contain symlinks");
      const target = path.join(directory, entry.name), key = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await archive(target, key); else entries[key] = new Uint8Array(await fs.readFile(target));
    }
  }
  await archive(pluginRoot);
  const zipPath = path.join(output, `openquantum-${release.version}-codex-plugin.zip`);
  await fs.writeFile(zipPath, zipSync(entries, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") }));
  return { pluginRoot, zipPath, release, tools: built.tools.length, skills: skillCount };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await buildPlugin(), null, 2));
