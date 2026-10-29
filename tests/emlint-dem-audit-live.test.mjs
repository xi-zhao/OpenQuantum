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
const enabled = process.env.OPENQUANTUM_LIVE_EMLINT === "1";

async function runProgram(t, program, resultName = "result.json") {
  const sdk = await describeSdk(root, "emlint-dem-audit");
  assert.equal(sdk.environmentState, "prepared", "Explicitly prepare emlint first");
  const parent = process.env.OPENQUANTUM_SDK_CHECK_OUTPUT;
  if (parent) await fs.mkdir(parent, { recursive: true });
  const output = await fs.mkdtemp(path.join(parent || os.tmpdir(), "emlint-example-"));
  if (!parent) t.after(() => fs.rm(output, { recursive: true, force: true }));
  await fs.mkdir(path.join(output, "home"));
  const launch = offlineProcess(sdk.run.command, ["-B", program || path.join(sdk.project, "references/native-example.py")]);
  const completed = await run(launch.command, launch.args, { cwd: output, env: isolatedEnvironment(output, path), timeout: 60000 });
  await fs.writeFile(path.join(output, "stdout.log"), completed.stdout);
  await fs.writeFile(path.join(output, "stderr.log"), completed.stderr);
  return { result: JSON.parse(await fs.readFile(path.join(output, resultName), "utf8")), output };
}

test("emlint example retains a logical fault finding when the program completes", { skip: !enabled }, async t => {
  const { result } = await runProgram(t);
  // Directly soluble single mechanisms: D0 supplies a syndrome; L0 alone does not.
  const good = result.cases.detected.report.results[0];
  const bad = result.cases.logical_fault.report.results[0];
  assert.equal(good.passed, true);
  assert.equal(bad.passed, false);
  assert.equal(bad.severity, "error");
  assert.equal(bad.status, "verdict");
  assert.ok(bad.counter_example);
  assert.equal(result.cases.logical_fault.dem, "error(0.1) L0");
  assert.equal(result.scientificValidation, "not_evaluated");
});

test("emlint example exposes empty and inconclusive audits instead of claiming a complete pass", { skip: !enabled }, async t => {
  const { result } = await runProgram(t);
  assert.equal(result.cases.empty.report.is_vacuous, true);
  const incomplete = result.cases.missing_context;
  assert.deepEqual(incomplete.context, {});
  assert.equal(incomplete.report.profile, "graphlike-decoder");
  assert.equal(incomplete.report.results[0].status, "inconclusive");
  assert.equal(incomplete.report.all_passed, true, "Upstream all_passed alone masks inconclusive checks");
});

test("real emlint API/CLI retain partial results and the Codex adapter checks the fixed environment", { skip: !enabled, timeout: 90000 }, async t => {
  const { result, output } = await runProgram(t, path.join(root, "tests/fixtures/emlint-regression.py"), "regression.json");
  assert.equal(result.versions.emlint, "0.2.4");
  assert.equal(result.versions.stim, "1.16.0");
  assert.equal(result.scientificValidation, "not_evaluated");
  const manager = new Environments({ root, directory: path.join(output, "settings") });
  const record = await manager.read("emlint-dem-audit");
  const before = await manager.status("emlint-dem-audit");
  assert.equal(before.installation, "present");
  assert.equal(before.ready, false);
  record.check = await inspectEnvironment(manager, "emlint-dem-audit", record);
  await manager.write("emlint-dem-audit", record);
  const after = await manager.status("emlint-dem-audit");
  await fs.writeFile(path.join(output, "settings-check.json"), JSON.stringify({ before, after, scope: "Codex environment adapter; not UI or scientific acceptance" }, null, 2) + "\n");
  assert.equal(after.ready, true);
  t.diagnostic(`Offline API, CLI and host adapter evidence: ${output}`);
});
