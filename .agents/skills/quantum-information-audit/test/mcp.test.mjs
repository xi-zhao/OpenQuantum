import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { readDeclaredMcpToolContract } from "../../../../scripts/lib/capability-tool-contract.mjs";
import { runEvaluationSuite } from "../evals/run-evals.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const serverPath = path.join(skillRoot, "mcp", "server.mjs");
const declaredToolContract = readDeclaredMcpToolContract({
  projectRoot,
  capabilityId: "quantum-information-audit",
  serverName: "toqito_audit",
});
let client;
let transport;
let temporary;

function bellRequest() {
  return {
    matrixReal: [
      [0.5, 0, 0, 0.5],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0.5, 0, 0, 0.5],
    ],
    subsystemDimensions: [2, 2],
    transposeSubsystems: [0],
  };
}

before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), "openquantum-toqito-test-"));
  const uvPath = path.join(temporary, "uv");
  await writeFile(
    uvPath,
    `#!/usr/bin/env node
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
if (envelope.action === "runtime") {
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packageVersion:"1.3.1",pythonVersion:"3.12.0",maxDimension:16,operations:["is_density","partial_transpose","negativity_reconstruction"],cloudExecutionEnabled:false}));
} else {
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packageVersion:"1.3.1",requestDigest:"5cb4cce15ac7bc324fdaf943ac669e6510c8c6614390d106519837cf0793f6ba",state:{dimension:4,trace:{real:1,imag:0},hermiticityResidual:0,hermitianPartMinimumEigenvalue:0,purity:{real:1,imag:0},numericalRank:1,toqitoDensity:true},partialTranspose:{subsystems:[0],trace:{real:1,imag:0},hermiticityResidual:0,eigenvalues:[-0.5,0.5,0.5,0.5],minimumEigenvalue:-0.5,negativity:0.5}}));
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
    { name: "openquantum-toqito-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
});

after(async () => {
  await client?.close();
  await rm(temporary, { recursive: true, force: true });
});

test("toqito MCP declares two bounded non-destructive lazy-environment tools", async () => {
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
});

test("runtime inspection proves cloud execution stays disabled", async () => {
  const result = await client.callTool({ name: "inspect_toqito_runtime", arguments: {} });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.packageVersion, "1.3.1");
  assert.equal(result.structuredContent.cloudExecutionEnabled, false);
  assert.equal(result.structuredContent.maxDimension, 16);
});

test("Bell-state facts are independently replayed without final acceptance", async () => {
  const result = await client.callTool({
    name: "audit_density_matrix",
    arguments: bellRequest(),
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.analysis.partialTranspose.negativity, 0.5);
  assert.equal(result.structuredContent.scientificValidation, "observations_available");
  assert.equal(
    result.structuredContent.validation.observations.find(
      (item) => item.id === "provenance.complete",
    ).status,
    "not_checked",
  );
  assert.equal(
    result.structuredContent.validation.observations.some((item) => item.status === "fail"),
    false,
  );
});

test("invalid matrix shapes and subsystem definitions fail before Python", async () => {
  for (const argumentsValue of [
    { matrixReal: [[1, 0], [0, 0]], subsystemDimensions: [2], transposeSubsystems: [0] },
    { ...bellRequest(), subsystemDimensions: [2, 3] },
    { ...bellRequest(), transposeSubsystems: [0, 1] },
    { ...bellRequest(), transposeSubsystems: [2] },
  ]) {
    const result = await client.callTool({
      name: "audit_density_matrix",
      arguments: argumentsValue,
    });
    assert.equal(result.isError, true);
  }
});

test("reference eval suite detects invalid and tampered facts", () => {
  const report = runEvaluationSuite();
  assert.equal(report.hardGatePassed, true);
  assert.equal(report.scorePercent, 100);
  assert.ok(report.cases.every((item) => item.expectedMatched));
});

test("bridge environment is allowlisted and contains no cloud credentials", async () => {
  const source = await readFile(serverPath, "utf8");
  assert.doesNotMatch(source, /env:\s*process\.env/);
  assert.match(source, /BRIDGE_ENVIRONMENT_NAMES/);
  assert.match(source, /UV_PROJECT_ENVIRONMENT/);
  assert.doesNotMatch(source, /IBM_QUANTUM_TOKEN|AWS_SECRET|QPANDA3_API_KEY|ORIGIN_API_TOKEN/);
});
