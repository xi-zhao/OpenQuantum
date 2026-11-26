import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import LocalSandbox from "@deepseek-ai/dsh-sandbox-local";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { confinedMcpLaunch } from "../../../../runtime/openquantum/agent-presets/openquantum/execution-boundary.mjs";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { referenceSimulation, validateSimulation } from "../validators/validate-result.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const root = path.resolve(skillRoot, "../../..");
const enabled = process.env.OPENQUANTUM_REAL_HAMILTONIAN === "1";
const live = { skip: !enabled && "Requires explicitly prepared local Qiskit/NumPy/SciPy", timeout: 120000 };
const fixed = name => JSON.parse(readFileSync(path.join(skillRoot, `evals/fixtures/${name}.json`)));
let client, fork, launch;
before(async () => {
  if (!enabled) return;
  const ctx = new Context();
  fork = await ctx.plugin(LocalSandbox, {});
  launch = await confinedMcpLaunch(ctx.sandbox, { command: process.execPath, args: [path.join(skillRoot, "mcp/server.mjs")] });
  client = new Client({ name: "hamiltonian-l2-full-sandbox", version: "1" });
  await client.connect(new StdioClientTransport({ command: launch.command, args: launch.args, cwd: root, env: { ...process.env, ...launch.env } }));
});
after(async () => { await client?.close(); await launch?.dispose(); await fork?.dispose(); });
async function compute(request) {
  const response = await client.callTool({ name: "simulate_hamiltonian", arguments: request }, undefined, { timeout: 120000 });
  assert.equal(response.isError, undefined, JSON.stringify(response));
  assert.equal(response.structuredContent.scientificValidation, "observations_available");
  assert.deepEqual(response.structuredContent.validation.observations.filter(o => o.status === "fail"), []);
  return response.structuredContent;
}
const failed = v => v.observations.filter(o => o.status === "fail").map(o => o.id);
const near = (a, b) => assert.ok(Math.abs(a-b) < 1e-10 + 1e-8*Math.abs(b), `${a} != ${b}`);

test("full-sandbox Hamiltonian Tool and independent process agree on all available observations", live, async () => {
  const { request } = fixed("trotter-2");
  const output = await compute(request);
  const reference = await referenceSimulation(request);
  assert.deepEqual(failed(validateSimulation({ request, result: output.result, reference })), []);
  assert.equal(output.validation.observations.find(o => o.id === "trotter.convergence").status, "pass");
  assert.equal(output.validation.observations.find(o => o.id === "provenance.complete").status, "not_checked");
});
for (const order of [1,2,4]) test(`fresh order ${order} Tool refinements agree with the request-only spectral reference`, live, async () => {
  const request = { ...fixed("trotter-2").request, time: 0.9, steps: 2, order };
  const reference = await referenceSimulation(request);
  const errors = [];
  for (const point of reference.refinements) {
    const value = await compute({ ...request, steps: point.steps });
    near(value.result.unitarySpectralError, point.spectralError);
    assert.ok(value.result.unitarySpectralError <= point.bound + 1e-10);
    errors.push(value.result.unitarySpectralError);
  }
  assert.ok(errors[0] / errors[1] > 0.8 * 2 ** order);
  assert.ok(errors[1] / errors[2] > 0.8 * 2 ** order);
});
test("same-seed qDrift replay is deterministic; a coherently substituted seed is detected", live, async () => {
  const { request } = fixed("qdrift");
  const first = await compute(request), repeated = await compute(request);
  assert.deepEqual(first.result, repeated.result);
  const alternative = await compute({ ...request, seed: request.seed + 1 });
  alternative.result.seed = request.seed;
  const observations = validateSimulation({ request, result: alternative.result, reference: await referenceSimulation(request) });
  assert.ok(failed(observations).includes("seed.replayed"));
  assert.ok(failed(observations).includes("circuit.replayed"));
});
test("a coherent wrong-time circuit and self-reported fidelity cannot conceal substitution", live, async () => {
  const { request } = fixed("trotter-2");
  const alternative = await compute({ ...request, time: request.time + 0.3 });
  const failures = failed(validateSimulation({ request, result: alternative.result, reference: await referenceSimulation(request) }));
  for (const id of ["circuit.replayed", "state.replayed", "fidelity.replayed", "unitary-error.replayed"]) assert.ok(failures.includes(id), id);
});
test("complex initial states, duplicate cancellation and global identity phases agree", live, async () => {
  const request = { numQubits: 1, terms: [{pauli:"Y",coefficient:1}, {pauli:"Y",coefficient:-1}, {pauli:"I",coefficient:2}], time:-0.3, steps:1, initialState:[[Math.SQRT1_2,0],[0,Math.SQRT1_2]] };
  const result = (await compute(request)).result;
  near(result.stateFidelity,1); near(result.stateNorm,1); near(result.unitarySpectralError,0);
  assert.equal(result.pauliRotations,0);
});
test("independent Python rejects illegal Pauli, non-Hermitian coefficients and unnormalized states", live, async () => {
  const request = fixed("trotter-2").request;
  const {command} = await preparedPythonLaunch({skillRoot});
  for(const patch of [{terms:[{pauli:"XA",coefficient:1}]},{terms:[{pauli:"XI",coefficient:[1,0.1]}]},{initialState:[[2,0],[0,0],[0,0],[0,0]]},{order:3}]) {
    const run = spawnSync(command,["-B",path.join(skillRoot,"validators/reference.py")],{input:JSON.stringify({...request,...patch}),encoding:"utf8"});
    assert.equal(run.status,1,run.stdout);
    assert.match(run.stderr,/ValueError/);
  }
});
test("Python without site packages reports not_checked and exit 2 instead of installing", live, async () => {
  const {command} = await preparedPythonLaunch({skillRoot});
  const run = spawnSync(command,["-I","-S",path.join(skillRoot,"validators/reference.py")],{input:"{}",encoding:"utf8"});
  assert.equal(run.status,2,run.stderr);
  assert.equal(JSON.parse(run.stdout).status,"not_checked");
});
