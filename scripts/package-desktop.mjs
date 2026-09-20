import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { prepareOpenQuantumDesktop } from "./lib/desktop-branding.mjs";
import { DESKTOP_SOURCE, requireDesktopBuild } from "./lib/desktop-source.mjs";
import { prepareDesktopRuntimes } from "./lib/desktop-runtimes.mjs";
import { sha256 } from "./lib/desktop-distribution.mjs";
import { copyDesktopProductionDependencies } from "./lib/desktop-package-dependencies.mjs";
import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = new Set(process.argv.slice(2));
for (const argument of args) {
  if (!["--dir", "--signed"].includes(argument)) throw new Error(`Unknown package option: ${argument}`);
}
const signed = args.has("--signed");
const directoryOnly = args.has("--dir");
const target = `${process.platform}-${process.arch}`;
if (!["darwin-arm64", "darwin-x64", "win32-x64"].includes(target)) throw new Error(`Build on a supported native runner: ${target}`);
const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const runtimeLock = JSON.parse(await readFile(path.join(root, "desktop/runtime-lock.json"), "utf8"));
if (process.versions.node !== runtimeLock.nodeVersion) throw new Error(`Build with Node ${runtimeLock.nodeVersion} to match the bundled native dependency ABI`);
const upstream = await requireDesktopBuild(root);
const upstreamRequire = createRequire(path.join(upstream, "package.json"));
const upstreamManifest = JSON.parse(await readFile(path.join(upstream, "package.json"), "utf8"));
const prepared = await prepareOpenQuantumDesktop(root);
const distribution = path.join(root, ".openquantum/distributions", target);
const stage = path.join(distribution, "stage");
const application = path.join(stage, "application");
const payload = path.join(stage, "openquantum");
const runtimes = path.join(stage, "runtimes");
// Diagnostic directory builds must not erase an already verified installer.
const output = path.join(distribution, directoryOnly ? "directory" : "artifacts");
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`, NODE_USE_ENV_PROXY: "1" };
if (env.HTTP_PROXY || env.HTTPS_PROXY || env.http_proxy || env.https_proxy) env.ELECTRON_GET_USE_PROXY = "1";
if (!signed) {
  env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  for (const name of Object.keys(env)) if (/^(?:CSC_|WIN_CSC_|APPLE_)/.test(name) && name !== "CSC_IDENTITY_AUTO_DISCOVERY") delete env[name];
}

async function run(command, argv, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, argv, { cwd, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} exited ${code}`)));
  });
}

const dependencyRoot = path.join(distribution, `dependencies-${sha256(await readFile(path.join(root, "package-lock.json"))).slice(0, 20)}-node${process.versions.modules}`);
const dependencyMarker = path.join(dependencyRoot, "ready.json");
const npm = process.env.npm_execpath || createRequire(import.meta.url).resolve("npm/bin/npm-cli.js");
try {
  const cached = JSON.parse(await readFile(dependencyMarker, "utf8"));
  if (cached.target !== target) throw new Error("Incorrect dependency cache target");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  await mkdir(dependencyRoot, { recursive: true });
  for (const name of ["package.json", "package-lock.json"]) await cp(path.join(root, name), path.join(dependencyRoot, name));
  await run(process.execPath, [npm, "ci", "--omit=dev", "--no-audit", "--no-fund"], dependencyRoot);
  await writeFile(dependencyMarker, JSON.stringify({ target }));
}
await rm(stage, { recursive: true, force: true });
// Do not let old installers or checksums leak into a later CI artifact upload.
await rm(output, { recursive: true, force: true });
await mkdir(application, { recursive: true });
await mkdir(payload, { recursive: true });
// Only selected version-controlled product files can enter the installer.
// In particular, no local .env, Harness home, caches or untracked experiments.
const { stdout } = await promisify(execFile)("git", ["ls-files", "-z", "--", ".agents", "runtime", "src", "scripts", "packages", "docs", "public", "package.json", "package-lock.json", "LICENSE", "THIRD_PARTY_NOTICES.md"], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
const files = new Set(stdout.split("\0").filter(Boolean));
const { stdout: revision } = await promisify(execFile)("git", ["rev-parse", "HEAD"], { cwd: root });
const { stdout: modifications } = await promisify(execFile)("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root });
const records = {};
for (const filename of [...files].sort()) {
  if (/(^|\/)(\.env[^/]*|node_modules|\.openquantum|__pycache__)(\/|$)/.test(filename)) continue;
  const source = path.join(root, filename);
  const info = await lstat(source);
  if (!info.isFile()) throw new Error(`Unexpected payload entry: ${filename}`);
  await mkdir(path.dirname(path.join(payload, filename)), { recursive: true });
  await cp(source, path.join(payload, filename));
  records[filename] = { sha256: sha256(await readFile(source)), mode: info.mode & 0o111 ? 0o755 : 0o644 };
}
await writeFile(path.join(payload, "distribution.json"), JSON.stringify({ schemaVersion: 1, version: manifest.version,
  sourceRevision: revision.trim(), sourceDirty: Boolean(modifications.trim()), upstream: DESKTOP_SOURCE, files: records }, null, 2));
// Install from the committed npm lock into the staging area, never mutate the
// developer's node_modules. The end-user application needs no npm installation.
await symlink(path.join(dependencyRoot, "node_modules"), path.join(payload, "node_modules"), process.platform === "win32" ? "junction" : "dir");
await prepareDesktopRuntimes({ projectRoot: root, target, destination: runtimes, cache: path.join(root, ".openquantum/distributions/cache") });
for (const entry of ["lib", "build", "cordis.patch.yml", "LICENSE", "THIRD_PARTY_NOTICES.md"]) {
  await cp(path.join(prepared, entry), path.join(application, entry), { recursive: true });
}
await cp(path.join(root, "desktop/launcher.mjs"), path.join(application, "launcher.mjs"));
await cp(path.join(upstream, "build/installer.nsh"), path.join(application, "build/installer.nsh"));
const moduleCount = await copyDesktopProductionDependencies(upstream, path.join(application, "node_modules"));
console.log(`Materialized ${moduleCount} Desktop production packages`);
// Ship the OpenQuantum Host/Client packages in the application's own closure.
// First-run Profile dependency migration may replace its temporary node_modules.
const compositionHome = path.join(stage, "composition-home");
await prepareOpenQuantumHarnessHome({ projectRoot: payload, harnessHome: compositionHome, profileName: "desktop" });
await cp(path.join(compositionHome, "profiles/desktop/node_modules/@openquantum"), path.join(application, "node_modules/@openquantum"), { recursive: true });

// The pinned upstream has no installed-distribution hooks for these two native
// boundaries. Adapt the prepared copy, with exact match counts, as for branding.
const adaptations = [
  [/const DESKTOP_APP_ID = DESKTOP_PRODUCT_IDENTITY\.appId;/g, 'const DESKTOP_APP_ID = "org.openquantum.desktop";'],
  [/for \(const \[name, value\] of Object\.entries\(shellEnvironmentResolution\.updates\)\) process\.env\[name\] = value;/g, 'for (const [name, value] of Object.entries(shellEnvironmentResolution.updates)) process.env[name] = value;\n\tif (process.env.OPENQUANTUM_BUNDLED_BIN) process.env.PATH = process.env.OPENQUANTUM_BUNDLED_BIN + (process.platform === "win32" ? ";" : ":") + process.env.PATH;'],
];
const counts = adaptations.map(() => 0);
for (const filename of (await readdir(path.join(application, "lib"))).filter((name) => name.endsWith(".js"))) {
  const fullPath = path.join(application, "lib", filename);
  const original = await readFile(fullPath, "utf8");
  let source = original;
  adaptations.forEach(([pattern, replacement], index) => {
    counts[index] += [...original.matchAll(pattern)].length;
    source = source.replace(pattern, replacement);
  });
  if (source !== original) {
    await writeFile(fullPath, source.replace(/^\/\/# sourceMappingURL=.*$/gm, ""));
    await rm(`${fullPath}.map`, { force: true });
  }
}
if (counts.some((count) => count !== 1)) throw new Error(`Installed Desktop contract changed: ${counts.join(", ")}`);

// ICO permits PNG frames; use the same canonical brand artwork as every surface.
const png = await upstreamRequire("sharp")(path.join(application, "build/app-icon-mac.png")).resize(256, 256).png().toBuffer();
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
await writeFile(path.join(application, "build/app-icon.ico"), Buffer.concat([ico, png]));
const desktopManifest = { ...upstreamManifest };
for (const field of ["build", "scripts", "devDependencies"]) delete desktopManifest[field];
desktopManifest.dependencies = { ...desktopManifest.dependencies };
for (const name of Object.keys(desktopManifest.dependencies)) {
  desktopManifest.dependencies[name] = JSON.parse(await readFile(path.join(application, "node_modules", name, "package.json"), "utf8")).version;
}
for (const name of await readdir(path.join(application, "node_modules/@openquantum"))) {
  const pkg = JSON.parse(await readFile(path.join(application, "node_modules/@openquantum", name, "package.json"), "utf8"));
  desktopManifest.dependencies[pkg.name] = pkg.version;
}
await writeFile(path.join(application, "package.json"), JSON.stringify({ ...desktopManifest,
  version: manifest.version, description: "OpenQuantum — Open-source Quantum Agent Platform", author: manifest.author,
  main: "launcher.mjs", productName: "OpenQuantum Desktop",
}, null, 2));
const config = {
  ...upstreamManifest.build,
  appId: "org.openquantum.desktop", productName: "OpenQuantum Desktop",
  electronVersion: upstreamRequire("electron/package.json").version,
  electronDist: path.join(path.dirname(upstreamRequire.resolve("electron/package.json")), "dist"),
  directories: { app: application, output, buildResources: path.join(application, "build") },
  files: [...upstreamManifest.build.files, "launcher.mjs", "LICENSE", "THIRD_PARTY_NOTICES.md"],
  extraResources: [
    { from: payload, to: "openquantum", filter: ["**/*", "!node_modules{,/**/*}"] },
    { from: path.join(dependencyRoot, "node_modules"), to: "openquantum/node_modules" },
    { from: runtimes, to: "runtimes" },
  ],
  afterPack: path.join(upstream, "scripts/verify-packaged-runtime.ts"),
  afterAllArtifactBuild: path.join(upstream, "scripts/verify-electron-fuses.ts"),
  publish: null,
  forceCodeSigning: signed,
  mac: { ...upstreamManifest.build.mac, target: directoryOnly ? ["dir"] : ["dmg"], identity: signed ? undefined : null, notarize: signed },
  dmg: { artifactName: "OpenQuantum-${version}-macOS-${arch}.${ext}", title: "OpenQuantum Desktop", contents: [
    { x: 140, y: 180, type: "file" }, { x: 420, y: 180, type: "link", path: "/Applications" },
  ] },
  win: { ...upstreamManifest.build.win, target: directoryOnly ? ["dir"] : ["nsis"], signExecutable: signed },
  nsis: { ...upstreamManifest.build.nsis, shortcutName: "OpenQuantum Desktop", artifactName: "OpenQuantum-${version}-Windows-${arch}-Setup.${ext}", deleteAppDataOnUninstall: false },
};
if (directoryOnly) {
  // The pinned builder omits dir targets from its final result on macOS and
  // Windows. Supply this native build's explicit architecture to the unchanged
  // upstream verifier, which still checks the final executable and every fuse.
  const hook = path.join(stage, "verify-directory.mjs");
  const platformKey = process.platform === "darwin" ? "mac" : "win";
  const arch = upstreamRequire("builder-util").Arch[process.arch];
  await writeFile(hook, `import verify from ${JSON.stringify(pathToFileURL(config.afterAllArtifactBuild).href)};
export default function verifyDirectory(result) {
  const entries = [...result.platformToTargets];
  if (entries.length !== 1) throw new Error("Unexpected directory build platforms");
  const [[platform, targets]] = entries;
  if (platform.buildConfigurationKey !== ${JSON.stringify(platformKey)} || !(targets instanceof Map) || targets.size !== 0) {
    throw new Error("Pinned builder directory target contract changed");
  }
  return verify({ ...result, platformToTargets: new Map([[platform, new Map([[${arch}, []]])]]) });
}
`);
  config.afterAllArtifactBuild = hook;
}
const configPath = path.join(stage, "electron-builder.json");
await writeFile(configPath, JSON.stringify(config, null, 2));
await run(process.execPath, [upstreamRequire.resolve("electron-builder/cli.js"), "--projectDir", application, "--config", configPath,
  process.platform === "darwin" ? "--mac" : "--win", `--${process.arch}`, "--publish", "never"], application);
const checksums = [];
for (const filename of (await readdir(output)).filter((name) => /\.(dmg|exe)$/.test(name)).sort()) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path.join(output, filename))) hash.update(chunk);
  checksums.push(`${hash.digest("hex")}  ${filename}`);
}
if (checksums.length) await writeFile(path.join(output, "SHA256SUMS"), `${checksums.join("\n")}\n`);
console.log(`OpenQuantum ${manifest.version}: ${signed ? "signed" : "unsigned test"} artifacts in ${output}`);
