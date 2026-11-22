import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { Environments } from "../src/settings/codex/environments.mjs";
import { inspectEnvironment } from "../src/settings/codex/environment-check.mjs";
import { offlineProcess } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);

test("tropidist produces a fresh logical witness or preserves its incomplete run", {
  skip: process.env.OPENQUANTUM_LIVE_TROPIDIST !== "1", timeout: 120000,
}, async t => {
  const sdk = await describeSdk(root, "tropidist-distance");
  assert.equal(sdk.environmentState, "prepared");
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "oq-cdist-cli-"));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const manager = new Environments({ root, directory: path.join(parent, "settings"), environment: { ...process.env, ...sdk.run.environment } });
  const check = await inspectEnvironment(manager, sdk.id, await manager.read(sdk.id));
  assert.equal(check.ready, true);
  async function execute(name, args, overrides = {}) {
    const cwd = path.join(parent, name);
    await fs.mkdir(cwd, { recursive: true });
    const argv = ["-B", path.join(sdk.project, "references/native-example.py"), ...args];
    const launch = process.platform === "darwin" ? offlineProcess(sdk.run.command, argv) : { command: sdk.run.command, args: argv };
    await run(launch.command, launch.args, { cwd, timeout: 30000, env: { PATH: process.env.PATH, ...sdk.run.environment, ...overrides } });
    const result = JSON.parse(await fs.readFile(path.join(cwd, "result.json")));
    return { result, raw: JSON.parse(await fs.readFile(path.join(cwd, result.raw))) };
  }
  const matrix = await execute("matrix", []);
  assert.deepEqual([matrix.result.lowerBound, matrix.result.upperBound, matrix.result.checkedExact], [3, 3, true]);
  assert.deepEqual(matrix.result.argv.slice(0, 5), ["--matrices", "H.mtx", "L.mtx", "--out", "distance.json"]);
  assert.deepEqual(matrix.raw.witness.toSorted((a, b) => a - b), [0, 1, 2]);
  await assert.rejects(execute("matrix", []), /fresh task directory/);
  const limited = await execute("limited", ["--kmax", "1"]);
  assert.equal(limited.result.checkedExact, false);
  assert.ok(limited.result.lowerBound <= 3);
  const logical = path.join(parent, "L.mtx"), checks = path.join(parent, "H.mtx");
  await fs.writeFile(checks, "%%MatrixMarket matrix coordinate pattern general\n0 1 0\n");
  await fs.writeFile(logical, "%%MatrixMarket matrix coordinate pattern general\n1 1 1\n1 1\n");
  const single = await execute("detector-free", ["--matrices", checks, logical]);
  assert.equal(single.result.upperBound, 1);
  await fs.writeFile(logical, "%%MatrixMarket matrix coordinate integer general\n1 1 1\n1 1 0\n");
  await assert.rejects(execute("weighted", ["--matrices", checks, logical]), /coordinate pattern general/);
  await assert.rejects(execute("deadline", ["--wall-seconds", "0.000001"]), /TimeoutExpired/);
  await assert.rejects(fs.access(path.join(parent, "deadline/result.json")), { code: "ENOENT" });
  await assert.rejects(execute("unprepared", [], { OPENQUANTUM_NATIVE_SDK_ROOT: path.join(parent, "empty") }), /Explicitly prepare/);
  await assert.rejects(fs.access(path.join(parent, "empty")), { code: "ENOENT" });
  for (const name of ["repetition", "surface-z"]) {
    const circuit = path.join(root, "docs/integrations/evidence/tropidist-2026-11-21", name + ".stim");
    const { result, raw } = await execute(name, ["--circuit", circuit]);
    assert.deepEqual([result.lowerBound, result.upperBound, result.checkedExact], [3, 3, true]);
    assert.deepEqual(raw.replay.fired_detectors, []);
    assert.deepEqual(raw.replay.flipped_observables, [0]);
  }
});
