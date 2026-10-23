// Install the downloadable bundle from a fresh directory, with no repository dependencies.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { unzipSync } from "fflate";

if (!process.argv[2]) throw new Error("Usage: node scripts/verify-codex-release.mjs <codex-install.zip>");
const archive = path.resolve(process.argv[2]);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "oq-release-install-"));
const home = path.join(temporary, "home");
const cli = process.env.OPENQUANTUM_CODEX_CLI || "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex";
const env = { ...process.env, HOME: home, CODEX_HOME: path.join(home, ".codex"), PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ""}` };
const run = (command, args, cwd) => execFileSync(command, args, { cwd, env, encoding: "utf8", timeout: 180000, maxBuffer: 4 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
try {
  const bytes = await fs.readFile(archive);
  const files = unzipSync(bytes);
  const roots = new Set(Object.keys(files).map(name => name.split("/")[0]));
  assert.equal(roots.size, 1);
  for (const [name, contents] of Object.entries(files)) {
    assert.ok(!name.startsWith("/") && !name.includes("\\") && !name.includes(":") && !name.split("/").includes(".."));
    if (name.endsWith("/")) continue;
    const target = path.join(temporary, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents);
  }
  const directory = path.join(temporary, [...roots][0]);
  const manifest = JSON.parse(await fs.readFile(path.join(directory, "package.json"), "utf8"));
  await fs.mkdir(home, { recursive: true });
  const npm = process.env.npm_execpath;
  if (npm) run(process.execPath, [npm, "ci", "--ignore-scripts", "--no-audit", "--no-fund"], directory);
  else run(process.platform === "win32" ? "npm.cmd" : "npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], directory);
  run(process.execPath, ["scripts/install-codex-plugin.mjs"], directory);
  const inventory = JSON.parse(run(cli, ["plugin", "list", "--json"], home));
  const installed = inventory.installed.find(plugin => plugin.pluginId === "openquantum@personal" || plugin.name === "openquantum");
  assert.ok(installed, "Plugin missing from native installation inventory");
  assert.equal(installed.installed, true);
  assert.equal(installed.enabled, true);
  assert.equal(installed.version, manifest.version);
  const base = path.join(home, ".local/share/openquantum/desktop");
  const [entry] = await fs.readdir(base);
  const receipt = JSON.parse(await fs.readFile(path.join(base, entry, "installed.json"), "utf8"));
  assert.equal(receipt.version, manifest.version);
  assert.equal(receipt.probe.settingsResource, true);
  assert.equal(receipt.probe.referenceExecution, true);
  assert.equal(receipt.probe.disabledToolRejected, true);
  console.log(JSON.stringify({ version: manifest.version, cli: run(cli, ["--version"], home).trim(),
    platform: process.platform, arch: process.arch, standaloneBundle: true, nativeInstalled: true,
    nativeEnabled: true, archiveSha256: createHash("sha256").update(bytes).digest("hex"),
    pluginSha256: receipt.sha256, probe: receipt.probe }, null, 2));
} finally { await fs.rm(temporary, { recursive: true, force: true }); }
