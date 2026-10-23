import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { nativeCmakeArguments } from "../src/lib/sdk-native-build.mjs";

const cmake = process.env.OPENQUANTUM_CMAKE || "cmake";
const available = spawnSync(cmake, ["--version"], { stdio: "ignore" }).status === 0;
const multi = process.platform === "darwin" ? "Xcode" : spawnSync("ninja", ["--version"], { stdio: "ignore" }).status === 0 ? "Ninja Multi-Config" : null;
for (const generator of ["Unix Makefiles", multi].filter(Boolean)) {
  test(`native build selects and locates a real Release binary with ${generator}`, { skip: !available || process.platform === "win32" }, async t => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "oq-cmake-with-spaces-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const source = path.join(temporary, "source with spaces"), directory = path.join(temporary, "build with spaces");
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, "CMakeLists.txt"), "cmake_minimum_required(VERSION 3.16)\nproject(oq_fixture LANGUAGES CXX)\nadd_executable(oq_fixture main.cpp)\n");
    await fs.writeFile(path.join(source, "main.cpp"), "int main() {\n#ifdef NDEBUG\nreturn 0;\n#else\nreturn 1;\n#endif\n}\n");
    const commands = nativeCmakeArguments(source, directory, "oq_fixture");
    const run = args => execFileSync(cmake, args, { encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    run([...commands.configure, "-G", generator]);
    run(commands.build);
    const binary = path.join(directory, "oq_fixture");
    assert.ok((await fs.stat(binary)).isFile());
    assert.equal(spawnSync(binary, [], { stdio: "ignore" }).status, 0, "Debug must not be mistaken for Release");
    if (generator !== "Unix Makefiles") await assert.rejects(fs.access(path.join(directory, "Debug", "oq_fixture")), { code: "ENOENT" });
  });
}
