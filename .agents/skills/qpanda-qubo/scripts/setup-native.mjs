import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

// pyqpanda_alg 2.0.0's macOS VQE extension links fmt 11. Build that ABI in
// this installation only, without editing the wheel or the system Homebrew.
if (process.platform !== "darwin") process.exit(0);
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const directory = path.join(process.env.OPENQUANTUM_NATIVE_SDK_ROOT || path.join(root, ".openquantum/sdk-native"), "qpanda-qubo");
const source = path.join(directory, "fmt-source");
const prefix = path.join(directory, "fmt");
const revision = "40626af88bd7df9a5fb80be7b25ac85b122d6c21";
const repository = "https://github.com/fmtlib/fmt.git";
const run = (command, args, capture = false) => {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: capture ? "pipe" : "inherit", timeout: 600000 });
  if (result.error || result.status !== 0) throw new Error(`QPanda native setup failed: ${command} (${result.error?.message ?? result.status})`);
  return result.stdout?.trim();
};
await fs.mkdir(directory, { recursive: true });
const exists = await fs.access(source).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; });
if (!exists) {
  run("git", ["clone", "--depth", "1", "--branch", "11.2.0", repository, source]);
}
if (run("git", ["-C", source, "rev-parse", "HEAD"], true) !== revision || run("git", ["-C", source, "status", "--porcelain"], true)) throw new Error("fmt source differs from the fixed clean revision");
run("cmake", ["-S", source, "-B", path.join(directory, "build"), "-DCMAKE_BUILD_TYPE=Release", "-DBUILD_SHARED_LIBS=ON", "-DFMT_TEST=OFF", "-DFMT_DOC=OFF", `-DCMAKE_INSTALL_PREFIX=${prefix}`]);
run("cmake", ["--build", path.join(directory, "build"), "--parallel", "2"]);
run("cmake", ["--install", path.join(directory, "build")]);
const library = path.join(prefix, "lib/libfmt.11.dylib");
const sha256 = createHash("sha256").update(await fs.readFile(library)).digest("hex");
await fs.writeFile(path.join(directory, "native.json"), JSON.stringify({ repository, revision, version: "11.2.0", arch: process.arch, library, sha256 }, null, 2) + "\n");
console.log("QPanda fmt 11 ABI prepared in the isolated SDK directory");
