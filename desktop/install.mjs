import { execFile } from "node:child_process";
import { cp, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const source = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
if (args.length > 1 || args[0] && !path.isAbsolute(args[0])) throw new Error("Usage: install.mjs [absolute-data-directory]");
const dataRoot = args[0] || (process.platform === "darwin" ? path.join(homedir(), "Library/Application Support/OpenQuantum") : path.join(process.env.APPDATA || homedir(), "OpenQuantum"));
const manifest = JSON.parse(await readFile(path.join(source, "openquantum/distribution.json"), "utf8"));
const projectRoot = path.join(dataRoot, "project");
const { assertCompatibleHarnessHome } = await import(new URL("./openquantum/scripts/lib/harness-home-compatibility.mjs", import.meta.url));
const { desktopPayloadIdentity } = await import(new URL("./openquantum/scripts/lib/desktop-distribution.mjs", import.meta.url));
const { installDesktopBranding } = await import(new URL("./openquantum/scripts/lib/desktop-branding.mjs", import.meta.url));
const identity = desktopPayloadIdentity(manifest);
await assertCompatibleHarnessHome(path.join(projectRoot, ".openquantum/dsh"));
const payloadRoot = path.join(dataRoot, "versions", identity);
const staging = `${payloadRoot}.${randomUUID()}.tmp`;
// A persistent payload owns dependencies/runtimes. Removing the downloaded archive
// after installation cannot break the project or links in the native Profile.
const existing = await lstat(payloadRoot).catch(error => { if (error.code === "ENOENT") return null; throw error; });
if (existing) {
  if (!existing.isDirectory() || JSON.stringify(JSON.parse(await readFile(path.join(payloadRoot, "openquantum/distribution.json"), "utf8"))) !== JSON.stringify(manifest)) {
    throw new Error("Existing capability package does not match its identity");
  }
} else try {
  await cp(source, staging, { recursive: true, dereference: true });
  try { await rename(staging, payloadRoot); }
  catch (error) {
    if (!["EEXIST", "ENOTEMPTY"].includes(error.code)) throw error;
    await rm(staging, { recursive: true, force: true });
  }
} catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
const node = path.join(payloadRoot, "runtimes/bin", process.platform === "win32" ? "node.exe" : "node");
const prepared = await promisify(execFile)(node, [path.join(payloadRoot, "openquantum/scripts/prepare-installed-desktop.mjs"), path.join(payloadRoot, "openquantum"), projectRoot], { maxBuffer: 4 * 1024 * 1024 });
await mkdir(dataRoot, { recursive: true });
const launcher = path.join(dataRoot, process.platform === "win32" ? "OpenQuantum DSH.cmd" : "OpenQuantum DSH.command");
const quote = text => `'${text.replaceAll("'", "'\\''")}'`;
const body = process.platform === "win32"
  ? `@echo off\r\n"${node}" "${path.join(projectRoot, "scripts/run-desktop.mjs")}"\r\n`
  : `#!/bin/sh\nexec ${quote(node)} ${quote(path.join(projectRoot, "scripts/run-desktop.mjs"))}\n`;
await writeFile(launcher, body, { mode: 0o755 });
const branding = await installDesktopBranding({ projectRoot, dataRoot, node, version: manifest.version });
await writeFile(path.join(dataRoot, "desktop-branding.json"), JSON.stringify(branding, null, 2));
console.log(prepared.stdout.trim());
console.log(`Installed OpenQuantum ${manifest.version}. Launch: ${branding.launcher}`);
console.log("OpenQuantum icon installed. Restart Desktop to update its running icon.");
console.log(`Original DSH Desktop ${manifest.upstream.version}: https://github.com/anywhere-labs/dsh-desktop/releases/tag/v${manifest.upstream.version}`);
