import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readDeclaredMcpToolContract } from "../scripts/lib/capability-tool-contract.mjs";
import { CANDIDATE_TOOLS } from "./fixtures/candidate-tools.mjs";

// A protocol fixture, deliberately not a scientific calculation or scientific evidence.
function sample(schema) {
  if (schema.anyOf) return sample(schema.anyOf[0]);
  if (Object.hasOwn(schema, "const")) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries((schema.required ?? []).map((key) => [key, sample(schema.properties[key])]));
  if (schema.type === "array") return Array.from({ length: schema.minItems ?? 1 }, () => sample(schema.items));
  if (schema.type === "number" || schema.type === "integer") return Math.max(0, schema.minimum ?? 0);
  if (schema.type === "boolean") return false;
  if (schema.pattern === "^[a-f0-9]{64}$") return "0".repeat(64);
  if (schema.pattern === "^[01]+$") return "0";
  return "x".repeat(Math.max(1, schema.minLength ?? 1));
}
for (const capability of CANDIDATE_TOOLS) {
  test(`${capability.id}: policy, strict MCP schema, provenance, errors and worker environment`, async (t) => {
    const root = process.cwd();
    const { definition } = await import(`../.agents/skills/${capability.id}/mcp/contracts.mjs`);
    const declared = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: capability.id, serverName: capability.server });
    const sandbox = await mkdtemp(path.join(tmpdir(), "oq-candidate-contract-"));
    const modeFile = path.join(sandbox, "mode");
    const envFile = path.join(sandbox, "worker-env.json");
    await writeFile(modeFile, "valid");
    const executable = `#!${process.execPath}\nconst fs=require('node:fs');let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{
      fs.writeFileSync(${JSON.stringify(envFile)},JSON.stringify(process.env));
      const mode=fs.readFileSync(${JSON.stringify(modeFile)},'utf8');
      if(mode==='fail'){process.stderr.write('controlled worker failure');process.exit(2);}
      if(mode==='wait'){setInterval(()=>{},1000);return;}
      const r=JSON.parse(input);const output={schemaVersion:'1.0',source:r.source,input:r.input,inputSha256:r.inputSha256,dependencyLockSha256:r.dependencyLockSha256,result:${JSON.stringify(sample(definition.tool.outputSchema.properties.result))},scientificValidation:'not_evaluated',limitations:['Protocol fixture only']};
      if(mode==='hash')output.inputSha256='0'.repeat(64);
      if(mode==='input')output.input={};
      if(mode==='schema')output.scientificValidation='passed';
      process.stdout.write(JSON.stringify(output));
    });\n`;
    for (const name of ["uv", "julia"]) { const file = path.join(sandbox, name); await writeFile(file, executable); await chmod(file, 0o755); }
    const client = new Client({ name: "candidate-protocol-fixture", version: "1" }, { capabilities: {} });
    t.after(async () => { await client.close(); await rm(sandbox, { recursive: true, force: true }); });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", capability.id, "mcp/server.mjs")], cwd: root,
      env: { ...process.env, PATH: `${sandbox}${path.delimiter}${process.env.PATH}`, OPENAI_API_KEY: "candidate-contract-secret-sentinel", OMP_NUM_THREADS: "7", MKL_NUM_THREADS: "4" } }));
    const listed = (await client.listTools()).tools;
    assert.deepEqual(listed.map(tool => tool.name), declared.map(tool => tool.name));
    assert.equal(listed.length, 1);
    assert.equal(declared[0].effect, "workspace-write");
    assert.equal(listed[0].annotations.readOnlyHint, false);
    assert.equal(listed[0].inputSchema.additionalProperties, false);
    const call = (args = capability.input, options) => client.callTool({ name: listed[0].name, arguments: args }, undefined, options);
    assert.equal((await call()).isError, undefined);
    const childEnv = JSON.parse(await readFile(envFile, "utf8"));
    assert.equal(childEnv.OPENAI_API_KEY, undefined);
    assert.equal(childEnv.OMP_NUM_THREADS, "7");
    assert.equal(childEnv.MKL_NUM_THREADS, "4");
    assert.equal((await call({ ...capability.input, execution: { threads: 3 } })).isError, undefined);
    const overrideEnv = JSON.parse(await readFile(envFile, "utf8"));
    for (const key of ["OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"]) assert.equal(overrideEnv[key], "3");
    assert.equal((await call({ ...capability.input, execute: "arbitrary code" })).isError, true);
    assert.equal((await client.callTool({ name: "unknown", arguments: {} })).isError, true);
    for (const mode of ["hash", "input", "schema", "fail"]) {
      await writeFile(modeFile, mode);
      assert.equal((await call()).isError, true, mode);
    }
    if (capability.id === "compact-optimization") {
      await writeFile(modeFile, "wait");
      const controller = new AbortController();
      const pending = call(capability.input, { signal: controller.signal }).catch(error => error);
      await new Promise(resolve => setTimeout(resolve, 200));
      assert.match(JSON.stringify(await call()), /busy/);
      controller.abort(); await pending;
      await writeFile(modeFile, "valid");
      let recovered;
      for (let tries = 0; tries < 20; tries++) {
        recovered = await call(); if (!recovered.isError) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.equal(recovered.isError, undefined, "Cancellation must free the active worker slot");
    }
  });
}


test("Candidate contracts reject invalid physics and preserve caller resource choices", async () => {
  const bad = {
    "qcut-knitting": [{gates:[]}, { observables: ["Z"] }, { strategy: "explicit", gateCuts: [0] }, { gates: [{ gate: "CX", targets: [1,1] }] }, { shots: 0 }, { wireCuts: [0] }],
    "compact-optimization": [{ gates: [{ gate: "ECR", targets: [0,1] }] }, { gates: [{ gate: "RX", targets: [0] }] }, { gates: [{ gate: "H", targets: [0], angle: 1 }] }, { referenceMode: "certified" }],
    "openqarp-excited-states": [{ terms: [{pauli:"YY",coefficient:1}] }, { states: 3 }, { maxIterations: 0 }, { terms: [{pauli:"Y",coefficient:1},{pauli:"Y",coefficient:2}] }],
    "cqlib-kernel": [{ trainY: [0,0,0,0] }, { trainY: [0,1] }, { testX: [[1]] }, { encoder: "amplitude" }, { regularization: 0 }],
  };
  for (const c of CANDIDATE_TOOLS) {
    const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    assert.deepEqual(definition.normalize(c.tool, c.input).execution, {});
    for (const input of bad[c.id]) assert.throws(() => definition.normalize(c.tool, {...c.input,...input}), undefined, `${c.id}: ${JSON.stringify(input)}`);
    const input = definition.normalize(c.tool, {...c.input, execution: {timeoutMs: 0, threads: 8, maxOutputBytes: 10000000}});
    assert.equal(input.execution.timeoutMs, 0);
    assert.equal(input.execution.threads, 8);
    if (c.id === "compact-optimization") assert.equal(definition.normalize(c.tool, {...c.input, numQubits: 30, referenceMode: "skip"}).numQubits, 30);
  }
});
