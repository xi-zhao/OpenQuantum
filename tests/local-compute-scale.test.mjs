import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { localComputeEnvironment, localComputeProcessOptions } from "../src/lib/local-compute-policy.mjs";
import { runLocalJsonProcess } from "../src/lib/local-json-process.mjs";
import { compileBinaryLinearModel } from "../.agents/skills/qpanda-qubo/modeling/binary-linear-model.mjs";
import { toolDefinitions } from "../runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs";

test("local compute defaults have no worker deadline or output cap and honor user configuration", async t => {
  const keys = ["OPENQUANTUM_COMPUTE_TIMEOUT_MS", "OPENQUANTUM_COMPUTE_MAX_OUTPUT_BYTES", "OMP_NUM_THREADS", "JAX_PLATFORMS"];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  for (const key of keys) delete process.env[key];
  assert.deepEqual(localComputeProcessOptions(), { timeoutMs: 0, maxOutputBytes: 0 });
  assert.deepEqual(localComputeEnvironment({ PATH: "/usr/bin", OMP_NUM_THREADS: "1" }), { PATH: "/usr/bin" });
  process.env.OMP_NUM_THREADS = "4";
  process.env.JAX_PLATFORMS = "cpu";
  assert.deepEqual(localComputeEnvironment({}), { OMP_NUM_THREADS: "4", JAX_PLATFORMS: "cpu" });
  process.env.OPENQUANTUM_COMPUTE_TIMEOUT_MS = "300";
  process.env.OPENQUANTUM_COMPUTE_MAX_OUTPUT_BYTES = "100";
  const options = { command: process.execPath, args: ["-e", "setInterval(()=>{},1000)"], cwd: process.cwd(), env: {}, input: {}, label: "test", ...localComputeProcessOptions() };
  await assert.rejects(runLocalJsonProcess(options), /timed out/);
  await assert.rejects(runLocalJsonProcess({ ...options, timeoutMs: 0, args: ["-e", "process.stdout.write(JSON.stringify('x'.repeat(101)))"] }), /too much data/);
  const result = await runLocalJsonProcess({ ...options, timeoutMs: 0, maxOutputBytes: 0, args: ["-e", "setTimeout(()=>process.stdout.write(JSON.stringify('x'.repeat(500000))),100)"] });
  assert.equal(result.length, 500000);
  process.env.OPENQUANTUM_COMPUTE_TIMEOUT_MS = "-1";
  assert.throws(localComputeProcessOptions, /nonnegative/);
});

test("QUBO compilation is independent of enumeration and reports unknown optimality honestly", () => {
  const model = { variables: Array.from({ length: 65 }, (_, i) => `x${i}`), objective: { sense: "minimize", linear: [{ variable: "x64", coefficient: -2 }] } };
  const compiled = compileBinaryLinearModel(model);
  assert.equal(compiled.qubo.linear[64], -2);
  assert.equal(compiled.qubo.quadratic.length, 65);
  assert.equal(compiled.reference.status, "not_run");
  assert.equal(compiled.reference.compiledMinimum, null);
  assert.equal(compiled.reference.penaltySufficient, null);
  const small = { variables: model.variables.slice(0, 13), objective: { sense: "maximize", linear: [{ variable: "x12", coefficient: 2 }] } };
  const reference = compileBinaryLinearModel(small, { referenceMode: "required" }).reference;
  assert.equal(reference.assignmentCount, 8192);
  assert.equal(reference.feasibleOptimum.objectiveValue, 2);
  assert.ok(reference.compiledAssignments.every(row => row.values.x12 === 1));
  assert.equal(reference.compilationMaxError, 0);
});

test("native ground-state evaluation budgets and QMClaw sweeps are caller supplied", async () => {
  const request = JSON.parse(await readFile(new URL("../.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json", import.meta.url)));
  request.method.optimizer.maxEvaluations = 512;
  const qgs = await toolDefinitions.find(t => t.name === "solve_and_validate_ground_state").execute({ request });
  assert.equal(qgs.facts.resourceEstimate.maxEvaluations, 512);
  assert.equal(qgs.validation.observations.find(o => o.id === "resources.within-budget").status, "pass");
  const qm = await toolDefinitions.find(t => t.name === "simulate_qmclaw_experiment").execute({ experiment: "power-shift", qubits: ["Q0"], points: 257, secondaryPoints: 65, shots: 4097 });
  assert.equal(qm.series[0].values.length, 257 * 65);
});
