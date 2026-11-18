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
import { offlineProcess, isolatedEnvironment } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
const enabled = process.env.OPENQUANTUM_LIVE_SLOWQUANT === "1";

async function context(t) {
  const sdk = await describeSdk(root, "slowquant-response");
  assert.equal(sdk.environmentState, "prepared", "Explicitly prepare SlowQuant first");
  const parent = process.env.OPENQUANTUM_SDK_CHECK_OUTPUT;
  if (parent) await fs.mkdir(parent, { recursive: true });
  const output = await fs.mkdtemp(path.join(parent || os.tmpdir(), "slowquant-"));
  if (!parent) t.after(() => fs.rm(output, { recursive: true, force: true }));
  await fs.mkdir(path.join(output, "home"));
  const env = { ...isolatedEnvironment(output, path), OPENQUANTUM_ROOT: root,
    NUMBA_CACHE_DIR: path.join(parent || output, "numba-cache"),
    OPENQUANTUM_SDK_SOURCE_ROOT: path.dirname(sdk.sourceProject.directory) };
  const execute = async (args, label, overrides = {}) => {
    const launch = offlineProcess(sdk.run.command, ["-B", ...args]);
    let result;
    try { result = await run(launch.command, launch.args, { cwd: output, env: { ...env, ...overrides }, timeout: 180000, maxBuffer: 8 * 1024 * 1024 }); }
    catch (error) {
      await fs.writeFile(path.join(output, label + ".stdout.log"), error.stdout || "");
      await fs.writeFile(path.join(output, label + ".stderr.log"), error.stderr || "");
      throw error;
    }
    await fs.writeFile(path.join(output, label + ".stdout.log"), result.stdout);
    await fs.writeFile(path.join(output, label + ".stderr.log"), result.stderr);
    return result;
  };
  return { sdk, output, execute };
}

test("SlowQuant H2 singlet energies and allowed/forbidden strengths match independent FCI", { skip: !enabled, timeout: 240000 }, async t => {
  const { sdk, output, execute } = await context(t);
  await execute([path.join(sdk.project, "references/native-example.py")], "example");
  await execute([path.join(root, "tests/fixtures/slowquant-fci-reference.py"), "0.74"], "reference");
  const result = JSON.parse(await fs.readFile(path.join(output, "result.json")));
  const reference = JSON.parse(await fs.readFile(path.join(output, "reference.json")));
  assert.ok(Math.abs(result.totalEnergyHartree - reference.totalEnergyHartree) < 1e-8);
  assert.equal(result.excitationEnergiesHartree.length, reference.excitationEnergiesHartree.length);
  result.excitationEnergiesHartree.forEach((value, i) => assert.ok(Math.abs(value - reference.excitationEnergiesHartree[i]) < 1e-7));
  result.oscillatorStrengths.forEach((value, i) => assert.ok(Math.abs(value - reference.oscillatorStrengths[i]) < 1e-7));
  assert.ok(reference.oscillatorStrengths.some(value => value > 0.1));
  assert.ok(reference.oscillatorStrengths.some(value => Math.abs(value) < 1e-12));
  assert.ok(result.diagnostics.maxResponseResidual < 1e-8);
  assert.ok(result.diagnostics.maxImaginaryEigenvalue < 1e-10);
  assert.ok(result.diagnostics.responseNorms.every(value => value > 0));
  assert.equal(result.scientificValidation, "not_evaluated");
  t.diagnostic(`Independent FCI and response evidence: ${output}`);
});

test("the saved SDK program accepts a different geometry and projected response", { skip: !enabled, timeout: 240000 }, async t => {
  const { sdk, output, execute } = await context(t);
  await execute([path.join(sdk.project, "references/native-example.py"), "--atom", "H 0 0 0; H 0 0 1.1", "--method", "projected"], "custom");
  await execute([path.join(root, "tests/fixtures/slowquant-fci-reference.py"), "1.1"], "reference");
  const result = JSON.parse(await fs.readFile(path.join(output, "result.json")));
  const reference = JSON.parse(await fs.readFile(path.join(output, "reference.json")));
  assert.equal(result.inputs.method, "projected");
  assert.ok(Math.abs(result.totalEnergyHartree - reference.totalEnergyHartree) < 1e-8);
  result.excitationEnergiesHartree.forEach((value, i) => assert.ok(Math.abs(value - reference.excitationEnergiesHartree[i]) < 1e-7));
  result.oscillatorStrengths.forEach((value, i) => assert.ok(Math.abs(value - reference.oscillatorStrengths[i]) < 1e-7));
  t.diagnostic(`Custom geometry/response evidence: ${output}`);
});

test("a copied SDK program uses the explicit plugin root and repository-relative source directory", { skip: !enabled, timeout: 240000 }, async t => {
  const { sdk, output, execute } = await context(t);
  // This live fixture already requires macOS; /tmp exercises a shallow copy path.
  const temporary = await fs.mkdtemp("/tmp/oq-slowquant-");
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const program = path.join(temporary, "program.py");
  await fs.copyFile(path.join(sdk.project, "references/native-example.py"), program);
  await execute([program], "copied", {
    OPENQUANTUM_SDK_SOURCE_ROOT: path.relative(root, path.dirname(sdk.sourceProject.directory)),
  });
  const result = JSON.parse(await fs.readFile(path.join(output, "result.json")));
  assert.equal(result.upstreamRevision, sdk.sourceProject.revision);
  assert.ok(Math.abs(result.totalEnergyHartree - (-1.137283834488502)) < 1e-8);
  t.diagnostic(`Relocated SDK program evidence: ${output}`);
});

test("invalid active spaces and an unoptimized reference fail without a success artifact", { skip: !enabled, timeout: 240000 }, async t => {
  const { sdk, output, execute } = await context(t);
  const program = path.join(sdk.project, "references/native-example.py");
  await assert.rejects(execute([program, "--active-orbitals", "0"], "invalid"));
  await assert.rejects(fs.access(path.join(output, "result.json")), { code: "ENOENT" });
  await assert.rejects(execute([program, "--maxiter", "0"], "unconverged"), /Large Gradient|converg|[Gg]radient/);
  await assert.rejects(fs.access(path.join(output, "result.json")), { code: "ENOENT" });
  t.diagnostic(`Preserved failure diagnostics: ${output}`);
});

test("the Codex environment adapter checks the prepared source SDK before reporting readiness", { skip: !enabled, timeout: 240000 }, async t => {
  const { output } = await context(t);
  const manager = new Environments({ root, directory: path.join(output, "settings") });
  const record = await manager.read("slowquant-response");
  const before = await manager.status("slowquant-response");
  assert.equal(before.installation, "present");
  assert.equal(before.ready, false);
  record.check = await inspectEnvironment(manager, "slowquant-response", record);
  await manager.write("slowquant-response", record);
  const after = await manager.status("slowquant-response");
  await fs.writeFile(path.join(output, "settings-check.json"), JSON.stringify({ before, after }, null, 2) + "\n");
  assert.equal(after.ready, true);
  assert.equal((await describeSdk(root, "slowquant-response")).environmentState, "prepared", "A module check must not dirty the attested source with JIT cache");
  t.diagnostic(`Codex adapter evidence, not UI acceptance: ${output}`);
});

test("Qiskit local sampler retains analytic occupations across mitigation and postselection flags", { skip: !enabled, timeout: 240000 }, async t => {
  const { output, execute } = await context(t);
  await execute([path.join(root, "tests/fixtures/slowquant-qiskit-reference.py")], "qiskit");
  const result = JSON.parse(await fs.readFile(path.join(output, "qiskit.json")));
  assert.equal(result.cases.length, 5);
  assert.equal(result.molecularQlrVerified, false);
  assert.equal(result.hardwareVerified, false);
  t.diagnostic(`Qiskit bridge regression evidence: ${output}`);
});
