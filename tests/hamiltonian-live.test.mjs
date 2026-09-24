import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { definition } from "../.agents/skills/hamiltonian-simulation/mcp/contracts.mjs";
import { HAMILTONIAN_INPUT } from "./fixtures/hamiltonian.mjs";

const enabled = process.env.OPENQUANTUM_REAL_HAMILTONIAN === "1";
const evidence = path.join(process.cwd(), ".openquantum/hamiltonian-evidence");
const near = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const pairNear = (a, b) => a.forEach((pair, i) => pair.forEach((x, j) => near(x, b[i][j])));

test("real open Hamiltonian adapter: analytic cases, convergence, independent products, seeds and scalable circuit mode", { skip: !enabled, timeout: 180000 }, async t => {
  const client = new Client({ name: "hamiltonian-numerical-verification", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [".agents/skills/hamiltonian-simulation/mcp/server.mjs"] }));
  await mkdir(evidence, { recursive: true });
  const results = [];
  async function run(input, name) {
    const response = await client.callTool({ name: "simulate_hamiltonian", arguments: input }, undefined, { timeout: 120000 });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    const output = response.structuredContent;
    assert.ok(definition.validateOutput(output), JSON.stringify(definition.validateOutput.errors));
    assert.equal(output.scientificValidation, "not_evaluated");
    results.push({ name, input: output.input, result: output.result });
    return output.result;
  }
  const analytic = await run({ numQubits: 2, terms: [{ pauli: "XI", coefficient: 1 }], time: Math.PI / 2, steps: 1 }, "asymmetric-q0");
  pairNear(analytic.statevector, [[0, 0], [0, 0], [0, -1], [0, 0]]);
  near(analytic.unitaryFrobeniusError, 0);
  for (const [name, terms, time] of [
    ["zero-time", HAMILTONIAN_INPUT.terms, 0],
    ["zero-H", [{ pauli: "XY", coefficient: 0 }], 1],
    ["cancellation", [{ pauli: "XY", coefficient: 1 }, { pauli: "XY", coefficient: -1 }], 1],
  ]) {
    const result = await run({ numQubits: 2, terms, time, method: "qdrift", steps: 4 }, name);
    near(result.unitaryFrobeniusError, 0); assert.equal(result.pauliRotations, 0);
    pairNear(result.statevector, [[1, 0], [0, 0], [0, 0], [0, 0]]);
  }
  const phase = await run({ numQubits: 1, terms: [{ pauli: "I", coefficient: 2 }], time: -0.3, steps: 1 }, "identity-phase");
  pairNear(phase.statevector, [[Math.cos(0.6), Math.sin(0.6)], [0, 0]]);
  near(phase.unitaryFrobeniusError, 0);
  near(Number(phase.openQasm3.match(/gphase\(([^)]+)\);/)[1]), 0.6);
  assert.equal([...phase.openQasm3.matchAll(/gphase\(/g)].length, 1);
  const commuting = await run({ numQubits: 2, terms: [{ pauli: "XI", coefficient: 1 }, { pauli: "IZ", coefficient: -0.5 }], time: -0.6, steps: 3, order: 1 }, "commuting-negative-time");
  near(commuting.unitaryFrobeniusError, 0);
  for (const order of [1, 2, 4]) {
    const low = await run({ ...HAMILTONIAN_INPUT, order, steps: 4 }, `order-${order}-steps-4`);
    const high = await run({ ...HAMILTONIAN_INPUT, order, steps: 8 }, `order-${order}-steps-8`);
    assert.ok(low.unitaryFrobeniusError / high.unitaryFrobeniusError > 0.85 * 2 ** order);
    near(high.stateNorm, 1);
  }
  const initialState = [[0.5, 0], [0, 0.5], [-0.5, 0], [0, -0.5]];
  const oracleInputs = [
    { ...HAMILTONIAN_INPUT, time: -0.6, initialState, order: 1 },
    { ...HAMILTONIAN_INPUT, time: -0.6, initialState, order: 2 },
    { numQubits: 2, terms: HAMILTONIAN_INPUT.terms.slice(0, 3), time: -0.6, initialState, method: "qdrift", steps: 23, seed: 17 },
  ];
  const python = path.join(process.cwd(), ".openquantum/python-envs/hamiltonian-simulation", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  for (const [i, input] of oracleInputs.entries()) {
    const result = await run(input, `dense-oracle-${i}`);
    const oracle = JSON.parse(execFileSync(python, ["-B", "tests/fixtures/hamiltonian-oracle.py"], { input: JSON.stringify(input), encoding: "utf8" }));
    pairNear(result.statevector, oracle.statevector);
    near(result.unitaryFrobeniusError, oracle.frobenius);
    near(result.unitarySpectralError, oracle.spectral);
  }
  const randomInput = oracleInputs[2];
  const first = await run(randomInput, "seed-repeat");
  const repeated = await run(randomInput, "same-seed");
  const different = await run({ ...randomInput, seed: 18 }, "different-seed");
  assert.deepEqual(first, repeated);
  assert.notEqual(first.sequenceSha256, different.sequenceSha256);
  assert.equal(first.sampledTermCounts.reduce((a, b) => a + b, 0), randomInput.steps);
  near(first.lambda, 1.3);
  const single = await run({ numQubits: 1, terms: [{ pauli: "Y", coefficient: -0.7 }], time: -0.4, method: "qdrift", steps: 17, seed: 5 }, "qdrift-single-negative-term");
  near(single.unitaryFrobeniusError, 0);
  const large = await run({ numQubits: 30, terms: [{ pauli: "X" + "I".repeat(29), coefficient: 1 }], time: 1, steps: 2, outputMode: "circuit", referenceMode: "auto" }, "circuit-30q");
  assert.equal(large.statevector, null);
  assert.equal(large.reference.status, "not_run");
  assert.equal(large.unitaryFrobeniusError, null);
  const required = await run({ numQubits: 7, terms: [{ pauli: "XIIIIII", coefficient: 1 }], time: 0.2, steps: 1, outputMode: "circuit", referenceMode: "required" }, "reference-above-auto-threshold");
  assert.equal(required.reference.status, "computed"); near(required.unitaryFrobeniusError, 0);
  const skipped = await run({ ...HAMILTONIAN_INPUT, referenceMode: "skip", initialState: "plus" }, "skip-reference-plus-state");
  assert.equal(skipped.unitaryFrobeniusError, null); near(skipped.stateNorm, 1);
  await writeFile(path.join(evidence, "numerical.json"), JSON.stringify({ verifiedAt: new Date().toISOString(), source: definition.source, results }, null, 2) + "\n");
});
