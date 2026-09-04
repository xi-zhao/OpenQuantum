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
  capabilityId: "quantum-circuit-verification",
  serverName: "qcec_local",
});
let client;
let transport;
let temporary;

const qasmH = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[1];
h q[0];
`;
const qasmX = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[1];
x q[0];
`;

before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), "openquantum-qcec-test-"));
  const uvPath = path.join(temporary, "uv");
  await writeFile(
    uvPath,
    `#!/usr/bin/env node
const {createHash}=await import("node:crypto");
const chunks=[];
for await (const chunk of process.stdin) chunks.push(chunk);
const envelope=JSON.parse(Buffer.concat(chunks).toString("utf8"));
if(envelope.action==="runtime") {
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packageVersion:"3.9.0",pythonVersion:"3.12.0",maxQasmBytesPerCircuit:65536,timeoutSeconds:10,cloudExecutionEnabled:false}));
} else {
  const sha=(value)=>createHash("sha256").update(value).digest("hex");
  const equivalence=envelope.circuitA===envelope.circuitB?"equivalent":"not_equivalent";
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",packageVersion:"3.9.0",inputDigests:{circuitA:sha(envelope.circuitA),circuitB:sha(envelope.circuitB)},equivalence,statistics:{preprocessingSeconds:0.001,checkSeconds:0.002,performedSimulations:equivalence==="equivalent"?0:1,performedInstantiations:0,checkers:[{checker:"fake-boundary",equivalence,runtimeSeconds:0.002}]},timeoutSeconds:10}));
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
    { name: "openquantum-qcec-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
});

after(async () => {
  await client?.close();
  await rm(temporary, { recursive: true, force: true });
});

test("QCEC MCP declares two bounded non-destructive lazy-environment tools", async () => {
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

test("runtime inspection reports the pinned local-only boundary", async () => {
  const result = await client.callTool({ name: "inspect_qcec_runtime", arguments: {} });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.packageVersion, "3.9.0");
  assert.equal(result.structuredContent.timeoutSeconds, 10);
  assert.equal(result.structuredContent.cloudExecutionEnabled, false);
});

test("equivalent unitary circuits produce observations without final acceptance", async () => {
  const result = await client.callTool({
    name: "verify_circuit_equivalence",
    arguments: { circuitAOpenQasm2: qasmH, circuitBOpenQasm2: qasmH },
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.result.equivalence, "equivalent");
  assert.equal(
    result.structuredContent.validation.observations.find(
      (item) => item.id === "circuits.equivalent",
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

test("non-equivalence remains a scientific observation rather than a tool error", async () => {
  const result = await client.callTool({
    name: "verify_circuit_equivalence",
    arguments: { circuitAOpenQasm2: qasmH, circuitBOpenQasm2: qasmX },
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.result.equivalence, "not_equivalent");
  assert.equal(
    result.structuredContent.validation.observations.find(
      (item) => item.id === "circuits.equivalent",
    ).status,
    "fail",
  );
});

test("dynamic circuits, arbitrary includes and oversized scopes fail before Python", async () => {
  const invalid = [
    qasmH.replace("h q[0];", "creg c[1];\nmeasure q[0] -> c[0];"),
    qasmH.replace('include "qelib1.inc";', 'include "../secret.inc";'),
    qasmH.replace("qreg q[1];", "qreg q[17];"),
  ];
  for (const circuit of invalid) {
    const result = await client.callTool({
      name: "verify_circuit_equivalence",
      arguments: { circuitAOpenQasm2: circuit, circuitBOpenQasm2: qasmH },
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
