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
  capabilityId: "tyxonq-workbench",
  serverName: "tyxonq_local",
});
let client;
let transport;
let temporary;

before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), "openquantum-tyxonq-test-"));
  const uvPath = path.join(temporary, "uv");
  await writeFile(
    uvPath,
    `#!/usr/bin/env node
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
if (envelope.action === "runtime") {
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",tyxonqVersion:"1.2.0",pythonVersion:"3.12.0",maxQubits:8,maxOperations:64,maxShots:8192,gates:["cx","cz","h","rx","ry","rz","s","sdg","x"],noiseModels:["amplitude_damping","depolarizing","pauli","phase_damping"],cloudExecutionEnabled:false}));
} else {
  const request = envelope.request;
  const exact = request.mode === "exact";
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",tyxonqVersion:"1.2.0",circuit:{numQubits:request.numQubits,operationCount:request.operations.length,sha256:"a".repeat(64)},execution:{mode:request.mode,simulator:request.noise ? "density_matrix" : "statevector",shots:request.shots,noise:request.noise},result:{counts:exact?{}:{"00":5,"11":5},probabilities:{"00":0.5,"11":0.5},statevector:exact?[{real:0.7071067811865475,imag:0},{real:0,imag:0},{real:0,imag:0},{real:0.7071067811865475,imag:0}]:[]},checks:{normalizationSum:1,normalizationError:0,countsMatchShots:exact?null:true},scientificValidation:"not_evaluated",limitations:["local","not independently validated"]}));
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
    { name: "openquantum-tyxonq-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
});

after(async () => {
  await client?.close();
  await rm(temporary, { recursive: true, force: true });
});

test("TyxonQ MCP declares bounded non-destructive lazy-environment tools", async () => {
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
  assert.ok(tools.every((tool) => tool.annotations.openWorldHint === true));
  assert.ok(tools.every((tool) => !tool.annotations.destructiveHint));
  assert.ok(tools.every((tool) => tool.annotations.openWorldHint));
  assert.equal(
    tools.some((tool) => /cloud|submit|cancel|token|python/.test(tool.name)),
    false,
  );
});

test("runtime inspection proves cloud execution stays disabled", async () => {
  const result = await client.callTool({
    name: "inspect_tyxonq_runtime",
    arguments: {},
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.tyxonqVersion, "1.2.0");
  assert.equal(result.structuredContent.cloudExecutionEnabled, false);
  assert.equal(result.structuredContent.maxQubits, 8);
});

test("exact simulation preserves structured scientific boundary", async () => {
  const result = await client.callTool({
    name: "simulate_tyxonq_circuit",
    arguments: {
      numQubits: 2,
      operations: [
        { gate: "h", qubits: [0] },
        { gate: "cx", qubits: [0, 1] },
      ],
      mode: "exact",
    },
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.execution.shots, 0);
  assert.equal(result.structuredContent.result.statevector.length, 4);
  assert.equal(result.structuredContent.scientificValidation, "not_evaluated");
  assert.match(result.content[0].text, /not_evaluated/);
});

test("sampled noise uses a bounded density-matrix request", async () => {
  const result = await client.callTool({
    name: "simulate_tyxonq_circuit",
    arguments: {
      numQubits: 2,
      operations: [
        { gate: "h", qubits: [0] },
        { gate: "cx", qubits: [0, 1] },
      ],
      mode: "sampled",
      shots: 10,
      noise: { type: "depolarizing", strength: 0.05 },
    },
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.execution.simulator, "density_matrix");
  assert.equal(result.structuredContent.execution.noise.strength, 0.05);
  assert.equal(result.structuredContent.checks.countsMatchShots, true);
});

test("invalid gates, qubits and exact noise fail before Python execution", async () => {
  for (const argumentsValue of [
    {
      numQubits: 2,
      operations: [{ gate: "cx", qubits: [0, 0] }],
      mode: "exact",
    },
    {
      numQubits: 2,
      operations: [{ gate: "h", qubits: [2] }],
      mode: "exact",
    },
    {
      numQubits: 1,
      operations: [{ gate: "h", qubits: [0] }],
      mode: "exact",
      noise: { type: "depolarizing", strength: 0.1 },
    },
  ]) {
    const result = await client.callTool({
      name: "simulate_tyxonq_circuit",
      arguments: argumentsValue,
    });
    assert.equal(result.isError, true);
  }
});

test("bridge environment is allowlisted and cloud credentials are absent", async () => {
  const source = await readFile(serverPath, "utf8");
  assert.doesNotMatch(source, /env:\s*process\.env/);
  assert.match(source, /BRIDGE_ENVIRONMENT_NAMES/);
  assert.match(source, /"--frozen"/);
  assert.match(source, /UV_PROJECT_ENVIRONMENT/);
  assert.doesNotMatch(source, /TYXONQ_API_KEY|QCOS|QUAFU|QISKIT_IBM_TOKEN/);
});
