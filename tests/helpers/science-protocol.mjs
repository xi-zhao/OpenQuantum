import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparePythonFixture } from "./prepared-python.mjs";
import { readDeclaredMcpToolContract } from "../../scripts/lib/capability-tool-contract.mjs";

// A protocol fixture, deliberately not a scientific calculation or scientific evidence.
function sample(schema) {
  if (schema.anyOf) return sample(schema.anyOf[0]);
  if (Object.hasOwn(schema, "const")) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries((schema.required ?? []).map((key) => [key, sample(schema.properties[key])]));
  if (schema.type === "array") return Array.from({ length: Math.max(1, schema.minItems ?? 1) }, () => sample(schema.items));
  if (schema.type === "number" || schema.type === "integer") return Math.max(0, schema.minimum ?? 0);
  if (schema.type === "boolean") return false;
  if (schema.pattern === "^[a-f0-9]{64}$") return "0".repeat(64);
  if (schema.pattern === "^[01]+$") return "0";
  if (["^[IXYZ]+$", "^[IXYZ]*$"].includes(schema.pattern)) return "I".repeat(schema.minLength ?? 1);
  return "x".repeat(Math.max(1, schema.minLength ?? 1));
}

export function registerScienceProtocolTests(capabilities, { cancellationId } = {}) {
  for (const capability of capabilities) {
    test(`${capability.id}: policy, strict MCP schema, provenance, errors and worker environment`, async (t) => {
      const root = process.cwd();
      const { definition } = await import(`../../.agents/skills/${capability.id}/mcp/contracts.mjs`);
      const declared = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: capability.id, serverName: capability.server });
      const sandbox = await mkdtemp(path.join(tmpdir(), "oq-science-contract-"));
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
      const prepared = capability.id === "randomized-measurements" ? {} : await preparePythonFixture({ root, sandbox, id: capability.id, executable: path.join(sandbox, "uv") });
      const client = new Client({ name: "science-protocol-fixture", version: "1" }, { capabilities: {} });
      t.after(async () => { await client.close(); await rm(sandbox, { recursive: true, force: true }); });
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", capability.id, "mcp/server.mjs")], cwd: root,
        env: { ...process.env, ...prepared, PATH: `${sandbox}${path.delimiter}${process.env.PATH}`, OPENAI_API_KEY: "science-contract-secret-sentinel", OMP_NUM_THREADS: "7", MKL_NUM_THREADS: "4" } }));
      const listed = (await client.listTools()).tools;
      assert.deepEqual(listed.map(tool => tool.name), declared.map(tool => tool.name));
      const selected = listed.find(tool => tool.name === capability.tool);
      assert.ok(selected, `${capability.tool}: missing selected Tool`);
      assert.equal(declared.find(tool => tool.name === capability.tool).effect, "workspace-write");
      assert.equal(selected.annotations.readOnlyHint, false);
      assert.equal(selected.inputSchema.additionalProperties, false);
      const call = (args = capability.input, options) => client.callTool({ name: capability.tool, arguments: args }, undefined, options);
      const initial = await call();
      assert.equal(initial.isError, undefined, JSON.stringify(initial));
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
      if (capability.id === cancellationId) {
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
}
