import assert from "node:assert/strict";
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
const {createHash}=await import("node:crypto");
const chunks=[];
for await (const chunk of process.stdin) chunks.push(chunk);
const envelope=JSON.parse(Buffer.concat(chunks).toString("utf8"));
const canonical=(value)=>Array.isArray(value)?"["+value.map(canonical).join(",")+"]":value&&typeof value==="object"?"{"+Object.keys(value).sort().map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}":JSON.stringify(value);
if(envelope.action==="runtime") {
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packages:{stim:"1.16.0",pymatching:"2.4.0"},pythonVersion:"3.12.0",profiles:["rotated_memory_x","rotated_memory_z"],limits:{maxDistance:7,maxRounds:20,maxShots:50000,maxPhysicalErrorRate:0.05},cloudExecutionEnabled:false}));
} else {
  const request=envelope.request;
  const errors=request.physicalErrorRate===0?0:7;
  const rate=errors/request.shots;
  const z=1.959963984540054;
  const denominator=1+z*z/request.shots;
  const center=(rate+z*z/(2*request.shots))/denominator;
  const half=z*Math.sqrt(rate*(1-rate)/request.shots+z*z/(4*request.shots*request.shots))/denominator;
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packages:{stim:"1.16.0",pymatching:"2.4.0"},experiment:request,experimentDigest:createHash("sha256").update(canonical(request)).digest("hex"),codeTask:"surface_code:rotated_memory_"+request.basis,circuit:{qubits:26,detectors:24,observables:1,sha256:"a".repeat(64)},detectorModel:{detectors:24,observables:1,sha256:"b".repeat(64)},result:{shots:request.shots,logicalErrors:errors,successfulShots:request.shots-errors,logicalErrorRate:rate,standardError:Math.sqrt(rate*(1-rate)/request.shots),wilson95:{low:Math.max(0,center-half),high:Math.min(1,center+half)}},runtimeSeconds:0.01}));
}
`,
  );
  await chmod(uvPath, 0o755);
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: projectRoot,
    env: {
      ...process.env,
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

test("QEC MCP exposes two bounded local read-only tools", async () => {
  const tools = (await client.listTools()).tools;
  assert.deepEqual(
    tools.map((tool) => tool.name),
    declaredToolContract.map((tool) => tool.name),
  );
  assert.ok(declaredToolContract.every((tool) => tool.effect === "read-only"));
  assert.ok(
    declaredToolContract.every(
      (tool) => tool.effectEvidence === "mcp-annotations",
    ),
  );
  assert.ok(tools.every((tool) => tool.annotations.readOnlyHint));
  assert.ok(tools.every((tool) => !tool.annotations.destructiveHint));
});

test("runtime inspection reports pinned Stim and PyMatching", async () => {
  const result = await client.callTool({ name: "inspect_qec_runtime", arguments: {} });
  assert.equal(result.isError, undefined);
  assert.deepEqual(result.structuredContent.packages, {
    stim: "1.16.0",
    pymatching: "2.4.0",
  });
  assert.equal(result.structuredContent.cloudExecutionEnabled, false);
});

test("zero-noise experiment satisfies the logical-error invariant", async () => {
  const result = await client.callTool({
    name: "run_qec_memory_experiment",
    arguments: zeroNoise,
  });
  assert.equal(result.isError, undefined);
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
  assert.equal(first.structuredContent.facts.result.logicalErrors, 7);
  assert.equal(first.structuredContent.facts.result.successfulShots, 993);
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
    { ...zeroNoise, distance: 9 },
    { ...zeroNoise, shots: 99 },
    { ...zeroNoise, physicalErrorRate: 0.2 },
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
