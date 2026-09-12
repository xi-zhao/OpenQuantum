import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readDeclaredMcpToolContract } from "../scripts/lib/capability-tool-contract.mjs";
import { PAPER_TOOLS } from "./fixtures/paper-tools.mjs";

// A protocol fixture, deliberately not a scientific calculation or scientific evidence.
function sample(schema) {
  if (Object.hasOwn(schema, "const")) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries((schema.required ?? []).map((key) => [key, sample(schema.properties[key])]));
  if (schema.type === "array") return Array.from({ length: schema.minItems ?? 1 }, () => sample(schema.items));
  if (schema.type === "number" || schema.type === "integer") return Math.max(0, schema.minimum ?? 0);
  if (schema.type === "boolean") return false;
  return "protocol fixture";
}
for (const capability of PAPER_TOOLS) {
  test(`${capability.id}: policy, strict MCP schema, provenance, errors and worker environment`, async (t) => {
    const root = process.cwd();
    const { definition } = await import(`../.agents/skills/${capability.id}/mcp/contracts.mjs`);
    const declared = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: capability.id, serverName: capability.server });
    const sandbox = await mkdtemp(path.join(tmpdir(), "oq-paper-contract-"));
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
    const client = new Client({ name: "paper-protocol-fixture", version: "1" }, { capabilities: {} });
    t.after(async () => { await client.close(); await rm(sandbox, { recursive: true, force: true }); });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", capability.id, "mcp/server.mjs")], cwd: root,
      env: { ...process.env, PATH: `${sandbox}${path.delimiter}${process.env.PATH}`, OPENAI_API_KEY: "paper-contract-secret-sentinel" } }));
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
    assert.equal((await call({ ...capability.input, execute: "arbitrary code" })).isError, true);
    assert.equal((await client.callTool({ name: "unknown", arguments: {} })).isError, true);
    for (const mode of ["hash", "input", "schema", "fail"]) {
      await writeFile(modeFile, mode);
      assert.equal((await call()).isError, true, mode);
    }
    if (capability.id === "ldpc-decoding") {
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

test("paper tool resource and cross-field boundaries reject unsupported requests", async () => {
  const bad = {
    "sqd-chemistry": [{ bondLengthAngstrom: 0.1 }, { counts: { "01010": 2 } }, { counts: { "0101": 4096, "1010": 1 } }],
    "tjm-dynamics": [{ numQubits: 7 }, { trajectories: 128, steps: 80 }],
    "ldpc-decoding": [{ parityCheck: [[1],[1,0]], syndromes: [[1,0]] }, { parityCheck: [[1,0]], syndromes: [[1,0]] }, { parityCheck: [[0]], syndromes: [[1]] }, { parityCheck: [[1,0],[1,0]], syndromes: [[1,0]] }],
    "flow-vqe": [{ numQubits: 3, terms: [{ pauli: "XX", coefficient: 1 }] }, { terms: [{ pauli: "XX", coefficient: 1 }, { pauli: "XX", coefficient: 2 }] }, { terms: [{ pauli: "ZZ", coefficient: 1 }], epochs: 30, batchSize: 32 }],
    "tenpy-ground-state": [{ numSites: 2 }, { numSites: 11 }],
    "randomized-measurements": [{ numQubits: 2, subsystem: [2] }, { subsystem: [0,0] }, { settings: 128, shotsPerSetting: 256 }],
  };
  for (const { id, tool } of PAPER_TOOLS) {
    const { definition } = await import(`../.agents/skills/${id}/mcp/contracts.mjs`);
    for (const input of bad[id]) assert.throws(() => definition.normalize(tool, input), undefined, `${id}: ${JSON.stringify(input)}`);
  }
});
