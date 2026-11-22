import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { pythonEnvironmentRoot } from "../src/lib/prepared-python.mjs";
import { Environments } from "../src/settings/codex/environments.mjs";
import { inspectEnvironment } from "../src/settings/codex/environment-check.mjs";
import { isolatedEnvironment, offlineProcess } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);

test("ST-GRAPE reproduces independent rotations and noise moments and preserves termination status", {
  skip: process.env.OPENQUANTUM_LIVE_STGRAPE !== "1", timeout: 120000,
}, async t => {
  const sdk = await describeSdk(root, "stgrape-control");
  assert.equal(sdk.environmentState, "prepared");
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "oq-stgrape-"));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  await fs.mkdir(path.join(parent, "home"));
  const environment = {
    ...isolatedEnvironment(parent, path), ...sdk.run.environment,
    OPENQUANTUM_ROOT: root, OPENBLAS_NUM_THREADS: "1", OMP_NUM_THREADS: "1", VECLIB_MAXIMUM_THREADS: "1",
  };
  const manager = new Environments({
    root, directory: path.join(parent, "settings"),
    environment: { ...process.env, ...environment, OPENQUANTUM_PYTHON_ENV_ROOT: path.dirname(pythonEnvironmentRoot(root, sdk.id)) },
  });
  const check = await inspectEnvironment(manager, sdk.id, await manager.read(sdk.id));
  assert.equal(check.ready, true);
  async function execute(name, args, timeout = 60000) {
    const cwd = path.join(parent, name);
    await fs.mkdir(cwd, { recursive: true });
    const argv = ["-I", "-B", ...args];
    const launch = process.platform === "darwin" ? offlineProcess(sdk.run.command, argv) : { command: sdk.run.command, args: argv };
    return run(launch.command, launch.args, { cwd, env: environment, timeout });
  }
  const { stdout } = await execute("reference", [path.join(root, "tests/fixtures/stgrape-validation.py")]);
  const evidence = JSON.parse(stdout);
  assert.deepEqual(evidence.runs.map(entry => entry.method), ["ST", "ST", "ST", "dense", "block-sparse"]);
  assert.ok(Math.abs(evidence.twoQubitInitialReferenceLoss - 0.5683350778207432) < 1e-10);
  const example = path.join(sdk.project, "references/native-example.py");
  await execute("pulse", [example]);
  const record = JSON.parse(await fs.readFile(path.join(parent, "pulse/result.json")));
  assert.equal(record.optimizerSuccess, false);
  assert.match(record.termination, /LIMIT/i);
  assert.equal(record.scientificValidation, "not_evaluated");
  assert.equal(record.lockSha256, sdk.lock.sha256);
  assert.equal(record.heldoutLosses.length, 8);
  assert.ok(record.heldoutLosses.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.ok(Math.abs(record.finalReferenceLoss - evidence.runs[1].finalReferenceLoss) < 1e-8);
  await assert.rejects(execute("pulse", [example]), /fresh task directory/);
  await assert.rejects(execute("invalid", [example, "--coefficients", "nan", "0", "0"]), /finite/);
  await assert.rejects(execute("budget", [example, "--seconds", "0"]), /budgets positive/);
  await assert.rejects(execute("timeout", [example], 1), error => error.killed === true);
  for (const name of ["invalid", "budget", "timeout"]) {
    await assert.rejects(fs.access(path.join(parent, name, "result.json")), { code: "ENOENT" });
  }
});
