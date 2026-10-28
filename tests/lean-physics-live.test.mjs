import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { Environments } from "../src/settings/codex/environments.mjs";
import { inspectEnvironment } from "../src/settings/codex/environment-check.mjs";
import { offlineProcess } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);

test("real Lean checks mathlib/physlib proofs, rejects a false theorem and exposes sorryAx offline", {
  skip: process.env.OPENQUANTUM_LIVE_LEAN !== "1", timeout: 240000,
}, async t => {
  const sdk = await describeSdk(root, "lean-physics");
  assert.equal(sdk.environmentState, "prepared", "Explicitly prepare the fixed Lean environment first");
  const parent = process.env.OPENQUANTUM_LEAN_TEST_OUTPUT;
  if (parent) await fs.mkdir(parent, { recursive: true });
  const directory = await fs.mkdtemp(path.join(parent || os.tmpdir(), "lean-proofs-"));
  if (!parent) t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const examples = {
    "Proofs.lean": await fs.readFile(path.join(sdk.project, "OpenQuantumProofs.lean"), "utf8"),
    "False.lean": "theorem false_equality : (1 : Nat) = 2 := by rfl\n",
    "Unfinished.lean": "theorem unfinished : (1 : Nat) = 2 := by sorry\n#print axioms unfinished\n",
  };
  const results = {};
  for (const [name, text] of Object.entries(examples)) {
    const file = path.join(directory, name);
    await fs.writeFile(file, text);
    const launch = offlineProcess(sdk.run.command, [file]);
    let result;
    try { result = { exitCode: 0, ...await run(launch.command, launch.args, { cwd: directory, env: { PATH: process.env.PATH, ...sdk.run.environment }, timeout: 90000, maxBuffer: 1024 * 1024 }) }; }
    catch (error) { result = { exitCode: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" }; }
    results[name] = result;
    await fs.writeFile(path.join(directory, `${name}.stdout.txt`), result.stdout);
    await fs.writeFile(path.join(directory, `${name}.stderr.txt`), result.stderr);
  }
  await fs.writeFile(path.join(directory, "result.json"), JSON.stringify({ results, toolchain: sdk.toolchain, lock: sdk.lock, scientificValidation: "not_evaluated" }, null, 2) + "\n");
  assert.equal(results["Proofs.lean"].exitCode, 0, results["Proofs.lean"].stdout + results["Proofs.lean"].stderr);
  assert.doesNotMatch(results["Proofs.lean"].stdout, /sorryAx|declaration uses 'sorry'/);
  for (const name of ["natural_add_zero", "imaginary_square", "pauli_x_square", "pauli_xy_commutator"]) assert.ok(results["Proofs.lean"].stdout.includes(`OpenQuantumProofs.${name}`));
  assert.equal(results["False.lean"].exitCode, 1);
  assert.match(results["False.lean"].stdout, /error:/);
  // Lean deliberately permits unfinished proofs: a zero exit code alone cannot
  // be presented as a proof. The workflow must inspect warnings and axioms.
  assert.equal(results["Unfinished.lean"].exitCode, 0);
  assert.match(results["Unfinished.lean"].stdout, /sorryAx/);
  const manager = new Environments({ root, directory: path.join(directory, "settings") });
  const record = await manager.read("lean-physics");
  const before = await manager.status("lean-physics");
  assert.equal(before.installation, "present");
  assert.equal(before.ready, false, "A prepared environment still requires the host's check");
  record.check = await inspectEnvironment(manager, "lean-physics", record);
  await manager.write("lean-physics", record);
  const after = await manager.status("lean-physics");
  await fs.writeFile(path.join(directory, "settings-check.json"), JSON.stringify({ before, after, scope: "Codex environment adapter, not UI or scientific acceptance" }, null, 2) + "\n");
  assert.equal(after.ready, true);
  assert.ok(after.checks.some(detail => detail.includes("Pauli")));
  t.diagnostic(`Offline proof and rejection evidence: ${directory}`);
});
