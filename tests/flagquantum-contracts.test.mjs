import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readDeclaredMcpToolContract } from "../scripts/lib/capability-tool-contract.mjs";
const root = process.cwd();
const entrypoint = path.join(root, ".agents/skills/flagquantum-workbench/mcp/server.mjs");
const snapshot = JSON.parse(await readFile(new URL("../.agents/skills/flagquantum-workbench/mcp/upstream-tools.json", import.meta.url), "utf8"));
const declared = readDeclaredMcpToolContract({projectRoot: root, capabilityId: "flagquantum-workbench", serverName: "flagquantum"});

test("FlagQuantum pinned upstream surface and conservative effects match policy", () => {
  assert.deepEqual(snapshot.tools.map(t => t.name), declared.map(t => t.name));
  assert.equal(snapshot.tools.length, 17);
  for (const tool of snapshot.tools) assert.equal(tool.inputSchema.additionalProperties, false);
  for (const tool of declared) { assert.equal(tool.effect, "workspace-write"); assert.equal(tool.effectEvidence, "reviewed-source"); }
});
test("FlagQuantum launcher sanitizes credentials and freezes the isolated environment", async t => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-flag-contract-"));
  t.after(() => rm(sandbox, {recursive:true,force:true}));
  const observed = path.join(sandbox,"observed.json");
  const uv = path.join(sandbox,"uv");
  await writeFile(uv, `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(observed)},JSON.stringify({argv:process.argv,env:process.env}));\n`);
  await chmod(uv,0o755);
  const child = spawn(process.execPath,[entrypoint],{env:{...process.env,PATH:`${sandbox}${path.delimiter}${process.env.PATH}`,OPENAI_API_KEY:"secret-sentinel",IBM_QUANTUM_TOKEN:"secret-sentinel",OMP_NUM_THREADS:"7",MKL_NUM_THREADS:"4"},stdio:"ignore"});
  const [code] = await once(child,"exit"); assert.equal(code,0);
  const record=JSON.parse(await readFile(observed,"utf8"));
  assert.ok(record.argv.includes("--frozen"));
  assert.ok(record.argv.includes("flagquantum-mcp-server"));
  assert.equal(record.env.OPENAI_API_KEY,undefined); assert.equal(record.env.IBM_QUANTUM_TOKEN,undefined);
  assert.equal(record.env.PYTHONNOUSERSITE,"1");
  assert.equal(record.env.OMP_NUM_THREADS,"7");
  assert.equal(record.env.MKL_NUM_THREADS,"4");
  assert.equal(record.env.UV_PROJECT_ENVIRONMENT,path.join(root,".openquantum/python-envs/flagquantum-workbench"));
});
test("real FlagQuantum: upstream surface, Bell probabilities and structured errors", {skip:process.env.OPENQUANTUM_REAL_CANDIDATE_TOOLS!=="1",timeout:180000},async t=>{
  const client=new Client({name:"flagquantum-live-regression",version:"1"},{capabilities:{}});
  t.after(()=>client.close());
  await client.connect(new StdioClientTransport({command:process.execPath,args:[entrypoint]}));
  assert.deepEqual((await client.listTools()).tools,snapshot.tools);
  const circuit='[{"name":"h","index":[0]},{"name":"cx","index":[0,1]}]';
  const run=(name,args)=>client.callTool({name,arguments:args},undefined,{timeout:90000});
  const a=await run("analyze_circuit_tool",{circuit,circuit_format:"qir"});
  assert.equal(a.structuredContent.status,"success"); assert.equal(a.structuredContent.analysis.two_qubit_gates,1);
  const b=await run("simulate_circuit_tool",{circuit,circuit_format:"qir"});
  assert.equal(b.structuredContent.status,"success");
  assert.equal(b.structuredContent.execution.accuracy.metric,"not_measured");
  b.structuredContent.outputs[0].value.forEach((v,i)=>assert.ok(Math.abs(v-([0.5,0,0,0.5][i]))<1e-6));
  const invalid=await run("analyze_circuit_tool",{circuit:"not-json",circuit_format:"ir"});
  assert.equal(invalid.structuredContent.status,"error");
  await writeFile(path.join(root,".openquantum/candidate-tools-evidence/flagquantum-live.json"),JSON.stringify({analysis:a,simulation:b,invalid},null,2));
});
