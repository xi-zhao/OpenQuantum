import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { before, after } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { replayDecoding, validateDecoding } from "../validators/validate-result.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.OPENQUANTUM_REAL_L2 === "1";
const live = { skip: !enabled && "Requires the explicitly prepared pinned local LDPC SDK" };
const fixed = name => JSON.parse(readFileSync(path.join(root, "evals/fixtures", `${name}.json`)));
const failures = v => v.observations.filter(o => o.status === "fail").map(o => o.id);
let client;
before(async () => {
  if (!enabled) return;
  client = new Client({ name: "ldpc-independent-live", version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, "mcp/server.mjs")], env: process.env }));
});
after(async () => { await client?.close(); });
async function run(request) {
  const response = await client.callTool({ name: "decode_ldpc_syndromes", arguments: request });
  assert.equal(response.isError, undefined, JSON.stringify(response));
  const value = response.structuredContent;
  assert.equal(value.scientificValidation, "observations_available");
  assert.deepEqual(failures(value.validation), []);
  assert.equal(value.validation.observations.find(o => o.id === "provenance.complete").status, "not_checked");
  assert.equal(value.validation.observations.find(o => o.id === "decoder.replayed").status, "pass");
  assert.equal(Object.hasOwn(value.validation, "status"), false);
  return value;
}
for (const name of ["parity", "logical"]) test(`live BP+LSD independent replay and aggregate statistics: ${name}`, live, async () => {
  const { request } = fixed(name), value = await run(request);
  const reference = await replayDecoding(request);
  assert.deepEqual(reference, await replayDecoding(request));
  assert.deepEqual(value.validation, validateDecoding({ request, result: value.result, reference }));
  assert.equal(value.result.statistics.logicalFlipRate, name === "parity" ? null : 2 / 3);
});
test("LSD fallback can satisfy parity when BP did not converge, and zero syndrome has no stale iteration flag", live, async () => {
  const value = await run({ ...fixed("parity").request, bpIterations: 1 });
  assert.ok(value.result.syndromeSatisfied.every(Boolean));
  assert.ok(value.result.bpConverged.includes(false));
  assert.equal(value.result.bpConverged.at(-1), true);
  assert.equal(value.result.bpIterationsUsed.at(-1), 0);
});
test("a different parity-equivalent estimate cannot impersonate deterministic BP+LSD", live, async () => {
  const { request } = fixed("parity"), value = await run(request);
  const changed = structuredClone(value.result);
  changed.corrections[0] = changed.corrections[0].map(b => 1 - b);
  changed.correctionWeights[0] = 3 - changed.correctionWeights[0];
  const checks = validateDecoding({ request, result: changed, reference: await replayDecoding(request) });
  assert.equal(checks.observations.find(o => o.id === "syndrome.replayed").status, "pass");
  assert.ok(failures(checks).includes("decoder.replayed"));
});
test("independent Python rejects malformed GF(2) inputs before calling the native decoder", live, async () => {
  const { command } = await preparedPythonLaunch({ skillRoot: root });
  for (const patch of [{ parityCheck: [[1,2,0],[0,1,1]] }, { syndromes: [[true,0]] }, { parityCheck: [[1],[1,0]] }, { parityCheck: [[1,0,0],[1,0,0]] }]) {
    const run = spawnSync(command, ["-B", path.join(root, "validators/reference.py")], { encoding: "utf8", input: JSON.stringify({ ...fixed("parity").request, ...patch }) });
    assert.equal(run.status, 1, run.stdout);
  }
});
test("missing Python packages report not_checked without installation", live, async () => {
  const { command } = await preparedPythonLaunch({ skillRoot: root });
  const run = spawnSync(command, ["-I", "-S", path.join(root, "validators/reference.py")], { encoding: "utf8", input: JSON.stringify(fixed("parity").request) });
  assert.equal(run.status, 2, run.stderr);
  assert.equal(JSON.parse(run.stdout).status, "not_checked");
});
