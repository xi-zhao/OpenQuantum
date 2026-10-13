import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readSdkLibraries, nativeSdkRoot, sdkSourceRoot } from "../src/lib/sdk-access.mjs";
import { prepareSdkSource, sourceCommand } from "../src/lib/sdk-source.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const [id, ...extra] = process.argv.slice(2);
const entry = (await readSdkLibraries(root)).find(item => item.id === id && item.nativeProject);
if (!entry || extra.length) throw new Error("Provide one reviewed native SDK id");
const project = path.join(root, ".agents/skills", id);
const manifestBytes = await fs.readFile(path.join(project, entry.nativeProject.manifest));
const lockBytes = await fs.readFile(path.join(project, entry.nativeProject.lock));
const manifest = JSON.parse(manifestBytes), lock = JSON.parse(lockBytes);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
if (manifest.schemaVersion !== 1 || lock.schemaVersion !== 1 || manifest.buildSystem !== "cmake" || !/^[a-z][a-z0-9-]*$/.test(manifest.target) || !/^[a-z][a-z0-9-]*$/.test(manifest.executable) || !Array.isArray(lock.sources) || !lock.sources.length) throw new Error("Unsupported native SDK build contract");
const names = new Set();
for (const source of lock.sources) {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(source.name) || names.has(source.name)) throw new Error("Invalid or duplicate native dependency");
  names.add(source.name);
}
const main = lock.sources.find(source => source.name === manifest.name);
if (!main || main.repository !== manifest.source.repository || main.revision !== manifest.source.revision || manifest.source.repository !== entry.sourceProject?.repository || manifest.source.revision !== entry.sourceProject?.revision) throw new Error("Native source differs from reviewed catalog or lock");
const directory = nativeSdkRoot(root, id), sourceRoot = sdkSourceRoot(root, id);
await fs.mkdir(directory, { recursive: true });
const marker = path.join(directory, "openquantum-native.json");
await fs.rm(marker, { force: true });
const sourceRecord = await prepareSdkSource(sourceRoot, main);
const dependencyRecords = [];
for (const source of lock.sources.filter(item => item !== main)) {
  const checkout = path.join(directory, "dependencies", source.name);
  dependencyRecords.push({ name: source.name, directory: checkout, ...await prepareSdkSource(checkout, source) });
}
// CMake upstream modifies two dependency inputs. Copy them into a fresh build,
// retaining pristine reviewed checkouts and previous failure evidence.
const build = await fs.mkdtemp(path.join(directory, "build-"));
const configure = ["-S", sourceRoot, "-B", build, "-DCMAKE_BUILD_TYPE=Release", "-DFETCHCONTENT_FULLY_DISCONNECTED=ON", "-DCMAKE_POLICY_VERSION_MINIMUM=3.10"];
for (const dependency of dependencyRecords) {
  const input = path.join(build, "inputs", dependency.name);
  await fs.cp(dependency.directory, input, { recursive: true, verbatimSymlinks: true, filter: file => path.basename(file) !== ".git" });
  configure.push(`-DFETCHCONTENT_SOURCE_DIR_${dependency.name.toUpperCase()}=${input}`);
}
const cmake = process.env.OPENQUANTUM_CMAKE || "cmake";
sourceCommand(cmake, configure, root);
sourceCommand(cmake, ["--build", build, "--target", manifest.target, "--parallel", "2"], root);
const output = path.join(build, process.platform === "win32" ? `${manifest.executable}.exe` : manifest.executable);
const binary = await fs.readFile(output);
const bin = path.join(directory, "bin");
await fs.mkdir(bin, { recursive: true });
const executable = path.join(bin, path.basename(output));
const pendingBinary = `${executable}.${process.pid}.tmp`;
await fs.writeFile(pendingBinary, binary, { mode: 0o755 });
await fs.rename(pendingBinary, executable);
if (hash(await fs.readFile(path.join(project, entry.nativeProject.manifest))) !== hash(manifestBytes) || hash(await fs.readFile(path.join(project, entry.nativeProject.lock))) !== hash(lockBytes)) throw new Error("Native SDK contract changed during setup");
const cache = await fs.readFile(path.join(build, "CMakeCache.txt"), "utf8");
const compiler = cache.match(/^CMAKE_CXX_COMPILER:(?:FILEPATH|STRING)=(.+)$/m)?.[1];
if (!compiler) throw new Error("Native build did not record its C++ compiler");
const toolchain = { cmake: sourceCommand(cmake, ["--version"], root, { capture: true }), compiler, compilerVersion: sourceCommand(compiler, ["--version"], root, { capture: true }), cmakeCacheSha256: hash(cache) };
const record = { schemaVersion: 1, manifestSha256: hash(manifestBytes), dependencyLockSha256: hash(lockBytes), executableSha256: hash(binary), platform: process.platform, arch: process.arch, toolchain, build, source: sourceRecord, dependencies: dependencyRecords };
const pending = `${marker}.${process.pid}.tmp`;
await fs.writeFile(pending, JSON.stringify(record, null, 2) + "\n");
await fs.rename(pending, marker);
console.log(`Prepared ${id} native executable; research execution and scientific acceptance remain separate`);
