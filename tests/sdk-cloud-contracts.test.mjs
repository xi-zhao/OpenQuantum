import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { definition as ionq } from "../.agents/skills/ionq-programs/mcp/contracts.mjs";
import { definition as superstaq, compileDefinition, targetsDefinition } from "../.agents/skills/superstaq-compilation/mcp/contracts.mjs";
import { SDK_CLOUD_TOOLS } from "./fixtures/sdk-cloud.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";
import { preparePythonFixture } from "./helpers/prepared-python.mjs";
import { readDeclaredMcpToolContract } from "../scripts/lib/capability-tool-contract.mjs";

registerScienceProtocolTests(SDK_CLOUD_TOOLS, { cancellationId: "ionq-programs" });

test("vendor program boundaries reject executable code, malformed gates and unconfigured remote endpoints", () => {
  for (const definition of [ionq, superstaq, compileDefinition]) {
    const base = { ...SDK_CLOUD_TOOLS[0].input, ...(definition === compileDefinition ? { target: "ss_unconstrained_simulator" } : {}) };
    for (const extra of [{ code: "print(1)" }, { apiKey: "not-a-real-key" }, { endpoint: "https://example.com" }, { shots: 100 }, { gates: [{ gate: "CX", targets: [0, 0] }] }, { gates: [{ gate: "RX", targets: [0] }] }, { gates: [{ gate: "H", targets: [0], angle: 1 }] }]) {
      assert.throws(() => definition.normalize(definition.tool.name, { ...base, ...extra }));
    }
    assert.equal(definition.normalize(definition.tool.name, { ...base, numQubits: 100 }).numQubits, 100);
  }
  assert.throws(() => compileDefinition.normalize(compileDefinition.tool.name, {}), /target/);
  for (const timeout of [0, -1, Infinity]) assert.throws(() => targetsDefinition.normalize(targetsDefinition.tool.name, { requestTimeoutSeconds: timeout }));
  assert.equal(compileDefinition.tool.annotations.idempotentHint, false);
  const policy = readDeclaredMcpToolContract({ projectRoot: process.cwd(), capabilityId: "superstaq-compilation", serverName: "superstaq_cloud" });
  assert.equal(policy.find(tool => tool.name === "compile_superstaq_circuit").effect, "external-write");
  assert.equal(targetsDefinition.normalize(targetsDefinition.tool.name, {}).requestTimeoutSeconds, 60);
});

test("only the trusted Superstaq server forwards its named credential and redacts worker errors", async t => {
  const root = process.cwd();
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-sdk-credential-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const capture = path.join(sandbox, "worker.json");
  const executable = path.join(sandbox, "python-fixture");
  for (const descriptor of SDK_CLOUD_TOOLS) {
    await writeFile(executable, `#!${process.execPath}\nconst fs=require('node:fs');let value='';process.stdin.on('data',x=>value+=x);process.stdin.on('end',()=>{const r=JSON.parse(value);fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify({own:process.env.SUPERSTAQ_API_KEY,other:process.env.OPENAI_API_KEY,ca:process.env.REQUESTS_CA_BUNDLE,tool:r.toolName}));process.stderr.write('controlled: '+(process.env.SUPERSTAQ_API_KEY || 'absent'));process.exit(2);});\n`);
    await chmod(executable, 0o755);
    const prepared = await preparePythonFixture({ root, sandbox, id: descriptor.id, executable });
    const client = new Client({ name: "credential-boundary-fixture", version: "1" }, { capabilities: {} });
    try {
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", descriptor.id, "mcp/server.mjs")], env: { ...process.env, ...prepared, SUPERSTAQ_API_KEY: "only-sdk-test-sentinel", OPENAI_API_KEY: "other-test-sentinel", REQUESTS_CA_BUNDLE: "/test-ca-bundle.pem" } }));
      const result = await client.callTool({ name: descriptor.tool, arguments: descriptor.input });
      assert.equal(result.isError, true);
      assert.doesNotMatch(JSON.stringify(result), /only-sdk-test-sentinel|other-test-sentinel/);
      const child = JSON.parse(await readFile(capture, "utf8"));
      assert.equal(child.own, descriptor.id === "superstaq-compilation" ? "only-sdk-test-sentinel" : undefined);
      assert.equal(child.other, undefined);
      assert.equal(child.ca, "/test-ca-bundle.pem");
      assert.equal(child.tool, descriptor.id === "superstaq-compilation" ? descriptor.tool : undefined);
    } finally { await client.close(); }
  }
});
