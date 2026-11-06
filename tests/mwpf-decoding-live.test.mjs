import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { pythonEnvironmentRoot } from "../src/lib/prepared-python.mjs";
import { Environments } from "../src/settings/codex/environments.mjs";
import { inspectEnvironment } from "../src/settings/codex/environment-check.mjs";
import { offlineProcess, isolatedEnvironment } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
const enabled = process.env.OPENQUANTUM_LIVE_MWPF === "1";

async function prepare(t) {
  const sdk = await describeSdk(root, "mwpf-decoding");
  assert.equal(sdk.environmentState, "prepared");
  const parent = process.env.OPENQUANTUM_SDK_CHECK_OUTPUT || os.tmpdir();
  await fs.mkdir(parent, { recursive: true });
  const output = await fs.mkdtemp(path.join(parent, "mwpf-"));
  if (!process.env.OPENQUANTUM_SDK_CHECK_OUTPUT) t.after(() => fs.rm(output, { recursive: true, force: true }));
  await fs.mkdir(path.join(output, "home"));
  const execute = async (args, { timeout = 60000 } = {}) => {
    const launch = offlineProcess(sdk.run.command, ["-B", ...args]);
    try {
      const result = await run(launch.command, launch.args, { cwd: output, env: isolatedEnvironment(output, path), timeout });
      await fs.appendFile(path.join(output, "stdout.log"), result.stdout);
      await fs.appendFile(path.join(output, "stderr.log"), result.stderr);
      return result;
    } catch (error) {
      await fs.appendFile(path.join(output, "stdout.log"), error.stdout || "");
      await fs.appendFile(path.join(output, "stderr.log"), error.stderr || "");
      throw error;
    }
  };
  t.diagnostic(`Evidence: ${output}`);
  return { sdk, output, execute, example: path.join(sdk.project, "references/native-example.py") };
}

test("MWPF agrees with independent hypergraph and packed-observable references offline", { skip: !enabled, timeout: 90000 }, async t => {
  const { output, execute } = await prepare(t);
  await execute([path.join(root, "tests/fixtures/mwpf-validation.py")]);
  const result = JSON.parse(await fs.readFile(path.join(output, "validation.json")));
  assert.equal(result.passed, true);
  assert.equal(result.testsRun, 7);
  assert.equal(result.hypergraphCases.length, 64);
  assert.equal(result.scientificValidation, "not_evaluated");
});

test("MWPF accepts a user hypergraph and rejects an unsatisfiable input without a success artifact", { skip: !enabled }, async t => {
  const { output, execute, example } = await prepare(t);
  const input = path.join(output, "graph.json");
  await fs.writeFile(input, JSON.stringify({ vertex_count: 6, edges: [[[0, 2, 5], 7]], syndrome: [0, 2, 5] }));
  await execute([example, "--input", input]);
  const result = JSON.parse(await fs.readFile(path.join(output, "result.json")));
  assert.equal(result.solution.weight, 7);
  await fs.rename(path.join(output, "result.json"), path.join(output, "valid-result.json"));
  await fs.writeFile(input, JSON.stringify({ vertex_count: 2, edges: [[[0, 1], 1]], syndrome: [0] }));
  await assert.rejects(execute([example, "--input", input]), error => error.code === 1 && /unsolvable/.test(error.stderr));
  await assert.rejects(fs.access(path.join(output, "result.json")), { code: "ENOENT" });
});

test("MWPF CLI preserves actual samples and predictions for a user DEM", { skip: !enabled }, async t => {
  const { output, execute, example } = await prepare(t);
  const dem = path.join(output, "model.dem");
  await fs.writeFile(dem, "error(0.01) D0 D1 D8 L0\nerror(0.02) D1 L8\nerror(0.03) D8 L0 L8\n");
  await execute([example, "--dem", dem, "--shots", "1024", "--seed", "7"]);
  const result = JSON.parse(await fs.readFile(path.join(output, "result.json")));
  assert.equal(result.logicalErrors, 0);
  assert.equal(result.panicAction, "RAISE");
  await execute(["-c", "import numpy as np; a=np.load('samples.npz'); assert a['detectors'].shape==(1024,2); assert a['actual'].shape==(1024,2); np.testing.assert_array_equal(a['predicted'],a['actual'])"]);
});

test("MWPF uses the existing process timeout and Codex prepared-environment check", { skip: !enabled }, async t => {
  const { output, execute } = await prepare(t);
  await assert.rejects(execute(["-c", "import time; print('started', flush=True); time.sleep(30)"], { timeout: 1000 }), error => error.killed === true && /started/.test(error.stdout));
  // Point this adapter fixture at the explicitly prepared SDK. Its own default
  // directory intentionally differs from the command-line environment directory.
  const environment = { ...process.env, OPENQUANTUM_PYTHON_ENV_ROOT: path.dirname(pythonEnvironmentRoot(root, "mwpf-decoding")) };
  const manager = new Environments({ root, directory: path.join(output, "settings"), environment });
  const record = await manager.read("mwpf-decoding");
  const before = await manager.status("mwpf-decoding");
  assert.equal(before.installation, "present");
  record.check = await inspectEnvironment(manager, "mwpf-decoding", record);
  await manager.write("mwpf-decoding", record);
  const after = await manager.status("mwpf-decoding");
  assert.equal(after.ready, true);
  await fs.writeFile(path.join(output, "settings-check.json"), JSON.stringify({ before, after, scope: "Codex environment adapter and test process timeout; not a live host session or scientific acceptance" }, null, 2));
});
