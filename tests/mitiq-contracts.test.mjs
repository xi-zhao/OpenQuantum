import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readDeclaredMcpToolContract } from "../scripts/lib/capability-tool-contract.mjs";
import { definition } from "../.agents/skills/mitiq-error-mitigation/mcp/contracts.mjs";

const name = "run_mitiq_experiment";

test("Mitiq rejects unsupported circuits, method combinations", () => {
  for (const method of ["zne", "rem", "pec", "cdr"]) assert.equal(definition.normalize(name, { method }).method, method);
  for (const input of [
    { method: "unknown" }, { numQubits: 5 }, { shotsBudget: 0, replicates: 16 },
    { gates: [{ name: "CX", targets: [0, 0] }] }, { gates: [{ name: "X", targets: [2] }] },
    { gates: [{ name: "RZ", targets: [0] }] }, { gates: [{ name: "H", targets: [0], angle: 0 }] },
    { gates: [] },
    { observable: "II" }, { observable: "Z" }, { gates: [{ name: "MEASURE", targets: [0] }] },
    { method: "zne", readoutProbability: 0.1 }, { method: "zne", trainingCircuits: 12 },
    { method: "rem", pecSamples: 16 }, { method: "cdr", observable: "XX" },
    { method: "cdr", gates: [{ name: "H", targets: [0] }, { name: "CX", targets: [0, 1] }] },
    { method: "cdr", gates: [{ name: "RZ", targets: [0], angle: Math.PI / 2 }] },
    { execute: "arbitrary code" }, { path: "/etc/passwd" }, { backend: "hardware" },
  ]) assert.throws(() => definition.normalize(name, input), undefined, JSON.stringify(input));
  assert.throws(() => definition.normalize("unknown", {}));
});

function fixture(schema) {
  if (Object.hasOwn(schema, "const")) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries(schema.required.map(key => [key, fixture(schema.properties[key])]));
  if (schema.type === "array") return Array.from({ length: schema.minItems }, () => fixture(schema.items));
  if (["number", "integer"].includes(schema.type)) return Math.max(0, schema.minimum ?? 0);
  if (schema.pattern?.includes("64")) return "0".repeat(64);
  return "Protocol fixture only";
}

test("Mitiq MCP policy, annotations, provenance, failure, cancellation and isolated environment", async t => {
  const root = process.cwd();
  const declared = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: "mitiq-error-mitigation", serverName: "mitiq_local" });
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-mitiq-contract-"));
  const modeFile = path.join(sandbox, "mode");
  const envFile = path.join(sandbox, "worker-env.json");
  await writeFile(modeFile, "valid");
  const worker = `#!${process.execPath}\nconst fs=require('node:fs');let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{
    fs.writeFileSync(${JSON.stringify(envFile)},JSON.stringify(process.env));
    const mode=fs.readFileSync(${JSON.stringify(modeFile)},'utf8');
    if(mode==='fail'){process.stderr.write('controlled worker failure');process.exit(2);}
    if(mode==='wait'){setInterval(()=>{},1000);return;}
    const r=JSON.parse(input);const output={schemaVersion:'1.0',source:r.source,input:r.input,inputSha256:r.inputSha256,dependencyLockSha256:r.dependencyLockSha256,result:${JSON.stringify(fixture(definition.tool.outputSchema.properties.result))},scientificValidation:'not_evaluated',limitations:['Protocol fixture only']};
    if(mode==='hash')output.inputSha256='0'.repeat(64);
    if(mode==='input')output.input={};
    if(mode==='source')output.source.version='unreviewed';
    if(mode==='schema')output.scientificValidation='passed';
    process.stdout.write(JSON.stringify(output));
  });\n`;
  await writeFile(path.join(sandbox, "uv"), worker);
  await chmod(path.join(sandbox, "uv"), 0o755);
  const client = new Client({ name: "mitiq-contract-test", version: "1" }, { capabilities: {} });
  t.after(async () => { await client.close(); await rm(sandbox, { recursive: true, force: true }); });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills/mitiq-error-mitigation/mcp/server.mjs")],
    env: { ...process.env, PATH: `${sandbox}${path.delimiter}${process.env.PATH}`, OPENAI_API_KEY: "mitiq-contract-secret-sentinel" } }));
  const listed = (await client.listTools()).tools;
  assert.deepEqual(listed.map(tool => tool.name), declared.map(tool => tool.name));
  assert.equal(declared[0].effect, "workspace-write");
  assert.equal(listed[0].annotations.readOnlyHint, false);
  assert.equal(listed[0].inputSchema.additionalProperties, false);
  const call = (args = {}, options) => client.callTool({ name, arguments: args }, undefined, options);
  assert.notEqual((await call()).isError, true);
  const env = JSON.parse(await readFile(envFile, "utf8"));
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.PYTHONNOUSERSITE, "1");
  assert.equal(env.UV_PROJECT_ENVIRONMENT, path.join(root, ".openquantum/python-envs/mitiq-error-mitigation"));
  assert.equal((await call({ method: "cdr", observable: "XX" })).isError, true);
  for (const mode of ["hash", "input", "source", "schema", "fail"]) {
    await writeFile(modeFile, mode);
    assert.equal((await call()).isError, true, mode);
  }
  await writeFile(modeFile, "wait");
  const controller = new AbortController();
  const pending = call({}, { signal: controller.signal }).catch(error => error);
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.match(JSON.stringify(await call()), /busy/);
  controller.abort(); await pending;
  await writeFile(modeFile, "valid");
  let recovered;
  for (let attempt = 0; attempt < 20; attempt++) {
    recovered = await call(); if (!recovered.isError) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.notEqual(recovered.isError, true, "Cancellation releases the worker slot");
});
