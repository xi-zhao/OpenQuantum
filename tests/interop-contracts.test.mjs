import assert from "node:assert/strict";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readDeclaredMcpToolContract } from "../scripts/lib/capability-tool-contract.mjs";
import { INTEROP_TOOLS } from "./fixtures/interop.mjs";

function sample(schema) {
  if (schema.anyOf) return sample(schema.anyOf[0]);
  if (Object.hasOwn(schema, "const")) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries((schema.required ?? []).map(key => [key, sample(schema.properties[key])]));
  if (schema.type === "array") return Array.from({ length: schema.minItems ?? 0 }, () => sample(schema.items));
  if (schema.type === "number" || schema.type === "integer") return Math.max(0, schema.minimum ?? 0);
  if (schema.type === "boolean") return false;
  if (schema.pattern === "^[a-f0-9]{64}$") return "0".repeat(64);
  return "x";
}

for (const c of INTEROP_TOOLS) {
  test(c.id + ": actual MCP surface, provenance, failure, cancellation and credential isolation", async t => {
    const root = process.cwd();
    const definition = (await import("../.agents/skills/" + c.id + "/mcp/" + c.contract))[c.exportName];
    const declared = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: c.id, serverName: c.server });
    const sandbox = await mkdtemp(path.join(tmpdir(), "oq-interop-contract-"));
    let project = root;
    const modeFile = path.join(sandbox, "mode"), envFile = path.join(sandbox, "worker-env.json");
    await writeFile(modeFile, "valid");
    const worker = "#!" + process.execPath + "\n" +
      "const fs=require('node:fs');let text='';process.stdin.on('data',c=>text+=c);process.stdin.on('end',()=>{" +
      "fs.writeFileSync(" + JSON.stringify(envFile) + ",JSON.stringify(process.env));" +
      "const mode=fs.readFileSync(" + JSON.stringify(modeFile) + ",'utf8');" +
      "if(mode==='fail'){process.stderr.write('controlled failure');process.exit(2);}" +
      "if(mode==='wait'){setInterval(()=>{},1000);return;}" +
      "const r=JSON.parse(text),out={schemaVersion:'1.0',source:r.source,input:r.input,inputSha256:r.inputSha256,dependencyLockSha256:r.dependencyLockSha256,result:" +
      JSON.stringify(sample(definition.tool.outputSchema.properties.result)) + ",scientificValidation:'not_evaluated',limitations:['Protocol fixture only']};" +
      "if(mode==='hash')out.inputSha256='0'.repeat(64);if(mode==='input')out.input={};if(mode==='schema')out.scientificValidation='passed';" +
      "process.stdout.write(JSON.stringify(out));});\n";
    let executable = path.join(sandbox, "uv");
    if (c.id === "qdmi-device") {
      project = path.join(sandbox, "project");
      await mkdir(path.join(project, ".agents/skills"), { recursive: true });
      await cp(path.join(root, ".agents/skills/qdmi-device"), path.join(project, ".agents/skills/qdmi-device"), { recursive: true });
      await cp(path.join(root, "src/lib"), path.join(project, "src/lib"), { recursive: true });
      await symlink(path.join(root, "node_modules"), path.join(project, "node_modules"), "dir");
      executable = path.join(project, ".openquantum/python-envs/qdmi-device", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    }
    const client = new Client({ name: "interop-contract", version: "1" }, { capabilities: {} });
    t.after(async () => { await client.close(); await rm(sandbox, { recursive: true, force: true }); });
    await client.connect(new StdioClientTransport({ command: process.execPath,
      args: [path.join(project, ".agents/skills", c.id, "mcp/server.mjs")], cwd: project,
      env: { ...process.env, PATH: sandbox + path.delimiter + process.env.PATH,
        OPENAI_API_KEY: "interop-test-sentinel", OPENQUANTUM_CLIENT_SECRET: "interop-qdmi-sentinel" } }));
    const tools = (await client.listTools()).tools;
    assert.deepEqual(tools.map(x => x.name), declared.map(x => x.name));
    const listed = tools.find(x => x.name === c.tool);
    assert.equal(listed.annotations.readOnlyHint, c.id === "qdmi-device");
    assert.equal(declared.find(x => x.name === c.tool).effect, c.id === "qdmi-device" ? "read-only" : "workspace-write");
    const call = (input = c.input, options) => client.callTool({ name: c.tool, arguments: input }, undefined, options);
    if (c.id === "qdmi-device") {
      assert.match(JSON.stringify(await call()), /not configured/);
      await mkdir(path.join(project, ".openquantum/qdmi"), { recursive: true });
      await writeFile(path.join(project, ".openquantum/qdmi/driver.json"), "{}");
    }
    await mkdir(path.dirname(executable), { recursive: true });
    await writeFile(executable, worker); await chmod(executable, 0o755);
    assert.notEqual((await call()).isError, true);
    const env = JSON.parse(await readFile(envFile, "utf8"));
    assert.equal(env.OPENAI_API_KEY, undefined); assert.equal(env.OPENQUANTUM_CLIENT_SECRET, undefined);
    assert.equal((await call({ ...c.input, arbitraryCode: "print(1)" })).isError, true);
    assert.equal((await client.callTool({ name: "unknown", arguments: {} })).isError, true);
    for (const mode of ["hash", "input", "schema", "fail"]) {
      await writeFile(modeFile, mode); assert.equal((await call()).isError, true, mode);
    }
    await writeFile(modeFile, "wait");
    const timed = await call({ ...c.input, execution: { timeoutMs: 100 } });
    assert.equal(timed.isError, true);
    const controller = new AbortController();
    const pending = call(c.input, { signal: controller.signal }).catch(error => error);
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.match(JSON.stringify(await call()), /busy/);
    controller.abort(); await pending;
    await writeFile(modeFile, "valid");
    let recovered;
    for (let i = 0; i < 30; i++) {
      recovered = await call(); if (!recovered.isError) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.notEqual(recovered.isError, true, "Cancellation must release the worker");
  });
}

test("interop schemas reject invalid circuit dimensions, rotations, arbitrary paths and cloud targets", async () => {
  for (const c of INTEROP_TOOLS) {
    const definition = (await import("../.agents/skills/" + c.id + "/mcp/" + c.contract))[c.exportName];
    const bad = c.id === "qbraid-conversion"
      ? [{ numQubits: 1 }, { direction: "cloud" }, { gates: [{ gate: "RX", targets: [0] }] }, { gates: [{ gate: "CX", targets: [1, 1] }] }]
      : c.id === "clifft-sampling" ? [{ shots: 0 }, { stimCircuit: "" }, { backend: "cuda" }]
      : [{ driverPath: "/tmp/driver.so" }, { maxDevices: 0 }, { token: "credential" }];
    for (const value of bad) assert.throws(() => definition.normalize(c.tool, { ...c.input, ...value }));
  }
});
