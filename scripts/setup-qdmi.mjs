import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
if (!["darwin", "linux"].includes(process.platform)) throw new Error("The official example driver uses dlopen; setup currently supports macOS and Linux");
const directory = path.join(root, ".openquantum/qdmi");
const source = path.join(directory, "source");
const build = path.join(directory, "build");
const commit = "18cfb67fd9042761d3005c2f8655751c1758f9c5";
const manifest = path.join(directory, "driver.json");
const run = (command, args, capture = false) => {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (result.error || result.status !== 0) throw new Error(command + " failed: " + (result.error?.message ?? result.stderr ?? result.status));
  return result.stdout?.trim();
};
const entry = async file => ({ path: file, sha256: createHash("sha256").update(await readFile(file)).digest("hex") });
await mkdir(directory, { recursive: true });
let existing;
try { existing = JSON.parse(await readFile(manifest, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (existing && existing.driverKind !== "example") throw new Error("Refusing to replace a configured vendor driver with the example");
try { await access(path.join(source, ".git")); }
catch { run("git", ["clone", "--depth", "1", "--branch", "v1.3.3", "https://github.com/Munich-Quantum-Software-Stack/QDMI.git", source]); }
if (run("git", ["-C", source, "rev-parse", "HEAD"], true) !== commit
    || run("git", ["-C", source, "status", "--porcelain", "--untracked-files=all"], true))
  throw new Error("QDMI source differs from the reviewed commit; refusing to build");
run(process.execPath, [path.join(root, "scripts/setup-paper-tools.mjs"), "qdmi-device"]);
run("cmake", ["-S", source, "-B", build, "-DCMAKE_BUILD_TYPE=Release", "-DBUILD_SHARED_LIBS=ON",
  "-DBUILD_QDMI_TESTS=OFF", "-DBUILD_CXX_QDMI_TESTS=OFF", "-DBUILD_QDMI_TEMPLATES=OFF", "-DBUILD_QDMI_DOCS=OFF", "-DBUILD_QDMI_EXAMPLES=ON"]);
run("cmake", ["--build", build, "--target", "qdmi_example_driver", "cxx-qdmi-device", "--parallel", "2"]);
const extension = process.platform === "darwin" ? "dylib" : "so";
const driver = path.join(build, "examples/driver/libqdmi_example_driver." + extension);
const device = path.join(build, "examples/device/src/libcxx-qdmi-device." + extension);
if (/\s/.test(device)) throw new Error("The official example driver configuration does not support whitespace in library paths");
const configuration = path.join(directory, "qdmi.conf");
await writeFile(configuration, device + " CXX\n");
await writeFile(manifest, JSON.stringify({
  interfaceVersion: "1.3.3", sourceCommit: commit, driverKind: "example",
  driver: await entry(driver), configuration: await entry(configuration), deviceLibraries: [await entry(device)],
  exampleLifecycle: true, emptyToken: true,
}, null, 2) + "\n");
console.log("QDMI example driver prepared; metadata only, no physical hardware.");
