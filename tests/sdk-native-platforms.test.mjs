import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { offlineProcess, isolatedEnvironment } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
const enabled = process.env.OPENQUANTUM_NATIVE_SDK_CHECKS === "1";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

for (const id of ["qdmi-device", "randomized-measurements"]) test(`native SDK platform: ${id}`, { skip: !enabled, timeout: 600000 }, async t => {
  const sdk = await describeSdk(root, id);
  const parent = process.env.OPENQUANTUM_SDK_CHECK_OUTPUT;
  if (parent) await fs.mkdir(path.resolve(parent), { recursive: true });
  const output = await fs.mkdtemp(path.join(parent ? path.resolve(parent) : os.tmpdir(), `${id}-`));
  if (!parent) t.after(() => fs.rm(output, { recursive: true, force: true }));
  await fs.writeFile(path.join(output, "attempt.json"), JSON.stringify({ id, startedAt: new Date().toISOString(), dependencyLockSha256: sdk.lock.sha256 }), { flag: "wx" });
  await fs.mkdir(path.join(output, "home"));
  await fs.writeFile(path.join(output, "sdk.json"), JSON.stringify(sdk, null, 2));
  const env = isolatedEnvironment(output, path);
  const checks = {};
  try {
    let command, args, scope, packages;
    if (id === "qdmi-device") {
      const driver = JSON.parse(await fs.readFile(path.join(root, ".openquantum/qdmi/driver.json")));
      assert.equal(driver.driverKind, "example", "Never run this fixture against a vendor driver");
      assert.equal(driver.sourceCommit, "18cfb67fd9042761d3005c2f8655751c1758f9c5");
      for (const entry of [driver.driver, driver.configuration, ...driver.deviceLibraries]) assert.equal(sha(await fs.readFile(entry.path)), entry.sha256);
      await fs.copyFile(path.join(root, ".openquantum/qdmi/driver.json"), path.join(output, "driver.json"));
      const headers = [];
      for (const name of ["client.h", "types.h"]) {
        const filename = path.join(sdk.source, "include/qdmi", name);
        headers.push({ path: filename, sha256: sha(await fs.readFile(filename)) });
      }
      await fs.writeFile(path.join(output, "headers.json"), JSON.stringify(headers));
      const source = path.join(output, "custom.c");
      await fs.copyFile(path.join(root, "tests/fixtures/sdk-native-qdmi.c"), source);
      command = path.join(output, "custom-qdmi");
      const directory = path.dirname(driver.driver.path);
      const compileLaunch = offlineProcess("cc", ["-std=c11", "-I", path.join(sdk.source, "include"), source,
        "-L", directory, "-lqdmi_example_driver", `-Wl,-rpath,${directory}`, "-o", command]);
      const compile = await run(compileLaunch.command, compileLaunch.args, { cwd: output, env, timeout: 60000 });
      await fs.writeFile(path.join(output, "compile.log"), compile.stdout + compile.stderr);
      // The example driver permits configuration only inside cwd or HOME.
      // Copy the reviewed configuration into the fixture instead of broadening HOME.
      env.QDMI_CONF = path.join(output, "qdmi.conf");
      await fs.copyFile(driver.configuration.path, env.QDMI_CONF);
      args = [];
      scope = ["custom C program compiled against locked public headers", "official local example driver lifecycle and variable-size metadata buffers", "invalid property error path; no physical hardware"];
      packages = [{ package: "QDMI", version: driver.interfaceVersion, sourceCommit: driver.sourceCommit }];
    } else {
      command = "julia";
      const source = path.join(output, "custom.jl");
      await fs.copyFile(path.join(root, "tests/fixtures/sdk-native-randommeas.jl"), source);
      args = ["--startup-file=no", `--project=${sdk.project}`, source];
      // Pkg's prepared depot is explicit; HOME remains isolated from user config.
      env.JULIA_DEPOT_PATH = path.join(os.homedir(), ".julia");
      env.JULIA_NUM_THREADS = "2";
      env.JULIA_PKG_OFFLINE = "true";
      scope = ["custom MPS input and gate", "RandomMeas measurement data and subsystem reduction", "complete binary artifact; no research inference"];
      packages = sdk.lockedPackages;
    }
    checks.lockedRuntime = true;
    const launch = offlineProcess(command, args);
    const result = await run(launch.command, launch.args, { cwd: output, env, timeout: 480000, maxBuffer: 2 * 1024 * 1024 });
    await fs.writeFile(path.join(output, "stdout.log"), result.stdout);
    await fs.writeFile(path.join(output, "stderr.log"), result.stderr);
    const last = JSON.parse(result.stdout.trim().split("\n").at(-1));
    if (id === "qdmi-device") {
      assert.ok(last.devices > 0);
      assert.ok((await fs.stat(path.join(output, "device-metadata.txt"))).size > 0);
      await fs.writeFile(path.join(output, "api-objects.json"), JSON.stringify({ models: [last], operations: scope }));
    } else {
      assert.equal(last.status, "completed");
      packages = JSON.parse(await fs.readFile(path.join(output, "runtime-packages.json")));
      assert.equal(packages.Julia, "1.12.7");
      for (const name of ["RandomMeas", "JSON3"]) assert.equal(packages[name], sdk.lockedPackages.find(entry => entry.name === name).version);
      assert.ok((await fs.stat(path.join(output, "full-array.bin"))).size > 3_000_000);
      const failed = path.join(output, "failure.jl");
      await fs.writeFile(failed, 'write("partial.txt", "retained"); error("custom-program-error")');
      const probe = offlineProcess(command, ["--startup-file=no", failed]);
      await assert.rejects(run(probe.command, probe.args, { cwd: output, env, timeout: 30000 }), error => error.code === 1 && error.stderr.includes("custom-program-error"));
      assert.equal(await fs.readFile(path.join(output, "partial.txt"), "utf8"), "retained");
      checks.failureDiagnosticAndPartialFile = true;
    }
    checks.programAndArtifacts = true;
    const files = [];
    for (const file of await fs.readdir(output, { withFileTypes: true })) if (file.isFile()) {
      const name = path.join(output, file.name), bytes = await fs.readFile(name);
      files.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
    }
    const execution = { executionStatus: "completed", scientificValidation: "not_evaluated", dependencyLockSha256: sdk.lock.sha256, packages, files, argv: [command, ...args], cwd: output };
    const executionBytes = Buffer.from(JSON.stringify(execution, null, 2) + "\n");
    await fs.writeFile(path.join(output, "execution.json"), executionBytes);
    await fs.writeFile(path.join(output, "verification.json"), JSON.stringify({ id, status: "passed", checks, dependencyLockSha256: sdk.lock.sha256, executionRecordSha256: sha(executionBytes), networkIsolation: "macOS sandbox-exec deny network*", scientificValidation: "not_evaluated" }, null, 2));
    t.diagnostic(`Evidence: ${output}`);
  } catch (error) {
    if (error.stdout !== undefined) await fs.writeFile(path.join(output, "stdout.log"), error.stdout);
    if (error.stderr !== undefined) await fs.writeFile(path.join(output, "stderr.log"), error.stderr);
    await fs.writeFile(path.join(output, "verification.json"), JSON.stringify({ id, status: "failed", checks, error: error.message, scientificValidation: "not_evaluated" }, null, 2));
    t.diagnostic(`Failure evidence: ${output}`);
    throw error;
  }
});
