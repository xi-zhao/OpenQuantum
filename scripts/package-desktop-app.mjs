import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DESKTOP_SOURCE, requireDesktopBuild } from "./lib/desktop-source.mjs";
import { copyDesktopProductionDependencies, writeDesktopBuilderPreload } from "./lib/desktop-package-dependencies.mjs";
import { checkReleaseVersions } from "./lib/release-version.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
let directoryOnly = false;
let destination;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dir") directoryOnly = true;
  else if (args[i] === "--output" && args[i + 1]) destination = args[++i];
  else throw new Error("Usage: desktop:app:package -- --output <absolute-directory> [--dir]");
}
if (!destination || !path.isAbsolute(destination)) throw new Error("An absolute --output directory is required");
if (process.platform !== "darwin" || !["arm64", "x64"].includes(process.arch)) throw new Error("Build this macOS installer on its native architecture");
await checkReleaseVersions(root);
const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const upstream = await requireDesktopBuild(root);
const buildMarker = JSON.parse(await readFile(path.join(upstream, "../.openquantum-build.json"), "utf8"));
const require = createRequire(path.join(upstream, "package.json"));
const upstreamManifest = JSON.parse(await readFile(path.join(upstream, "package.json"), "utf8"));
const env = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false", NODE_USE_ENV_PROXY: "1",
  DSH_ELECTRON_BUILDER_TRAVERSAL_ONLY: "1",
  ELECTRON_BUILDER_CACHE: process.env.ELECTRON_BUILDER_CACHE || path.join(destination, "builder-cache"),
};
for (const key of Object.keys(env)) if (/^(?:CSC_|WIN_CSC_|APPLE_)/.test(key) && key !== "CSC_IDENTITY_AUTO_DISCOVERY") delete env[key];
const run = (command, argv, cwd = root) => new Promise((resolve, reject) => {
  const child = spawn(command, argv, { cwd, env, stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", code => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} exited ${code}`)));
});
if (!process.env.npm_execpath) throw new Error("Build through npm run desktop:app:package");
await run(process.execPath, [process.env.npm_execpath, "run", "desktop:package", "--", "--dir"]);
const content = path.join(root, ".openquantum/distributions", `${process.platform}-${process.arch}`, "content");
// Reuse the same checked capability payload and its immutable runtime versions.
// No Home, private configuration or untracked source enters the product.
const stage = path.join(destination, "app-stage");
const output = path.join(destination, directoryOnly ? "directory" : "artifacts");
const application = path.join(stage, "application");
await rm(stage, { recursive: true, force: true });
await mkdir(application, { recursive: true });
await mkdir(output, { recursive: true });
for (const entry of ["lib", "build", "cordis.patch.yml", "LICENSE"]) {
  await cp(path.join(upstream, entry), path.join(application, entry), { recursive: true });
}
await cp(path.join(root, "desktop/launcher.mjs"), path.join(application, "launcher.mjs"));
await cp(path.join(root, "packages/openquantum-web-branding/assets/desktop-icon-512.png"), path.join(application, "build/openquantum.png"));
const moduleCount = await copyDesktopProductionDependencies(upstream, path.join(application, "node_modules"));
console.log(`Materialized ${moduleCount} Desktop production packages`);
const appManifest = { ...upstreamManifest };
for (const key of ["build", "scripts", "devDependencies"]) delete appManifest[key];
appManifest.dependencies = { ...appManifest.dependencies };
for (const name of Object.keys(appManifest.dependencies)) {
  appManifest.dependencies[name] = JSON.parse(await readFile(path.join(application, "node_modules", name, "package.json"), "utf8")).version;
}
await writeFile(path.join(application, "package.json"), JSON.stringify({ ...appManifest,
  version: manifest.version, productName: "OpenQuantum", description: "OpenQuantum personal Harness", author: manifest.author,
  main: "launcher.mjs", openquantum: { upstream: DESKTOP_SOURCE, nativeMenu: buildMarker.nativeMenu, signing: "ad-hoc", notarized: false },
}, null, 2));
const config = {
  ...upstreamManifest.build,
  appId: "org.openquantum.desktop", productName: "OpenQuantum",
  electronVersion: require("electron/package.json").version,
  electronDist: path.join(path.dirname(require.resolve("electron/package.json")), "dist"),
  directories: { app: application, output, buildResources: path.join(application, "build") },
  files: [...upstreamManifest.build.files, "build/openquantum.png", "launcher.mjs", "LICENSE"],
  extraResources: [
    { from: path.join(content, "openquantum"), to: "openquantum", filter: ["**/*", "!node_modules{,/**/*}"] },
    { from: path.join(content, "openquantum/node_modules"), to: "openquantum/node_modules" },
    { from: path.join(content, "runtimes"), to: "runtimes" },
  ],
  afterPack: path.join(upstream, "scripts/verify-packaged-runtime.ts"),
  afterAllArtifactBuild: path.join(stage, "verify-fuses.mjs"),
  electronFuses: { runAsNode: true, enableEmbeddedAsarIntegrityValidation: true, onlyLoadAppFromAsar: true },
  publish: null, forceCodeSigning: false,
  mac: { ...upstreamManifest.build.mac, target: directoryOnly ? ["dir"] : ["dmg"], identity: "-", notarize: false, icon: "build/openquantum.png" },
  dmg: { artifactName: "OpenQuantum-${version}-macOS-${arch}.${ext}", title: "OpenQuantum", contents: [
    { x: 140, y: 180, type: "file" }, { x: 420, y: 180, type: "link", path: "/Applications" },
  ] },
};
// 2.0.0 predates the upstream fuse hook. Preserve all three checks from the
// later maintained build using Electron's official reader on the final binary.
await writeFile(config.afterAllArtifactBuild, `import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(${JSON.stringify(path.join(upstream, "package.json"))});
const { getCurrentFuseWire, FuseV1Options } = require("@electron/fuses");
const { FuseState } = require("@electron/fuses/dist/constants.js");
export default async function verifyFinalFuses(result) {
  const executable = path.join(result.outDir, ${JSON.stringify(process.arch === "arm64" ? "mac-arm64" : "mac")}, "OpenQuantum.app/Contents/MacOS/OpenQuantum");
  const wire = await getCurrentFuseWire(executable);
  for (const name of ["RunAsNode", "EnableEmbeddedAsarIntegrityValidation", "OnlyLoadAppFromAsar"]) {
    if (wire[FuseV1Options[name]] !== FuseState.ENABLE) throw new Error("Invalid final Electron fuse: " + name);
  }
  console.log("Final Electron fuses verified: RunAsNode, embedded ASAR integrity, ASAR-only loading");
}
`);
const configPath = path.join(stage, "electron-builder.json");
await writeFile(configPath, JSON.stringify(config, null, 2));
const preload = await writeDesktopBuilderPreload(upstream, stage);
await run(process.execPath, ["--require", preload, require.resolve("electron-builder/cli.js"), "--projectDir", application, "--config", configPath,
  "--mac", `--${process.arch}`, "--publish", "never"], application);
const checksums = [];
for (const name of (await readdir(output)).filter(name => name === `OpenQuantum-${manifest.version}-macOS-${process.arch}.dmg`)) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path.join(output, name))) hash.update(chunk);
  checksums.push(`${hash.digest("hex")}  ${name}`);
}
if (checksums.length) await writeFile(path.join(output, "SHA256SUMS"), `${checksums.join("\n")}\n`);
console.log(`OpenQuantum ${manifest.version}: locally signed, not notarized; artifacts in ${output}`);
