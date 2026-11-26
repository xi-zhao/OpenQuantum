import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";
import { experimentDigest, replayExperiment, validateExperiment } from "../validators/validate-result.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.OPENQUANTUM_REAL_QEC_MEMORY === "1";
const live = { skip: !enabled && "Requires explicitly prepared local Stim/PyMatching; no model, cloud or hardware calls" };
const request = { basis: "x", distance: 3, rounds: 3, shots: 128, physicalErrorRate: 0.03, seed: 1234 };
let client;
let facts;
let reference;

async function python(args, input) {
  const environment = Object.fromEntries(["HOME", "PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"]
    .flatMap(name => process.env[name] ? [[name, process.env[name]]] : []));
  return runLocalJsonProcess({
    ...await preparedPythonLaunch({ skillRoot, args }),
    cwd: skillRoot, input, env: localComputeEnvironment(environment),
    ...localComputeProcessOptions(), label: "QEC local SDK test",
  });
}

const compute = input => python([path.join(skillRoot, "mcp/bridge.py")], { action: "experiment", request: input });
const byId = validation => Object.fromEntries(validation.observations.map(item => [item.id, item.status]));

before(async () => {
  if (!enabled) return;
  facts = await compute(request);
  reference = await replayExperiment(request);
  client = new Client({ name: "qec-local-sdk-test", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(skillRoot, "mcp/server.mjs")],
    cwd: path.resolve(skillRoot, "../../.."), env: process.env,
  }));
});
after(async () => { await client?.close(); });

test("fresh Tool and independent reference executions agree, including exact seeded shot records", live, async () => {
  const response = await client.callTool({ name: "run_qec_memory_experiment", arguments: request });
  assert.equal(response.isError, undefined);
  const output = response.structuredContent;
  assert.deepEqual(output.facts.sampling, facts.sampling);
  assert.equal(output.scientificValidation, "observations_available");
  assert.equal(Object.hasOwn(output.validation, "status"), false);
  const observations = byId(output.validation);
  for (const [id, status] of Object.entries(observations)) {
    assert.equal(status, ["provenance.complete", "zero-noise.invariant"].includes(id) ? "not_checked" : "pass", id);
  }
  const repeated = await replayExperiment(request);
  assert.deepEqual(repeated, reference);
});

for (const change of [{ distance: 5 }, { rounds: 4 }, { basis: "z" }, { physicalErrorRate: 0.04 }]) {
  test(`coherent circuit/DEM substitution cannot conceal ${JSON.stringify(change)}`, live, async () => {
    const substituted = await compute({ ...request, ...change });
    // Keep a coherent alternative simulation, then falsely label it as the original request.
    substituted.experiment = request;
    substituted.experimentDigest = experimentDigest(request);
    substituted.codeTask = facts.codeTask;
    const observations = byId(validateExperiment({ request, facts: substituted, reference }));
    assert.equal(observations["circuit.digest"], "pass");
    assert.equal(observations["detectorModel.digest"], "pass");
    assert.equal(observations["circuit.replayed"], "fail");
    assert.equal(observations["detectorModel.replayed"], "fail");
  });
}

for (const channel of ["after_clifford_depolarization", "before_round_data_depolarization",
  "before_measure_flip_probability", "after_reset_flip_probability"]) {
  test(`omitting ${channel} is detected even with recomputed artifact hashes`, live, async () => {
    const alternative = await python(["-c", `
import hashlib, json, sys, stim
r = json.load(sys.stdin)
noise = dict.fromkeys(["after_clifford_depolarization", "before_round_data_depolarization", "before_measure_flip_probability", "after_reset_flip_probability"], r["physicalErrorRate"])
noise[r["omit"]] = 0
c = stim.Circuit.generated("surface_code:rotated_memory_" + r["basis"], distance=r["distance"], rounds=r["rounds"], **noise)
d = c.detector_error_model(decompose_errors=True)
def artifact(value):
    text = str(value)
    return {"text": text, "sha256": hashlib.sha256(text.encode()).hexdigest(), "detectors": value.num_detectors, "observables": value.num_observables}
print(json.dumps({"circuit": {**artifact(c), "qubits": c.num_qubits}, "detectorModel": artifact(d)}))
`], { ...request, omit: channel });
    const observations = byId(validateExperiment({ request, facts: { ...facts, ...alternative }, reference }));
    assert.equal(observations["circuit.digest"], "pass");
    assert.equal(observations["detectorModel.digest"], "pass");
    assert.equal(observations["circuit.replayed"], "fail");
    assert.equal(observations["detectorModel.replayed"], "fail");
  });
}

test("independent seed replay detects relabelled sampling", live, async () => {
  const substituted = await compute({ ...request, seed: 1235 });
  substituted.experiment = request;
  substituted.experimentDigest = experimentDigest(request);
  const observations = byId(validateExperiment({ request, facts: substituted, reference }));
  assert.equal(observations["experiment.digest"], "pass");
  assert.equal(observations["circuit.replayed"], "pass");
  assert.equal(observations["seed.replayed"], "fail");
});

test("single-shot zero-noise and exponent-form probabilities preserve the declared statistics and digest", live, async () => {
  for (const [basis, physicalErrorRate, shots] of [["x", 0, 1], ["z", 0, 2], ["z", 1e-6, 8]]) {
    const input = { ...request, basis, physicalErrorRate, shots };
    const actual = await compute(input);
    const replay = await replayExperiment(input);
    const validation = validateExperiment({ request: input, facts: actual, reference: replay });
    assert.deepEqual(validation.observations.filter(item => item.status === "fail"), []);
    assert.equal(actual.experimentDigest, experimentDigest(input));
    assert.equal(actual.result.logicalErrors, 0);
    assert.ok(actual.result.wilson95.high > 0);
  }
});

test("both real Python boundaries reject illegal requests", live, async () => {
  for (const input of [{ ...request, shots: 0 }, { ...request, distance: 4 }, { ...request, physicalErrorRate: -1 }]) {
    await assert.rejects(compute(input), /positive|odd|between/);
    await assert.rejects(python([path.join(skillRoot, "validators/replay.py")], input), /Invalid|odd/);
  }
});
