import { buildChatgpt } from "./build-chatgpt.mjs";
import { execFile, spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { cp, lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { DESKTOP_SOURCE } from "./lib/desktop-source.mjs";
import { prepareDesktopRuntimes } from "./lib/desktop-runtimes.mjs";
import { sha256 } from "./lib/desktop-distribution.mjs";
import { checkReleaseVersions } from "./lib/release-version.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
await checkReleaseVersions(root);
const args = new Set(process.argv.slice(2));
if ([...args].some(arg => arg !== "--dir")) throw new Error("Usage: desktop:package [--dir]. Original DSH Desktop installers are published by upstream.");
const target = `${process.platform}-${process.arch}`;
if (!["darwin-arm64", "darwin-x64", "win32-x64"].includes(target)) throw new Error(`Unsupported distribution target: ${target}`);
const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const runtimeLock = JSON.parse(await readFile(path.join(root, "desktop/runtime-lock.json"), "utf8"));
if (process.versions.node !== runtimeLock.nodeVersion) throw new Error(`Build with Node ${runtimeLock.nodeVersion}`);
const distribution = path.join(root, ".openquantum/distributions", target);
const stage = path.join(distribution, "content");
const payload = path.join(stage, "openquantum");
const output = path.join(distribution, "artifacts");
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`, NODE_USE_ENV_PROXY: "1" };
async function run(command, argv, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, argv, { cwd, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} exited ${code}`)));
  });
}
const dependencyRoot = path.join(distribution, `dependencies-${sha256(await readFile(path.join(root, "package-lock.json"))).slice(0, 20)}-node${process.versions.modules}`);
const dependencyMarker = path.join(dependencyRoot, "ready.json");
try {
  if (JSON.parse(await readFile(dependencyMarker, "utf8")).target !== target) throw new Error("Incorrect dependency cache target");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  if (!process.env.npm_execpath) throw new Error("Build through npm run desktop:package");
  await mkdir(dependencyRoot, { recursive: true });
  for (const name of ["package.json", "package-lock.json"]) await cp(path.join(root, name), path.join(dependencyRoot, name));
  await run(process.execPath, [process.env.npm_execpath, "ci", "--omit=dev", "--no-audit", "--no-fund"], dependencyRoot);
  await writeFile(dependencyMarker, JSON.stringify({ target }));
}
await rm(stage, { recursive: true, force: true });
await mkdir(payload, { recursive: true });
const exec = promisify(execFile);
const { stdout } = await exec("git", ["ls-files", "-z", "--", ".agents", "runtime", "src", "scripts", "packages", "docs", "public", "examples/quantum-algorithms", "package.json", "package-lock.json", "LICENSE", "THIRD_PARTY_NOTICES.md"], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
await buildChatgpt({ root });
const records = {};
const sharedArtifacts = ["app.html", "capabilities.json", "components.json", "release.json", "THIRD_PARTY_NOTICES.txt"].map(name => `dist/chatgpt/${name}`);
for (const filename of [...new Set([...stdout.split("\0").filter(Boolean), ...sharedArtifacts])].sort()) {
  if (/(^|\/)(\.env[^/]*|node_modules|\.openquantum|__pycache__)(\/|$)/.test(filename)) continue;
  const source = path.join(root, filename);
  const info = await lstat(source).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (!info) continue;
  if (!info.isFile()) throw new Error(`Unexpected payload entry: ${filename}`);
  await mkdir(path.dirname(path.join(payload, filename)), { recursive: true });
  await cp(source, path.join(payload, filename));
  records[filename] = { sha256: sha256(await readFile(source)), mode: info.mode & 0o111 ? 0o755 : 0o644 };
}
const { stdout: revision } = await exec("git", ["rev-parse", "HEAD"], { cwd: root });
const { stdout: modifications } = await exec("git", ["status", "--porcelain"], { cwd: root });
await writeFile(path.join(payload, "distribution.json"), JSON.stringify({ schemaVersion: 1, kind: "dsh-capability-package", version: manifest.version,
  target, runtimeLockSha256: sha256(await readFile(path.join(root, "desktop/runtime-lock.json"))),
  sourceRevision: revision.trim(), sourceDirty: Boolean(modifications.trim()), upstream: DESKTOP_SOURCE, files: records }, null, 2));
await cp(path.join(dependencyRoot, "node_modules"), path.join(payload, "node_modules"), { recursive: true, dereference: true });
await prepareDesktopRuntimes({ projectRoot: root, target, destination: path.join(stage, "runtimes"), cache: path.join(root, ".openquantum/distributions/cache") });
await cp(path.join(root, "desktop/install.mjs"), path.join(stage, "install.mjs"));
await writeFile(path.join(stage, "install.command"), '#!/bin/sh\ncd -- "$(dirname -- "$0")" || exit 1\nexec ./runtimes/bin/node ./install.mjs "$@"\n', { mode: 0o755 });
await writeFile(path.join(stage, "install.cmd"), '@echo off\r\ncd /d "%~dp0"\r\n"runtimes\\bin\\node.exe" "install.mjs" %*\r\n');
await cp(path.join(root, "docs/DESKTOP_INSTALLERS.md"), path.join(stage, "README.md"));
if (!args.has("--dir")) {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const name = `OpenQuantum-${manifest.version}-DSH-${target}.tar.gz`;
  await run("tar", ["-czf", path.join(output, name), "-C", stage, "."], root);
  const hash = createHash("sha256");
  for await (const block of createReadStream(path.join(output, name))) hash.update(block);
  await writeFile(path.join(output, "SHA256SUMS"), `${hash.digest("hex")}  ${name}\n`);
  console.log(path.join(output, name));
}
console.log(`Capability payload: ${stage}. DSH Desktop itself is not modified or bundled.`);
