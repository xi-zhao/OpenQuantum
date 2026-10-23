import assert from "node:assert/strict";
import { chmod, copyFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readDeclaredMcpToolContract } from "../scripts/lib/capability-tool-contract.mjs";
import { sha256 } from "../src/lib/bounded-science-mcp.mjs";
import { definition } from "../.agents/skills/pairinteraction-rydberg/mcp/contracts.mjs";

const id = "pairinteraction-rydberg";
const name = "calculate_rydberg_pair";
const root = process.cwd();
const relative = `.agents/skills/${id}`;

test("PairInteraction input is bounded and does not accept FatQat models, paths or code", () => {
  assert.equal(definition.normalize(name, {}).channel, "ss");
  assert.equal(definition.normalize(name, { channel: "sp_exchange", nP: 60 }).nP, 60);
  for (const input of [
    { channel: "rydberg_chain" }, { nS: 44 }, { nS: 71 }, { nS: 60.5 }, { nP: 60 },
    { channel: "sp_exchange" }, { channel: "sp_exchange", nP: 55 },
    { magneticFieldG: 0 }, { magneticFieldG: 31 }, { distancesUm: [3] }, { distancesUm: [31] },
    { distancesUm: [12, 8] }, { distancesUm: [8, 8] }, { distancesUm: [] },
    { distancesUm: Array.from({ length: 10 }, (_, i) => 5 + i) },
    { deltaN: 4 }, { energyWindowGHz: 26 }, { c6RadPerUsUm6: 10 },
    { species: "Cs" }, { electricField: 1 }, { database: "/tmp/data" }, { code: "print(1)" },
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

test("independent PairInteraction MCP: setup boundary, policy, provenance, failures, cancellation and secrets", async t => {
  const declared = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: id, serverName: "pairinteraction_local" });
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), "oq-pairinteraction-contract-")));
  const modeFile = path.join(sandbox, "mode");
  const envFile = path.join(sandbox, "worker-env.json");
  // A private project copy lets us replace only its interpreter, never the real environment.
  for (const file of ["mcp/server.mjs", "mcp/contracts.mjs", "uv.lock", "database-lock.json"].map(file => `${relative}/${file}`).concat(["src/lib/local-json-process.mjs", "src/lib/bounded-science-mcp.mjs", "src/lib/prepared-python.mjs", "src/lib/science-execution.mjs", "src/lib/local-compute-policy.mjs"])) {
    await mkdir(path.dirname(path.join(sandbox, file)), { recursive: true });
    await copyFile(path.join(root, file), path.join(sandbox, file));
  }
  await symlink(path.join(root, "node_modules"), path.join(sandbox, "node_modules"), "dir");
  const client = new Client({ name: "pairinteraction-contract-test", version: "1" }, { capabilities: {} });
  t.after(async () => { await client.close(); await rm(sandbox, { recursive: true, force: true }); });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(sandbox, relative, "mcp/server.mjs")],
    env: { ...process.env, OPENAI_API_KEY: "pairinteraction-contract-secret-sentinel", PYTHONPATH: "/untrusted", PAIRINTERACTION_CONFIG_DIR: "/untrusted" } }));
  const listed = (await client.listTools()).tools;
  assert.deepEqual(listed.map(tool => tool.name), declared.map(tool => tool.name));
  assert.equal(declared[0].effect, "workspace-write");
  assert.equal(listed[0].annotations.readOnlyHint, false);
  assert.equal(listed[0].annotations.openWorldHint, false);
  assert.equal(listed[0].inputSchema.additionalProperties, false);
  const call = (args = { distancesUm: [8] }, options) => client.callTool({ name, arguments: args }, undefined, options);
  assert.match(JSON.stringify(await call()), /setup-paper-tools.mjs pairinteraction-rydberg/);
  const databaseLock = await readFile(path.join(root, relative, "database-lock.json"));
  const spec = JSON.parse(databaseLock);
  const result = fixture(definition.tool.outputSchema.properties.result);
  result.database = { release: spec.release, manifestSha256: sha256(databaseLock), files: spec.archives.flatMap(archive => Object.entries(archive.files).map(([name, sha256]) => ({ name, sha256 }))).sort((a, b) => a.name < b.name ? -1 : 1) };
  result.points[0].distanceUm = 8;
  const worker = `#!${process.execPath}\nconst fs=require('node:fs');let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{
    fs.writeFileSync(${JSON.stringify(envFile)},JSON.stringify(process.env));
    const mode=fs.readFileSync(${JSON.stringify(modeFile)},'utf8');
    if(mode==='fail'){process.stderr.write('controlled worker failure');process.exit(2);}
    if(mode==='wait'){setInterval(()=>{},1000);return;}
    if(mode==='json'){process.stdout.write('invalid json');return;}
    const r=JSON.parse(input);const output={schemaVersion:'1.0',source:r.source,input:r.input,inputSha256:r.inputSha256,dependencyLockSha256:r.dependencyLockSha256,result:${JSON.stringify(result)},scientificValidation:'not_evaluated',limitations:['Protocol fixture only']};
    if(mode==='hash')output.inputSha256='0'.repeat(64);
    if(mode==='lock')output.dependencyLockSha256='0'.repeat(64);
    if(mode==='database')output.result.database.files[0].sha256='0'.repeat(64);
    if(mode==='input')output.input={};
    if(mode==='source')output.source.version='unreviewed';
    if(mode==='schema')output.scientificValidation='passed';
    if(mode==='shape')output.result.points[0].effectiveHamiltonianMHz=[[1,2]];
    process.stdout.write(JSON.stringify(output));
  });\n`;
  const python = path.join(sandbox, ".openquantum/python-envs", id, "bin/python");
  await mkdir(path.dirname(python), { recursive: true });
  await writeFile(python, worker); await chmod(python, 0o755);
  const marker = path.join(path.dirname(path.dirname(python)), "openquantum-lock.sha256");
  await writeFile(marker, "outdated");
  assert.match(JSON.stringify(await call()), /missing or stale/);
  await writeFile(marker, sha256(await readFile(path.join(sandbox, relative, "uv.lock"))) + "\n");
  await writeFile(modeFile, "valid");
  assert.notEqual((await call({ distancesUm: [8], execution: { threads: 2 } })).isError, true);
  const env = JSON.parse(await readFile(envFile, "utf8"));
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.PYTHONPATH, undefined);
  assert.equal(env.PYTHONNOUSERSITE, "1");
  assert.equal(env.OMP_NUM_THREADS, "2");
  assert.equal(env.PAIRINTERACTION_CONFIG_DIR, path.join(sandbox, ".openquantum/pairinteraction-config"));
  assert.equal((await call({ channel: "sp_exchange" })).isError, true);
  for (const mode of ["hash", "lock", "database", "input", "source", "schema", "shape", "json", "fail"]) {
    await writeFile(modeFile, mode); assert.equal((await call()).isError, true, mode);
  }
  await writeFile(modeFile, "wait");
  const controller = new AbortController();
  const pending = call(undefined, { signal: controller.signal }).catch(error => error);
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
  await writeFile(modeFile, "wait");
  assert.match(JSON.stringify(await call({ distancesUm: [8], execution: { timeoutMs: 50 } })), /timed out/);
  await writeFile(modeFile, "valid");
  assert.equal((await call({ distancesUm: [8], execution: { maxOutputBytes: 100 } })).isError, true);
  await writeFile(path.join(sandbox, relative, "uv.lock"), "modified lock");
  assert.match(JSON.stringify(await call()), /Dependency lock changed/);
});

test("PairInteraction and FatQat retain separate dependencies, tool contracts and version pins", async () => {
  const pairProject = await readFile(`${relative}/pyproject.toml`, "utf8");
  const fatProject = await readFile(".agents/skills/fatqat-workbench/pyproject.toml", "utf8");
  const pairLock = await readFile(`${relative}/uv.lock`, "utf8");
  const fatLock = await readFile(".agents/skills/fatqat-workbench/uv.lock", "utf8");
  assert.match(pairProject, /pairinteraction==2\.7\.0/);
  assert.doesNotMatch(pairProject + pairLock, /name = "fatqat"/);
  assert.doesNotMatch(fatProject + fatLock, /pairinteraction/);
  assert.match(fatLock, /39b75e30ae50ddb4a8c7b840847edce678aa814c/);
  const fat = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: "fatqat-workbench", serverName: "fatqat_local" });
  assert.deepEqual(fat.map(tool => tool.name), ["simulate_fatqat_circuit", "simulate_fatqat_dynamics"]);
});
