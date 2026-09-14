import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const enabled = process.env.OPENQUANTUM_REAL_USER_COMPUTE === "1";
const evidence = path.resolve(process.env.OPENQUANTUM_SCIENCE_EVIDENCE_DIR ?? ".openquantum/user-owned-compute-2026-09-14");
const near = (x, y, tolerance = 1e-8) => assert.ok(Math.abs(x-y) <= tolerance, `${x} vs ${y}`);
const cases = [
  {
    id: "tenpy-ground-state", tool: "solve_tenpy_chain",
    input: { numSites: 300, jx: 0, jy: 0, jz: 0, hz: 0.8, maxBondDimension: 2, maxSweeps: 4 },
    check(r) { near(r.energy, -120); assert.equal(r.siteSz.length, 300); r.siteSz.forEach(x => near(x, 0.5)); },
  },
  {
    id: "tjm-dynamics", tool: "simulate_tjm_dynamics",
    input: { numQubits: 2, coupling: 0, field: 0.7, dampingRate: 0, duration: 3, steps: 81, trajectories: 1, referenceMode: "skip" },
    check(r) {
      assert.equal(r.times.length, 82);
      r.times.forEach((t, i) => r.siteZ.forEach(site => near(site[i], Math.cos(1.4*t), 1e-6)));
      assert.equal(r.standardErrorStatus, "deterministic");
      assert.ok(r.standardErrors.flat().every(x => x === 0));
    },
  },
  {
    id: "flow-vqe", tool: "train_flow_vqe",
    input: { numQubits: 2, terms: [{ pauli: "ZI", coefficient: -1 }], layers: 5, epochs: 201, batchSize: 4 },
    check(r) { assert.equal(r.evaluationsPerMethod, 804); assert.equal(r.bestParameters.length, 12); near(r.bestEnergy, r.recomputedEnergy, 1e-6); near(r.exactGroundEnergy, -1); },
  },
  {
    id: "sqd-chemistry", tool: "run_sqd_chemistry",
    input: {
      molecule: { atoms: Array.from({ length: 10 }, (_, i) => ({ element: "H", positionAngstrom: [0, 0, i] })) },
      basis: "cc-pvdz", activeSpace: { numOrbitals: 34, numElectrons: 10 },
      counts: { [("0".repeat(29)+"11111").repeat(2)]: 64 }, maxSubspaceDimension: 2, iterations: 1,
    },
    check(r) {
      assert.equal(r.spatialOrbitals, 34); assert.equal(r.fullSpatialOrbitals, 50);
      near(r.energyHartree, r.hfEnergyHartree); r.occupancies.forEach(spin => near(spin.reduce((a, b) => a+b, 0), 5));
      assert.equal(r.reference.status, "not_run"); assert.equal(r.fciEnergyHartree, null);
    },
  },
  {
    id: "clifft-sampling", tool: "sample_clifft_circuit",
    input: { numQubits: 512, gates: [{ gate: "H", targets: [0] }, ...Array.from({ length: 511 }, (_, i) => ({ gate: "CX", targets: [i, i+1] }))], shots: 128 },
    check(r) {
      assert.deepEqual(r.outcomes.map(row => row.bitstring), ["0".repeat(512), "1".repeat(512)]);
      assert.equal(r.outcomes.reduce((sum, row) => sum+row.count, 0), 128);
    },
  },
];

for (const entry of cases) {
  test(`user-configured ${entry.id}: execute beyond former bridge policy`, { skip: !enabled, timeout: 300000 }, async t => {
    const client = new Client({ name: "user-compute-science-test", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve(`.agents/skills/${entry.id}/mcp/server.mjs`)] }));
    await mkdir(evidence, { recursive: true });
    async function call(input, label) {
      const response = await client.callTool({ name: entry.tool, arguments: { ...input, execution: { timeoutMs: 0, maxOutputBytes: 8*1024*1024, threads: 2 } } }, undefined, { timeout: 295000 });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const output = response.structuredContent;
      assert.equal(output.scientificValidation, "not_evaluated");
      await writeFile(path.join(evidence, `${entry.id}-user-${label}.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), ...output }, null, 2));
      return output.result;
    }
    entry.check(await call(entry.input, "scale"));
    if (entry.id === "tjm-dynamics") {
      const single = await call({ numQubits: 2, steps: 2, trajectories: 1, dampingRate: 0.5 }, "single-trajectory");
      assert.equal(single.standardErrorStatus, "insufficient_trajectories"); assert.equal(single.standardErrors, null);
    }
    if (entry.id === "clifft-sampling") {
      const reference = await call({ numQubits: 7, gates: [{ gate: "X", targets: [0] }], shots: 16, referenceMode: "required" }, "required-reference");
      assert.equal(reference.reference.status, "computed"); near(reference.totalVariationDistance, 0);
      assert.equal(reference.outcomes.find(row => row.count === 16).bitstring, "1000000");
    }
  });
}
