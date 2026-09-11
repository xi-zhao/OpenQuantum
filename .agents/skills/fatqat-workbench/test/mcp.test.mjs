import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readDeclaredMcpToolContract } from "../../../../scripts/lib/capability-tool-contract.mjs";
import { FATQAT_REVISION, FATQAT_VERSION, normalizeRequest } from "../mcp/contracts.mjs";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const declared = readDeclaredMcpToolContract({ projectRoot: root, capabilityId: "fatqat-workbench", serverName: "fatqat_local" });
let client;
let temporary;
const circuit = { backend: "general", numQubits: 1, operations: [{ gate: "x", qubits: [0] }] };

before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), "fatqat-contract-"));
  const script = path.join(temporary, "uv");
  await writeFile(script, `#!/usr/bin/env node
const chunks=[];
for await (const chunk of process.stdin) chunks.push(chunk);
const envelope=JSON.parse(Buffer.concat(chunks).toString());
if (process.env.FATQAT_TEST_SECRET) throw new Error("Unrelated credential leaked to worker");
if (envelope.input.seed===98) { process.stdout.write("bad-json"); }
else if (envelope.input.seed===99) { setInterval(()=>{},1000); }
else {
  process.stdout.write(JSON.stringify({schemaVersion:"1.0",source:{name:"FatQat",version:${JSON.stringify(FATQAT_VERSION)},revision:${JSON.stringify(FATQAT_REVISION)},dependencyLockSha256:envelope.dependencyLockSha256},input:envelope.input,inputSha256:"a".repeat(64),execution:{fixture:true},result:{fixture:true},checks:{fixture:true},scientificValidation:"not_evaluated",limitations:["mock contract fixture; not a numerical validation"],plotPng:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII="}));
}
`);
  await chmod(script, 0o755);
  client = new Client({ name: "fatqat-contract-test", version: "1" }, { capabilities: {} });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(root, ".agents/skills/fatqat-workbench/mcp/server.mjs")], cwd: root,
    env: { ...process.env, PATH: `${temporary}${path.delimiter}${process.env.PATH}`, FATQAT_TEST_SECRET: "must-stay-in-host" },
  }));
});
after(async () => { await client?.close(); await rm(temporary, { recursive: true, force: true }); });

test("FatQat MCP registers exactly the declared bounded tools with full setup effects", async () => {
  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.map((tool) => tool.name), declared.map((tool) => tool.name));
  assert.ok(declared.every((tool) => tool.effect === "workspace-write" && tool.effectEvidence === "mcp-annotations"));
  for (const tool of tools) {
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(tool.annotations.readOnlyHint, false);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.openWorldHint, true);
  }
});

test("malformed and unsupported requests fail before the worker starts", async () => {
  for (const argumentsValue of [
    { ...circuit, numQubits: 9 },
    { ...circuit, code: "print('arbitrary')" },
    { ...circuit, operations: [{ gate: "cx", qubits: [0, 0] }] },
    { ...circuit, operations: [{ gate: "x", qubits: [1] }] },
    { ...circuit, operations: [{ gate: "rx", qubits: [0] }] },
    { ...circuit, operations: [{ gate: "x", qubits: [0], angle: 1 }] },
    { ...circuit, operations: [{ gate: "pair", qubits: [0, 1] }], numQubits: 2 },
    { ...circuit, numQubits: 6, noise: { channel: "depolarizing", probability: 0.1 } },
    { ...circuit, backend: "superconducting" },
    { ...circuit, backend: "superconducting", numQubits: 2, couplings: [[0, 1], [1, 0]] },
    { ...circuit, couplings: [] },
    { ...circuit, seed: -1 },
  ]) {
    const result = await client.callTool({ name: "simulate_fatqat_circuit", arguments: argumentsValue });
    assert.equal(result.isError, true, JSON.stringify(argumentsValue));
  }
  for (const argumentsValue of [
    { model: "transmon", durationNs: 20, amplitudeRadPerNs: 0.1, durationUs: 1 },
    { model: "rydberg", numAtoms: 7, spacingUm: 6, durationUs: 1, omegaRadPerUs: 1 },
    { model: "rydberg", numAtoms: 2, spacingUm: 4, durationUs: 5, omegaRadPerUs: 1, c6RadPerUsUm6: 1000000 },
    { model: "transmon", durationNs: 20, amplitudeRadPerNs: 0.1, samples: 100 },
  ]) {
    const result = await client.callTool({ name: "simulate_fatqat_dynamics", arguments: argumentsValue });
    assert.equal(result.isError, true, JSON.stringify(argumentsValue));
  }
  assert.equal((await client.callTool({ name: "execute_python", arguments: {} })).isError, true);
});

test("normalization preserves zero controls, seeds, noise and physical units", () => {
  const normalized = normalizeRequest("simulate_fatqat_circuit", { ...circuit, seed: 0, shots: 0 });
  assert.equal(normalized.seed, 0);
  assert.equal(normalized.shots, 0);
  assert.equal(circuit.seed, undefined);
  const physical = normalizeRequest("simulate_fatqat_dynamics", { model: "rydberg", numAtoms: 2, spacingUm: 6, durationUs: 1, omegaRadPerUs: 0, c6RadPerUsUm6: 0 });
  assert.equal(physical.c6RadPerUsUm6, 0);
  assert.equal(physical.detuningRadPerUs, 0);
  assert.equal(physical.samples, 21);
  const singleAtom = { model: "rydberg", numAtoms: 1, spacingUm: 4, durationUs: 5, omegaRadPerUs: 2, c6RadPerUsUm6: 1000000 };
  assert.equal(normalizeRequest("simulate_fatqat_dynamics", singleAtom).c6RadPerUsUm6, 1000000);
  assert.throws(() => normalizeRequest("simulate_fatqat_dynamics", { ...singleAtom, numAtoms: 2 }), /Interaction strength/);
  assert.throws(() => normalizeRequest("simulate_fatqat_dynamics", { model: "transmon", durationNs: NaN, amplitudeRadPerNs: 0.1 }));
});

test("MCP result retains provenance and image while the worker receives no unrelated secret", async () => {
  const result = await client.callTool({ name: "simulate_fatqat_circuit", arguments: circuit });
  assert.notEqual(result.isError, true, JSON.stringify(result));
  assert.equal(result.structuredContent.source.revision, FATQAT_REVISION);
  assert.equal(result.structuredContent.input.seed, 7);
  assert.equal(result.structuredContent.scientificValidation, "not_evaluated");
  assert.equal(result.content.find((item) => item.type === "image").mimeType, "image/png");
  assert.equal(result.structuredContent.plotPng, undefined);
});

test("worker protocol errors remain explicit Tool failures", async () => {
  const result = await client.callTool({ name: "simulate_fatqat_circuit", arguments: { ...circuit, seed: 98 } });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /invalid JSON/);
});

test("cancellation frees the bounded worker slot and the MCP connection stays usable", async () => {
  const controller = new AbortController();
  const pending = client.callTool({ name: "simulate_fatqat_circuit", arguments: { ...circuit, seed: 99 } }, undefined, { signal: controller.signal });
  setTimeout(() => controller.abort(), 250);
  await assert.rejects(pending);
  const result = await client.callTool({ name: "simulate_fatqat_circuit", arguments: circuit });
  assert.notEqual(result.isError, true, JSON.stringify(result));
});
