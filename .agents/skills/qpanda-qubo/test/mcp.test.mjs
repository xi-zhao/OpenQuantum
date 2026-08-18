import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const serverPath = path.join(skillRoot, "mcp", "server.mjs");
let client;
let transport;
let temporary;

before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), "openquantum-qpanda-qubo-test-"));
  const uvPath = path.join(temporary, "uv");
  // Fake `uv` that returns canned bridge output so the JS boundary can be tested
  // without a native pyqpanda3 build. The real live path is exercised on the
  // user's cp311-313 environment.
  await writeFile(
    uvPath,
    `#!/usr/bin/env node
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
if (envelope.action === "runtime") {
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packageVersion:"2.0.0",pythonVersion:"3.12.0",maxVars:5,maxLayer:6,methods:["traversal","qaoa"],cloudExecutionEnabled:false}));
} else {
  const request = envelope.request;
  const qaoa = request.method === "qaoa";
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packageVersion:"2.0.0",problem:{size:request.quadratic.length,keyQubits:request.quadratic.length,resultQubits:4,sha256:"b".repeat(64)},classical:{method:"qubobytraversal",optimalAssignments:[[0,1,0]],minimumValue:-1},quantum:qaoa?{layer:request.layer,optimizer:"SLSQP",distribution:{"010":0.9,"110":0.1},topBitstring:"010"}:null,checks:{objectiveConsistencyError:0},scientificValidation:"not_evaluated",limitations:["local","not independently validated"]}));
}
`,
  );
  await chmod(uvPath, 0o755);
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: path.resolve(skillRoot, "../../.."),
    env: {
      ...process.env,
      PATH: `${temporary}${path.delimiter}${process.env.PATH ?? ""}`,
    },
  });
  client = new Client(
    { name: "openquantum-qpanda-qubo-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
});

after(async () => {
  await client?.close();
  await rm(temporary, { recursive: true, force: true });
});

test("QPanda QUBO MCP exposes only bounded local read-only tools", async () => {
  const tools = (await client.listTools()).tools;
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ["inspect_qpanda_qubo_runtime", "solve_qpanda_qubo"],
  );
  assert.ok(tools.every((tool) => tool.annotations.readOnlyHint));
  assert.ok(tools.every((tool) => !tool.annotations.destructiveHint));
  assert.equal(
    tools.some((tool) => /cloud|submit|cancel|token|device/.test(tool.name)),
    false,
  );
});

test("runtime inspection proves cloud execution stays disabled", async () => {
  const result = await client.callTool({
    name: "inspect_qpanda_qubo_runtime",
    arguments: {},
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.packageVersion, "2.0.0");
  assert.equal(result.structuredContent.cloudExecutionEnabled, false);
  assert.equal(result.structuredContent.maxVars, 5);
});

test("traversal solve returns a deterministic classical reference", async () => {
  const result = await client.callTool({
    name: "solve_qpanda_qubo",
    arguments: {
      quadratic: [
        [0, -1.2, 0],
        [0, 0, 0.9],
        [0, 0, 0],
      ],
      linear: [1.3, -1, -0.5],
      method: "traversal",
    },
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.quantum, null);
  assert.equal(result.structuredContent.classical.minimumValue, -1);
  assert.deepEqual(result.structuredContent.classical.optimalAssignments, [[0, 1, 0]]);
  assert.equal(result.structuredContent.scientificValidation, "not_evaluated");
  assert.match(result.content[0].text, /not_evaluated/);
});

test("qaoa solve adds a bounded local variational distribution", async () => {
  const result = await client.callTool({
    name: "solve_qpanda_qubo",
    arguments: {
      quadratic: [
        [0, -1.2],
        [0, 0],
      ],
      method: "qaoa",
      layer: 3,
    },
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.quantum.layer, 3);
  assert.equal(result.structuredContent.quantum.topBitstring, "010");
  assert.equal(result.structuredContent.checks.objectiveConsistencyError, 0);
});

test("invalid problems fail before Python execution", async () => {
  for (const argumentsValue of [
    // non-square matrix
    { quadratic: [[0, 1]], method: "traversal" },
    // too many variables
    {
      quadratic: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
      method: "traversal",
    },
    // qaoa without a layer
    { quadratic: [[0]], method: "qaoa" },
    // layer supplied for traversal
    { quadratic: [[0]], method: "traversal", layer: 2 },
    // layer out of range
    { quadratic: [[0]], method: "qaoa", layer: 99 },
    // linear length mismatch
    { quadratic: [[0, 1], [0, 0]], linear: [1], method: "traversal" },
  ]) {
    const result = await client.callTool({
      name: "solve_qpanda_qubo",
      arguments: argumentsValue,
    });
    assert.equal(result.isError, true);
  }
});

test("bridge environment is allowlisted and cloud credentials are absent", async () => {
  const source = await readFile(serverPath, "utf8");
  assert.doesNotMatch(source, /env:\s*process\.env/);
  assert.match(source, /BRIDGE_ENVIRONMENT_NAMES/);
  assert.match(source, /UV_PROJECT_ENVIRONMENT/);
  assert.doesNotMatch(source, /QPANDA3_API_KEY|ORIGIN_API_TOKEN|QCOS|QISKIT_IBM_TOKEN/);
});
