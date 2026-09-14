import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { definition } from "../.agents/skills/mitiq-error-mitigation/mcp/contracts.mjs";

const enabled = process.env.OPENQUANTUM_REAL_MITIQ === "1";
const evidence = path.join(process.cwd(), ".openquantum/mitiq-evidence");
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const circuit = { numQubits: 1, gates: [{ name: "H", targets: [0] }, { name: "RZ", targets: [0], angle: 0.7 }, { name: "H", targets: [0] }], observable: "Z" };

test("real Mitiq: four methods, exact noise model, full budgets, reproducibility and adverse outcomes", { skip: !enabled, timeout: 300000 }, async t => {
  const client = new Client({ name: "mitiq-live-test", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [".agents/skills/mitiq-error-mitigation/mcp/server.mjs"] }));
  await mkdir(evidence, { recursive: true });
  const run = async (input, label) => {
    const response = await client.callTool({ name: "run_mitiq_experiment", arguments: input }, undefined, { timeout: 195000 });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    const output = response.structuredContent;
    assert.ok(definition.validateOutput(output), JSON.stringify(definition.validateOutput.errors));
    const normalized = definition.normalize("run_mitiq_experiment", input);
    assert.deepEqual(output.input, normalized);
    assert.equal(output.inputSha256, createHash("sha256").update(JSON.stringify(normalized)).digest("hex"));
    assert.equal(output.dependencyLockSha256, createHash("sha256").update(await readFile(".agents/skills/mitiq-error-mitigation/uv.lock")).digest("hex"));
    assert.equal(output.scientificValidation, "not_evaluated");
    const r = output.result;
    assert.equal(r.totalShotsIncludingBaseline, 2 * normalized.replicates * normalized.shotsBudget);
    for (const trial of r.trials) {
      assert.equal(trial.baselineShots, normalized.shotsBudget);
      assert.equal(trial.mitigationShots, normalized.shotsBudget);
      assert.equal(trial.calibrationShots + trial.trainingShots + trial.evaluationShots, normalized.shotsBudget);
      assert.equal(trial.circuits.reduce((s, row) => s + row.shots, 0), 2 * normalized.shotsBudget);
    }
    for (const key of ["unmitigated", "mitigated"]) {
      const values = r.trials.map(row => row[key]);
      const mean = values.reduce((a, b) => a + b) / values.length;
      const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;
      near(r.statistics[key].mean, mean);
      near(r.statistics[key].bias, mean - r.idealExpectation);
      near(r.statistics[key].variance, variance);
      near(r.statistics[key].rmse ** 2, variance + (mean - r.idealExpectation) ** 2);
      near(r.statistics[key].meanStandardError ** 2, variance / (values.length - 1));
    }
    await writeFile(path.join(evidence, `${label}.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), ...output }, null, 2));
    return r;
  };
  for (const method of ["zne", "rem", "pec", "cdr"]) {
    const r = await run({ ...circuit, method, shotsBudget: 4096, replicates: 4, ...(method === "rem" ? { readoutProbability: 0.1 } : {}) }, method);
    near(r.idealExpectation, Math.cos(0.7));
    near(r.exactNoisyExpectation, Math.cos(0.7) * (1 - 4 * 0.02 / 3) ** 3 * (method === "rem" ? 0.8 : 1));
    if (method === "rem") assert.ok(r.trials.every(row => row.calibrationShots === 2048));
    if (method === "pec") assert.ok(r.trials.every(row => row.details.sampledSigns.length === 64 && row.circuits.length === 65));
    if (method === "cdr") assert.ok(r.trials.every(row => row.trainingShots > 0 && row.classicalReferenceEvaluations === 12));
  }
  const repeat = { ...circuit, method: "pec", pecSamples: 16, replicates: 4, shotsBudget: 1024, seed: 11 };
  assert.deepEqual(await run(repeat, "pec-repeat-a"), await run(repeat, "pec-repeat-b"));
  const adverse = await run({ ...circuit, method: "zne", depolarizingProbability: 0, replicates: 16, seed: 19, shotsBudget: 2048 }, "zne-zero-noise-adverse");
  assert.ok(adverse.statistics.mitigated.rmse > adverse.statistics.unmitigated.rmse, "Zero-noise ZNE can worsen finite-shot precision and must remain visible");
  const rem = await run({ method: "rem", numQubits: 2, gates: [{ name: "X", targets: [0] }], observable: "ZI", depolarizingProbability: 0, readoutProbability: 0.15, shotsBudget: 8192, replicates: 4 }, "rem-bit-order");
  near(rem.idealExpectation, -1);
  assert.ok(rem.statistics.mitigated.rmse < rem.statistics.unmitigated.rmse);
  const degenerate = await client.callTool({ name: "run_mitiq_experiment", arguments: { ...circuit, method: "cdr", gates: circuit.gates.slice(0, 2) } }, undefined, { timeout: 195000 });
  assert.equal(degenerate.isError, true);
  assert.match(JSON.stringify(degenerate), /degenerate/);
});

test("real Mitiq: independent channel reconstruction and numerical boundary regressions", { skip: !enabled, timeout: 120000 }, async () => {
  const child = spawn("uv", ["run", "--quiet", "--frozen", "--project", ".agents/skills/mitiq-error-mitigation", "--python", "3.12", "python", ".agents/skills/mitiq-error-mitigation/test/science_test.py"], {
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", UV_PROJECT_ENVIRONMENT: path.join(process.cwd(), ".openquantum/python-envs/mitiq-error-mitigation") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, output);
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "independent-science-tests.log"), output);
});
