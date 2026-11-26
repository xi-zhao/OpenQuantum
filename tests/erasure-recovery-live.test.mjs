import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { isolatedEnvironment, offlineProcess } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);

test("the erasure circuit recovers a Bell pair on each branch and attains the two cut bounds", {
  skip: process.env.OPENQUANTUM_LIVE_ERASURE_RECOVERY !== "1", timeout: 60000,
}, async t => {
  const sdk = await describeSdk(root, "erasure-recovery");
  const reference = await describeSdk(root, "qec-memory-experiment");
  assert.equal(sdk.environmentState, "prepared");
  assert.equal(reference.environmentState, "prepared");
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "oq-erasure-"));
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  await fs.mkdir(path.join(cwd, "home"));
  const env = { ...isolatedEnvironment(cwd, path), OPENQUANTUM_ROOT: root,
    OPENQUANTUM_SDK_SOURCE_ROOT: path.dirname(sdk.sourceProject.directory) };
  const execute = (command, file, ...args) => {
    const argv = ["-I", "-B", file, ...args];
    const launch = process.platform === "darwin" ? offlineProcess(command, argv) : { command, args: argv };
    return run(launch.command, launch.args, { cwd, env, timeout: 30000 });
  };
  const example = path.join(sdk.project, "references/native-example.py");
  await execute(sdk.run.command, example);
  const record = JSON.parse(await fs.readFile(path.join(cwd, "result.json"), "utf8"));
  assert.equal(record.upstreamRevision, sdk.sourceProject.revision);
  assert.equal(record.scientificValidation, "not_evaluated");
  const audit = path.join(root, "tests/fixtures/erasure-recovery-validation.py");
  const { stdout } = await execute(reference.run.command, audit, "result.json");
  const checked = JSON.parse(stdout);
  assert.deepEqual(["line", "triangle", "fresh_relays"].map(name => checked.cases[name].branches), [4, 4, 16]);
  assert.equal(checked.branchesFailingWithoutXCorrection, 2);
  await assert.rejects(execute(sdk.run.command, example), /FileExistsError/);
});
