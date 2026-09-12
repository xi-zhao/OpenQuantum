import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PAPER_TOOLS } from "./fixtures/paper-tools.mjs";

const enabled = process.env.OPENQUANTUM_REAL_PAPER_TOOLS === "1";
const evidence = path.join(process.cwd(), ".openquantum/paper-tools-evidence");
const near = (actual, expected, tol = 1e-8) => assert.ok(Math.abs(actual-expected) <= tol, `${actual} differs from ${expected} by more than ${tol}`);
async function withTool(t, id, action) {
  const entry = PAPER_TOOLS.find(item => item.id === id);
  const client = new Client({ name: "real-paper-science-test", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(process.cwd(), ".agents/skills", id, "mcp/server.mjs")] }));
  await mkdir(evidence, { recursive: true });
  await action(async (input, label) => {
    const response = await client.callTool({ name: entry.tool, arguments: input }, undefined, { timeout: 195000 });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    assert.equal(response.structuredContent.scientificValidation, "not_evaluated");
    await writeFile(path.join(evidence, `${id}-${label}.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), ...response.structuredContent }, null, 2));
    return response.structuredContent.result;
  });
}

test("real SQD: FCI bound, bond dependence, supplied leading-zero counts and configuration recovery", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "sqd-chemistry", async run => {
    const a = await run({}, "equilibrium");
    near(a.energyHartree, a.fciEnergyHartree, 1e-8);
    near(a.fciEnergyHartree, -1.1373060357534, 1e-8);
    const b = await run({ bondLengthAngstrom: 2.0 }, "stretched");
    assert.ok(b.energyHartree > a.energyHartree + 0.05);
    assert.ok(b.energyHartree >= b.fciEnergyHartree-1e-8);
    for (const counts of [{ "0101": 64 }, { "0000": 64 }]) {
      const c = await run({ counts }, Object.keys(counts)[0]);
      assert.equal(c.sampleSource, "supplied_counts"); assert.equal(c.totalShots, 64);
      assert.ok(c.energyHartree >= c.fciEnergyHartree-1e-8);
      c.occupancies.forEach(spin => near(spin.reduce((x,y)=>x+y,0), 1));
    }
  });
});

test("real TJM: exact requested grid, coherent Rabi limit, damping and finite-trajectory uncertainty", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "tjm-dynamics", async run => {
    const coherent = await run({ numQubits: 2, coupling: 0, field: 0.7, dampingRate: 0, duration: 0.1, steps: 2, trajectories: 8 }, "coherent-grid");
    assert.equal(coherent.times.length, 3); near(coherent.times.at(-1), 0.1);
    coherent.times.forEach((time,i) => coherent.siteZ.forEach(site => near(site[i], Math.cos(1.4*time), 1e-6)));
    const damped = await run({ numQubits: 2, coupling: 0.4, field: 1.5, dampingRate: 0.8, duration: 1, steps: 24, trajectories: 96 }, "damping");
    assert.ok(damped.standardErrors.some(row => row.some(value => value > 0.005)), "sampling must include actual jump variability");
    assert.ok(damped.maxAbsoluteDeviation < 0.25, "fixed-seed small-chain comparison with dense Lindblad reference");
    near(damped.referenceTraceError, 0, 1e-8);
  });
});

test("real LSD: single errors, zero syndrome and a redundant consistent check", { skip: !enabled, timeout: 120000 }, async t => {
  await withTool(t, "ldpc-decoding", async run => {
    const a = await run({ parityCheck: [[1,1,0],[0,1,1]], syndromes: [[1,0],[1,1],[0,1],[0,0]] }, "single-errors");
    assert.deepEqual(a.corrections, [[1,0,0],[0,1,0],[0,0,1],[0,0,0]]);
    assert.ok(a.syndromeSatisfied.every(Boolean)); assert.equal(a.logicalSuccess, "not_evaluated");
    const b = await run({ parityCheck: [[1,1,0],[0,1,1],[1,0,1]], syndromes: [[1,0,1]] }, "redundant-check");
    assert.deepEqual(b.residualSyndromes, [[0,0,0]]);
  });
});

test("real Flow-VQE: seeded upstream training, physical variational bound and exact Pauli reference", { skip: !enabled, timeout: 180000 }, async t => {
  await withTool(t, "flow-vqe", async run => {
    const input = { numQubits: 2, terms: [{ pauli: "ZI", coefficient: -1 }, { pauli: "IX", coefficient: -0.5 }], epochs: 4, batchSize: 8, seed: 7 };
    const a = await run(input, "training"); const b = await run(input, "repeat");
    near(a.exactGroundEnergy, -1.5);
    near(a.recomputedEnergy, b.recomputedEnergy, 1e-10);
    near(a.bestEnergy, a.recomputedEnergy, 1e-6);
    near(a.normError, 0, 1e-10);
    assert.ok(a.error >= -1e-10);
    assert.equal(a.evaluationsPerMethod, 32);
    assert.equal(a.energyHistory.length, 4);
    assert.ok(a.energyHistory.every((value,i) => i===0 || value <= a.energyHistory[i-1]+1e-7));
    assert.ok(a.randomSearchBestEnergy >= a.exactGroundEnergy-1e-10);
  });
});

test("real TeNPy: antiferromagnetic energy, S=Pauli/2 convention and field sign", { skip: !enabled, timeout: 180000 }, async t => {
  await withTool(t, "tenpy-ground-state", async run => {
    const chain = await run({ numSites: 4 }, "heisenberg");
    near(chain.exactGroundEnergy, -0.75-Math.sqrt(3)/2, 1e-8);
    near(chain.energy, chain.exactGroundEnergy, 1e-7);
    const field = await run({ numSites: 3, jx: 0, jy: 0, jz: 0, hz: 0.8 }, "field");
    near(field.energy, -1.2, 1e-7);
    field.siteSz.forEach(value => near(value, 0.5, 1e-7));
    near(field.normError, 0, 1e-8);
  });
});

test("real RandomMeas: GHZ subsystem, full-system and product purity with finite-setting error", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "randomized-measurements", async run => {
    for (const [state,subsystem,expected] of [["ghz",[0],0.5],["ghz",[0,1],1],["product",[0],1]]) {
      const a = await run({ numQubits: 2, state, subsystem, settings: 64, shotsPerSetting: 128, seed: 7 }, `${state}-${subsystem.length}`);
      near(a.analyticPurity, expected);
      assert.ok(a.absoluteError < Math.max(0.15, 5*a.settingStandardError), "finite-setting estimate should agree at this fixed seed/budget");
      assert.equal(a.totalShots, 8192);
      assert.deepEqual(a.subsystemZeroBased, subsystem);
    }
  });
});
