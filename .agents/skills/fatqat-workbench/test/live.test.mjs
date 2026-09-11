import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { FATQAT_REVISION } from "../mcp/contracts.mjs";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const enabled = process.env.OPENQUANTUM_REAL_FATQAT === "1" || process.env.npm_lifecycle_event === "capability:fatqat-workbench:live";
const evidence = path.join(root, ".openquantum/fatqat-evidence");
let client;
before(async () => {
  if (!enabled) return;
  await mkdir(evidence, { recursive: true });
  client = new Client({ name: "fatqat-real-numerical-test", version: "1" }, { capabilities: {} });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills/fatqat-workbench/mcp/server.mjs")], cwd: root }));
});
after(async () => { await client?.close(); });
async function run(name, input, artifact) {
  const response = await client.callTool({ name, arguments: input }, undefined, { timeout: 135000 });
  assert.notEqual(response.isError, true, JSON.stringify(response));
  const result = response.structuredContent;
  assert.equal(result.source.revision, FATQAT_REVISION);
  assert.equal(result.scientificValidation, "not_evaluated");
  if (artifact) {
    await writeFile(path.join(evidence, `${artifact}.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), ...result }, null, 2));
    const image = response.content.find((item) => item.type === "image");
    await writeFile(path.join(evidence, `${artifact}.png`), Buffer.from(image.data, "base64"));
  }
  return result;
}
const circuit = (input, artifact) => run("simulate_fatqat_circuit", input, artifact);
const dynamics = (input, artifact) => run("simulate_fatqat_dynamics", input, artifact);
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tol ${tolerance})`);

test("real FatQat preserves Bell amplitudes, asymmetric bit order, phase interference and seeded counts", { skip: !enabled, timeout: 180000 }, async () => {
  const bell = { backend: "general", numQubits: 2, operations: [{ gate: "h", qubits: [0] }, { gate: "cx", qubits: [0, 1] }], shots: 512, seed: 7 };
  const result = await circuit(bell, "bell");
  near(result.result.probabilities["00"], 0.5);
  near(result.result.probabilities["11"], 0.5);
  near(result.result.statevector[0].real, Math.SQRT1_2);
  near(result.result.statevector[3].real, Math.SQRT1_2);
  assert.equal(result.result.counts["00"] + result.result.counts["11"], 512);
  assert.deepEqual((await circuit(bell)).result.counts, result.result.counts);
  const asymmetric = await circuit({ backend: "general", numQubits: 3, operations: [{ gate: "x", qubits: [0] }], shots: 16 }, "bit-order");
  near(asymmetric.result.probabilities["100"], 1);
  assert.deepEqual(asymmetric.result.counts, { "100": 16 });
  const phase = await circuit({ backend: "general", numQubits: 1, operations: [{ gate: "h", qubits: [0] }, { gate: "z", qubits: [0] }, { gate: "h", qubits: [0] }] });
  near(phase.result.probabilities["1"], 1);
});

test("real FatQat amplitude damping and hardware-profile errors have their intended semantics", { skip: !enabled, timeout: 180000 }, async () => {
  const damped = await circuit({ backend: "general", numQubits: 1, operations: [{ gate: "x", qubits: [0] }], noise: { channel: "amplitude_damping", probability: 1 }, shots: 128 }, "amplitude-damping");
  near(damped.result.probabilities["0"], 1);
  assert.deepEqual(damped.result.counts, { "0": 128 });
  const native = { backend: "superconducting", numQubits: 2, couplings: [[0, 1]], operations: [{ gate: "x", qubits: [0] }, { gate: "x", qubits: [1] }, { gate: "cz", qubits: [0, 1] }], shots: 16 };
  near((await circuit(native, "superconducting-profile")).result.probabilities["11"], 1);
  for (const input of [{ ...native, couplings: [] }, { ...native, operations: [{ gate: "h", qubits: [0] }] }]) {
    const response = await client.callTool({ name: "simulate_fatqat_circuit", arguments: input }, undefined, { timeout: 135000 });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /UnsupportedOperationError|not supported|not native/i);
  }
  const atoms = { backend: "atom_array", numQubits: 2, operations: [{ gate: "pair", qubits: [0, 1] }, { gate: "rx", qubits: [0], angle: Math.PI }, { gate: "cz", qubits: [0, 1] }, { gate: "unpair", qubits: [0, 1] }], shots: 16 };
  assert.deepEqual((await circuit(atoms, "atom-profile")).result.counts, { "10": 16 });
  const unpaired = await client.callTool({ name: "simulate_fatqat_circuit", arguments: { ...atoms, operations: atoms.operations.slice(1) } }, undefined, { timeout: 135000 });
  assert.equal(unpaired.isError, true);
});

test("real Rydberg time series agrees with analytic Rabi evolution and noninteracting factorization", { skip: !enabled, timeout: 180000 }, async () => {
  const input = { model: "rydberg", numAtoms: 1, spacingUm: 6, durationUs: Math.PI, omegaRadPerUs: 1, detuningRadPerUs: 0, c6RadPerUsUm6: 0, samples: 11 };
  const rabi = await dynamics(input, "rydberg-rabi");
  rabi.result.times.forEach((time, index) => near(rabi.result.sitePopulations[index][0][1], Math.sin(time / 2) ** 2, 1e-4));
  assert.equal(rabi.execution.units.time, "us");
  const singleInput = { ...input, spacingUm: 4, durationUs: 5, omegaRadPerUs: 2, samples: 3 };
  const singleZero = await dynamics(singleInput);
  const singleLarge = await dynamics({ ...singleInput, c6RadPerUsUm6: 1000000 }, "rydberg-single-atom-boundary");
  assert.deepEqual(singleLarge.result, singleZero.result, "one atom has no C6 or spacing dependence");
  near(singleLarge.result.probabilities["1"], Math.sin(5) ** 2, 1e-4);
  const independent = await dynamics({ ...input, numAtoms: 2, durationUs: Math.PI / 2, samples: 3 }, "rydberg-factorized");
  for (const value of Object.values(independent.result.probabilities)) near(value, 0.25, 1e-4);
  const interacting = await dynamics({ ...input, numAtoms: 2, durationUs: Math.PI, c6RadPerUsUm6: 1000000, samples: 11 }, "rydberg-interaction");
  assert.ok(interacting.result.probabilities["11"] < 0.05, "strong interaction should suppress double excitation in this bounded example");
});

test("real transmon reference retains physical levels and shows drive-dependent excitation and leakage", { skip: !enabled, timeout: 180000 }, async () => {
  const input = { model: "transmon", durationNs: 20, amplitudeRadPerNs: Math.PI / 20, target: 0, samples: 11 };
  const driven = await dynamics(input, "transmon-leakage");
  assert.equal(driven.execution.units.time, "ns");
  assert.deepEqual(driven.execution.localDimensions, [3, 3]);
  assert.equal(driven.result.statevector.length, 9);
  assert.ok(driven.result.sitePopulations.at(-1)[0][1] > 0.9);
  assert.ok(driven.result.sitePopulations.some((sample) => sample[0][2] > 1e-5));
  const idle = await dynamics({ ...input, amplitudeRadPerNs: 0, samples: 3 });
  near(idle.result.probabilities["00"], 1, 1e-5);
});
