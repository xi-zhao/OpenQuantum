import assert from "node:assert/strict";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { definition } from "../.agents/skills/hamiltonian-simulation/mcp/contracts.mjs";
import { sha256 } from "../src/lib/bounded-science-mcp.mjs";
import { readDeclaredMcpToolContract } from "../scripts/lib/capability-tool-contract.mjs";
import { HAMILTONIAN_INPUT as input } from "./fixtures/hamiltonian.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const normalize = value => definition.normalize("simulate_hamiltonian", value);

test("Hamiltonian contract preserves physics, method-specific parameters and caller resource choices", () => {
  assert.equal(normalize(input).referenceMode, "auto");
  for (const patch of [
    { terms: [{ pauli: "X", coefficient: 1 }] }, { terms: [{ pauli: "XA", coefficient: 1 }] },
    { terms: [{ pauli: "XI", coefficient: Infinity }] }, { time: NaN }, { time: Infinity },
    { steps: 0 }, { steps: 1.5 }, { order: 3 }, { seed: 1 },
    { method: "qdrift" }, { initialState: [[1, 0]] },
    { initialState: [[1, 0], [1, 0], [0, 0], [0, 0]] },
    { outputMode: "circuit", initialState: "plus" }, { backend: "unitarylab" },
  ]) assert.throws(() => normalize({ ...input, ...patch }), undefined, JSON.stringify(patch));
  const large = normalize({ numQubits: 80, terms: [{ pauli: "X" + "I".repeat(79), coefficient: -1 }], time: -2, method: "qdrift", steps: 1_000_000, outputMode: "circuit", referenceMode: "skip", execution: { timeoutMs: 0, maxOutputBytes: 0, threads: 8 } });
  assert.equal(large.steps, 1_000_000);
  assert.equal(large.seed, 0);
  assert.equal(large.execution.threads, 8);
  assert.equal(normalize({ ...input, numQubits: 1, terms: [{ pauli: "Y", coefficient: 1 }], initialState: [[Math.SQRT1_2, 0], [0, Math.SQRT1_2]] }).initialState.length, 2);
});

test("prepared MCP never installs, rejects missing/stale setup and checks errors/provenance", {
  timeout: 15000,
  skip: process.platform === "win32" ? "POSIX mock executable; actual prepared Python is covered by the live suite" : false,
}, async t => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-hamiltonian-contract-"));
  const skill = path.join(sandbox, ".agents/skills/hamiltonian-simulation");
  const environment = path.join(sandbox, ".openquantum/python-envs/hamiltonian-simulation");
  const executable = path.join(environment, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const envFile = path.join(sandbox, "worker-env.json");
  const modeFile = path.join(sandbox, "mode");
  const marker = path.join(environment, "openquantum-lock.sha256");
  await mkdir(path.join(skill, "mcp"), { recursive: true });
  await mkdir(path.dirname(executable), { recursive: true });
  await copyFile(path.join(root, ".agents/skills/hamiltonian-simulation/uv.lock"), path.join(skill, "uv.lock"));
  const lock = sha256(await readFile(path.join(skill, "uv.lock")));
  const moduleUrl = new URL("../src/lib/bounded-science-mcp.mjs", import.meta.url).href;
  const contractUrl = new URL("../.agents/skills/hamiltonian-simulation/mcp/contracts.mjs", import.meta.url).href;
  await writeFile(path.join(skill, "mcp/server.mjs"), `import {serveScienceTool} from ${JSON.stringify(moduleUrl)};import {definition} from ${JSON.stringify(contractUrl)};await serveScienceTool({entrypoint:import.meta.url,id:"hamiltonian-simulation",definition,preparedEnvironment:true});`);
  const result = {
    method: "trotter", numQubits: 2, steps: 8, order: 2, seed: null, terms: [],
    identityCoefficient: 0, lambda: 0, pauliRotations: 0, sampledTermCounts: [],
    sequenceSha256: "0".repeat(64), openQasm3: "OPENQASM 3.0;",
    circuit: { depth: 0, gates: 0, twoQubitGates: 0, globalPhase: 0, gateCounts: {} },
    statevector: [[1, 0], [0, 0], [0, 0], [0, 0]], stateNorm: 1,
    unitaryFrobeniusError: 0, unitarySpectralError: 0,
    reference: { mode: "auto", status: "computed", method: "protocol fixture", reason: "not scientific evidence" },
    convention: "leftmost Pauli and statevector bit is q0; hbar=1; circuit implements exp(-iHt)",
    interpretation: "deterministic product formula",
  };
  await writeFile(modeFile, "valid");
  await writeFile(executable, `#!${process.execPath}
const fs=require("node:fs");let input="";process.stdin.on("data",x=>input+=x);process.stdin.on("end",()=>{
fs.writeFileSync(${JSON.stringify(envFile)},JSON.stringify(process.env));
const mode=fs.readFileSync(${JSON.stringify(modeFile)},"utf8");
if(mode==="fail"){process.stderr.write("controlled worker failure");process.exit(2);}
if(mode==="wait"){setInterval(()=>{},1000);return;}
const request=JSON.parse(input);
const output={schemaVersion:"1.0",...request,result:${JSON.stringify(result)},scientificValidation:"not_evaluated",limitations:["Protocol fixture only"]};
if(mode==="hash")output.inputSha256="0".repeat(64);
if(mode==="lock")output.dependencyLockSha256="0".repeat(64);
if(mode==="input")output.input.time=123;
if(mode==="schema")output.scientificValidation="passed";
process.stdout.write(JSON.stringify(output));
});
`);
  await chmod(executable, 0o755);
  const client = new Client({ name: "hamiltonian-contract", version: "1" }, { capabilities: {} });
  t.after(async () => { await client.close(); await rm(sandbox, { recursive: true, force: true }); });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(skill, "mcp/server.mjs")], cwd: sandbox,
    env: { ...process.env, OPENAI_API_KEY: "must-not-reach-worker", OMP_NUM_THREADS: "7" },
  }));
  const listed = (await client.listTools()).tools;
  const declared = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: "hamiltonian-simulation", serverName: "hamiltonian_local" });
  assert.deepEqual(listed.map(tool => tool.name), declared.map(tool => tool.name));
  assert.equal(declared[0].effect, "read-only");
  assert.equal(listed[0].annotations.readOnlyHint, true);
  assert.equal(listed[0].annotations.openWorldHint, false);
  const call = (args = input, options) => client.callTool({ name: "simulate_hamiltonian", arguments: args }, undefined, options);
  assert.match(JSON.stringify(await call()), /missing or stale/);
  await assert.rejects(readFile(envFile), { code: "ENOENT" });
  await writeFile(marker, "stale");
  assert.match(JSON.stringify(await call()), /missing or stale/);
  await writeFile(marker, lock);
  assert.equal((await call()).isError, undefined);
  assert.equal(JSON.parse(await readFile(envFile)).OPENAI_API_KEY, undefined);
  assert.equal(JSON.parse(await readFile(envFile)).OMP_NUM_THREADS, "7");
  assert.equal((await call({ ...input, execution: { threads: 3 } })).isError, undefined);
  assert.equal(JSON.parse(await readFile(envFile)).OMP_NUM_THREADS, "3");
  assert.equal((await call({ ...input, steps: 0 })).isError, true);
  assert.equal((await client.callTool({ name: "unknown", arguments: input })).isError, true);
  for (const mode of ["hash", "lock", "input", "schema", "fail"]) {
    await writeFile(modeFile, mode);
    assert.equal((await call()).isError, true, mode);
  }
  await writeFile(modeFile, "wait");
  const controller = new AbortController();
  const pending = call(input, { signal: controller.signal }).catch(error => error);
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.match(JSON.stringify(await call()), /busy/);
  controller.abort(); await pending;
  await writeFile(modeFile, "valid");
  let recovered;
  for (let i = 0; i < 20; i++) {
    recovered = await call();
    if (!recovered.isError) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(recovered.isError, undefined);
});
