import { cases, checkSuite, evaluateCase } from "../evals/run-evals.mjs";
import { validateExperiment, experimentDigest } from "../validators/validate-result.mjs";
import { preparePythonFixture } from "../../../../tests/helpers/prepared-python.mjs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { readDeclaredMcpToolContract } from "../../../../scripts/lib/capability-tool-contract.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const serverPath = path.join(skillRoot, "mcp", "server.mjs");
const declaredToolContract = readDeclaredMcpToolContract({
  projectRoot,
  capabilityId: "qec-memory-experiment",
  serverName: "qec_local",
});
let client;
let transport;
let temporary;

const zeroNoise = {
  basis: "z",
  distance: 3,
  rounds: 3,
  shots: 1000,
  physicalErrorRate: 0,
  seed: 1234,
};

before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), "openquantum-qec-test-"));
  const uvPath = path.join(temporary, "uv");
  await writeFile(
    uvPath,
    `#!/usr/bin/env node
const {readFileSync}=await import("node:fs");
const {isDeepStrictEqual}=await import("node:util");
const chunks=[];
for await (const chunk of process.stdin) chunks.push(chunk);
const input=JSON.parse(Buffer.concat(chunks).toString("utf8"));
const replay=process.argv.some(arg=>arg.endsWith("/replay.py"));
const request=replay?input:input.request;
if (!replay && input.action!=="experiment") throw new Error("Unexpected bridge action");
const fixture=JSON.parse(readFileSync(${JSON.stringify(path.join(skillRoot, "evals/fixtures"))}+(request.physicalErrorRate===0?"/zero-noise.json":"/noisy.json"),"utf8"));
if (!isDeepStrictEqual(request,fixture.request)) throw new Error("Unexpected fixture input");
process.stdout.write(JSON.stringify(replay?fixture.reference:fixture.facts));
`,
  );
  await chmod(uvPath, 0o755);
  const prepared = await preparePythonFixture({ root: projectRoot, sandbox: temporary, id: "qec-memory-experiment", executable: uvPath });
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: projectRoot,
    env: {
      ...process.env,
      ...prepared,
      PATH: `${temporary}${path.delimiter}${process.env.PATH ?? ""}`,
    },
  });
  client = new Client(
    { name: "openquantum-qec-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
});

after(async () => {
  await client?.close();
  await rm(temporary, { recursive: true, force: true });
});

test("QEC MCP exposes only its bounded experiment action", async () => {
  const tools = (await client.listTools()).tools;
  assert.deepEqual(
    tools.map((tool) => tool.name),
    declaredToolContract.map((tool) => tool.name),
  );
  assert.ok(declaredToolContract.every((tool) => tool.effect === "workspace-write"));
  assert.ok(
    declaredToolContract.every(
      (tool) => tool.effectEvidence === "mcp-annotations",
    ),
  );
  assert.ok(tools.every((tool) => tool.annotations.readOnlyHint === false));
  assert.ok(tools.every((tool) => tool.annotations.openWorldHint === false));
  assert.ok(tools.every((tool) => !tool.annotations.destructiveHint));
});

test("retired runtime inspection is absent and fails closed", async () => {
  const tools = (await client.listTools()).tools;
  assert.equal(tools.some((tool) => tool.name === "inspect_qec_runtime"), false);
  const result = await client.callTool({ name: "inspect_qec_runtime", arguments: {} });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Unknown tool/);
});

test("zero-noise experiment satisfies the logical-error invariant", async () => {
  const result = await client.callTool({
    name: "run_qec_memory_experiment",
    arguments: zeroNoise,
  });
  assert.equal(result.isError, undefined);
  assert.deepEqual(result.structuredContent.packages, { stim: "1.16.0", pymatching: "2.4.0" });
  assert.equal(result.structuredContent.facts.result.logicalErrors, 0);
  assert.equal(result.structuredContent.facts.result.logicalErrorRate, 0);
  assert.ok(result.structuredContent.facts.result.wilson95.high > 0);
  assert.equal(
    result.structuredContent.validation.observations.find(
      (item) => item.id === "zero-noise.invariant",
    ).status,
    "pass",
  );
  assert.equal(
    result.structuredContent.validation.observations.find(
      (item) => item.id === "provenance.complete",
    ).status,
    "not_checked",
  );
  assert.equal(result.structuredContent.scientificValidation, "observations_available");
});

test("noisy finite-shot experiment reports counts and uncertainty without a threshold claim", async () => {
  const request = { ...zeroNoise, basis: "x", physicalErrorRate: 0.01 };
  const first = await client.callTool({ name: "run_qec_memory_experiment", arguments: request });
  const replay = await client.callTool({ name: "run_qec_memory_experiment", arguments: request });
  assert.equal(first.isError, undefined);
  assert.equal(first.structuredContent.facts.result.logicalErrors, 74);
  assert.equal(first.structuredContent.facts.result.successfulShots, 926);
  assert.equal(
    first.structuredContent.facts.experimentDigest,
    replay.structuredContent.facts.experimentDigest,
  );
  assert.equal(
    first.structuredContent.validation.observations.find(
      (item) => item.id === "zero-noise.invariant",
    ).status,
    "not_checked",
  );
  assert.match(first.structuredContent.limitations.join(" "), /threshold/);
});

test("invalid code distances and resource requests fail before Python", async () => {
  for (const argumentsValue of [
    { ...zeroNoise, distance: 4 },
    { ...zeroNoise, distance: 1 },
    { ...zeroNoise, shots: 0 },
    { ...zeroNoise, physicalErrorRate: 1.2 },
    { ...zeroNoise, basis: "y" },
  ]) {
    const result = await client.callTool({
      name: "run_qec_memory_experiment",
      arguments: argumentsValue,
    });
    assert.equal(result.isError, true);
  }
});

test("bridge environment is allowlisted and has no cloud credentials", async () => {
  const source = await readFile(serverPath, "utf8");
  assert.doesNotMatch(source, /env:\s*process\.env/);
  assert.match(source, /BRIDGE_ENVIRONMENT_NAMES/);
  assert.match(source, /UV_PROJECT_ENVIRONMENT/);
  assert.doesNotMatch(source, /QISKIT_IBM_TOKEN|AWS_SECRET|IONQ_API_KEY/);
});


test("L3 manifest binds Acceptance and preserves execution observations and binds the fixed evals", checkSuite);
for (const item of cases) test(`independent QEC observations: ${item.id}`, () => evaluateCase(item));

test("invalid requests and malformed scientific artifacts cannot report valid observations", async () => {
  const input = JSON.parse(await readFile(path.join(skillRoot, "evals/fixtures/noisy.json"), "utf8"));
  for (const changes of [{ distance: 1 }, { distance: 4 }, { rounds: 0 }, { shots: 0 },
    { shots: 1.5 }, { shots: Number.MAX_SAFE_INTEGER + 1 }, { physicalErrorRate: -1 },
    { physicalErrorRate: NaN }, { physicalErrorRate: Infinity }, { physicalErrorRate: 1.1 },
    { seed: -1 }, { seed: 2 ** 32 }, { basis: "y" }, { unexpected: true }]) {
    const validation = validateExperiment({ ...input, request: { ...input.request, ...changes } });
    assert.equal(validation.observations.find(item => item.id === "request.scope").status, "fail", JSON.stringify(changes));
  }
  for (const facts of [null, {}, { ...input.facts, scientificAcceptance: "passed" }]) {
    assert.equal(validateExperiment({ ...input, facts }).observations.find(item => item.id === "artifact.schema").status, "fail");
  }
});

test("missing or incompatible reference execution is explicitly not checked", async () => {
  const input = JSON.parse(await readFile(path.join(skillRoot, "evals/fixtures/noisy.json"), "utf8"));
  const unavailable = validateExperiment({ ...input, reference: undefined });
  for (const id of ["circuit.replayed", "detectorModel.replayed", "seed.replayed"]) {
    assert.equal(unavailable.observations.find(item => item.id === id).status, "not_checked");
  }
  input.reference.sampling.runtime.machine = "different-machine";
  assert.equal(validateExperiment(input).observations.find(item => item.id === "seed.replayed").status, "not_checked");
});

test("request digest binds every parameter and canonicalizes signed zero", () => {
  const request = { ...zeroNoise, physicalErrorRate: 0.000001 };
  for (const changes of [{ basis: "x" }, { distance: 5 }, { rounds: 4 }, { shots: 1001 }, { seed: 1235 }, { physicalErrorRate: 0.000002 }]) {
    assert.notEqual(experimentDigest(request), experimentDigest({ ...request, ...changes }));
  }
  assert.equal(experimentDigest(zeroNoise), experimentDigest({ ...zeroNoise, physicalErrorRate: -0 }));
});

test("standalone Validator reports unavailable replay without claiming checked science or installing dependencies", async () => {
  const { facts } = JSON.parse(await readFile(path.join(skillRoot, "evals/fixtures/noisy.json"), "utf8"));
  const filename = path.join(temporary, "result.json");
  await writeFile(filename, JSON.stringify(facts));
  const result = spawnSync(process.execPath, [path.join(skillRoot, "validators/validate-result.mjs"), filename, "--replay"], {
    encoding: "utf8", env: { ...process.env, OPENQUANTUM_PYTHON_ENV_ROOT: path.join(temporary, "missing-environment") },
  });
  assert.equal(result.status, 2, result.stderr);
  const validation = JSON.parse(result.stdout);
  for (const id of ["circuit.replayed", "detectorModel.replayed", "seed.replayed", "replay.available"]) {
    assert.equal(validation.observations.find(item => item.id === id).status, "not_checked");
  }
  assert.match(validation.observations.find(item => item.id === "replay.available").detail, /Prepared environment missing/);
  assert.equal(Object.hasOwn(validation, "status"), false);
});
