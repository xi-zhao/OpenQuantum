import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { readDeclaredMcpToolContract } from "../../../../scripts/lib/capability-tool-contract.mjs";
import { compileBinaryLinearModel } from "../modeling/binary-linear-model.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const serverPath = path.join(skillRoot, "mcp", "server.mjs");
const bridgePath = path.join(skillRoot, "mcp", "bridge.py");
const declaredToolContract = readDeclaredMcpToolContract({
  projectRoot,
  capabilityId: "qpanda-qubo",
  serverName: "qpanda_qubo",
});
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
  const size = request.quadratic.length;
  let minimumValue = Number.POSITIVE_INFINITY;
  let optimalAssignments = [];
  for (let mask = 0; mask < 2 ** size; mask += 1) {
    const bits = Array.from({length:size},(_,index)=>(mask >> (size-index-1)) & 1);
    let value = request.constant ?? 0;
    for (let i=0;i<size;i+=1) {
      value += (request.linear?.[i] ?? 0) * bits[i];
      for (let j=0;j<size;j+=1) value += request.quadratic[i][j] * bits[i] * bits[j];
    }
    if (value < minimumValue - 1e-9) { minimumValue = value; optimalAssignments = [bits]; }
    else if (Math.abs(value-minimumValue) <= 1e-9) optimalAssignments.push(bits);
  }
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packageVersion:"2.0.0",problem:{size,keyQubits:size,resultQubits:4,sha256:"b".repeat(64)},classical:{method:"qubobytraversal",optimalAssignments,minimumValue},quantum:qaoa?{layer:request.layer,optimizer:"SLSQP",distribution:{"010":0.9,"110":0.1},topBitstring:"010"}:null,checks:{objectiveConsistencyError:0},scientificValidation:"not_evaluated",limitations:["local","not independently validated"]}));
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

test("named equality model compiles to QUBO and is exhaustively replayed", async () => {
  const result = await client.callTool({
    name: "model_and_solve_qpanda_qubo",
    arguments: {
      model: {
        variables: ["x", "y"],
        objective: {
          sense: "minimize",
          linear: [
            { variable: "x", coefficient: 1 },
            { variable: "y", coefficient: -2 },
          ],
        },
        constraints: [
          {
            id: "choose_one",
            terms: [
              { variable: "x", coefficient: 1 },
              { variable: "y", coefficient: 1 },
            ],
            relation: "eq",
            rhs: 1,
            penalty: 4,
          },
        ],
      },
      method: "traversal",
    },
  });
  assert.equal(result.isError, undefined);
  assert.deepEqual(result.structuredContent.modeling.qubo.linear, [-3, -6]);
  assert.equal(result.structuredContent.modeling.qubo.quadratic[0][1], 8);
  assert.equal(result.structuredContent.modeling.reference.feasibleOptimum.objectiveValue, -2);
  assert.deepEqual(
    result.structuredContent.modeling.reference.feasibleOptimum.assignments[0].values,
    { x: 0, y: 1 },
  );
  assert.equal(result.structuredContent.solver.classical.minimumValue, -2);
  assert.equal(
    result.structuredContent.validation.observations.find(
      (item) => item.id === "penalty.sufficient",
    ).status,
    "pass",
  );
  assert.equal(result.structuredContent.scientificValidation, "observations_available");
});

test("weak penalties stay visible instead of silently claiming a constrained optimum", async () => {
  const result = await client.callTool({
    name: "model_and_solve_qpanda_qubo",
    arguments: {
      model: {
        variables: ["x", "y"],
        objective: {
          sense: "minimize",
          linear: [
            { variable: "x", coefficient: -10 },
            { variable: "y", coefficient: -10 },
          ],
        },
        constraints: [
          {
            id: "choose_one",
            terms: [
              { variable: "x", coefficient: 1 },
              { variable: "y", coefficient: 1 },
            ],
            relation: "eq",
            rhs: 1,
            penalty: 1,
          },
        ],
      },
      method: "traversal",
    },
  });
  assert.equal(result.isError, undefined);
  assert.equal(
    result.structuredContent.validation.observations.find(
      (item) => item.id === "penalty.sufficient",
    ).status,
    "fail",
  );
});

test("model compiler handles maximization and rejects unsupported constraints", () => {
  const compiled = compileBinaryLinearModel({
    variables: ["a", "b"],
    objective: {
      sense: "maximize",
      linear: [
        { variable: "a", coefficient: 1 },
        { variable: "b", coefficient: 2 },
      ],
    },
    constraints: [
      {
        id: "choose_one",
        terms: [
          { variable: "a", coefficient: 1 },
          { variable: "b", coefficient: 1 },
        ],
        relation: "eq",
        rhs: 1,
        penalty: 4,
      },
    ],
  });
  assert.equal(compiled.reference.feasibleOptimum.objectiveValue, 2);
  assert.deepEqual(compiled.reference.feasibleOptimum.assignments[0].values, { a: 0, b: 1 });
  assert.equal(compiled.reference.penaltySufficient, true);
  assert.throws(
    () =>
      compileBinaryLinearModel({
        variables: ["x"],
        objective: { sense: "minimize" },
        constraints: [
          {
            id: "unsupported",
            terms: [{ variable: "x", coefficient: 1 }],
            relation: "le",
            rhs: 1,
            penalty: 1,
          },
        ],
      }),
    /relation must be eq/,
  );
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
  const bridgeSource = await readFile(bridgePath, "utf8");
  assert.match(bridgeSource, /def qubo_api/);
  assert.match(bridgeSource, /pyqpanda_alg\.QUBO\.QUBO/);
  assert.doesNotMatch(bridgeSource, /from pyqpanda_alg\.QUBO import/);
});
