import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { UNITARY_TOOLS } from "./fixtures/unitary-tools.mjs";

const enabled = process.env.OPENQUANTUM_REAL_UNITARY_TOOLS === "1";
const evidence = path.join(process.cwd(), ".openquantum/unitary-tools-evidence");
const near = (x, y, tolerance = 1e-7) => assert.ok(Math.abs(x-y) <= tolerance, `${x} differs from ${y}; tolerance=${tolerance}`);
async function withTool(t, id, action) {
  const c = UNITARY_TOOLS.find(item => item.id === id);
  const client = new Client({ name: "unitary-science-verification", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(process.cwd(), ".agents/skills", id, "mcp/server.mjs")] }));
  await mkdir(evidence, { recursive: true });
  await action(async (input, label) => {
    const response = await client.callTool({ name: c.tool, arguments: input }, undefined, { timeout: 195000 });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    const output = response.structuredContent;
    assert.equal(output.scientificValidation, "not_evaluated");
    await writeFile(path.join(evidence, `${id}-${label}.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), ...output }, null, 2));
    return output.result;
  });
}

test("real Dynamiqs: Rabi population and drive gradient, damping and batch order", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "dynamiqs-dynamics", async run => {
    const drives = [-1, 0, 0.7];
    const a = await run({ drives, dampingRate: 0, duration: 1, steps: 8 }, "rabi");
    drives.forEach((d, i) => {
      a.times.forEach((time, j) => near(a.excitedPopulations[i][j], Math.sin(d*time/2)**2));
      near(a.driveGradients[i], Math.sin(d)/2);
    });
    assert.ok(a.maxGradientDeviation < 1e-6);
    const b = await run({ drives: [0, 1], initialState: "excited", dampingRate: 0.4, detuning: 0.3, duration: 1, steps: 8 }, "damping");
    b.times.forEach((time, j) => near(b.excitedPopulations[0][j], Math.exp(-0.4*time)));
    assert.ok(b.maxPopulationDeviation < 1e-6);
    assert.ok(b.maxGradientDeviation < 1e-5);
    assert.ok(b.maxTraceError < 1e-8);
    assert.ok(b.minimumEigenvalue > -1e-8);
  });
});

test("real Clifft: T interference, Bell correlations, depolarization, seed and bit order", { skip: !enabled, timeout: 180000 }, async t => {
  await withTool(t, "clifft-sampling", async run => {
    const a = await run({ shots: 4096 }, "t-interference");
    near(a.outcomes[0].referenceProbability, Math.cos(Math.PI/8)**2);
    near(a.outcomes[3].referenceProbability, Math.sin(Math.PI/8)**2);
    assert.equal(a.outcomes[1].count + a.outcomes[2].count, 0);
    assert.ok(a.totalVariationDistance < 0.06);
    const repeated = await run({ shots: 4096 }, "repeat");
    assert.deepEqual(repeated.outcomes, a.outcomes);
    const b = await run({ numQubits: 2, gates: [{ gate: "X", targets: [0] }], noiseProbability: 0.15, shots: 4096 }, "noise-bit-order");
    near(b.outcomes[0].referenceProbability, 0.1);
    near(b.outcomes[2].referenceProbability, 0.9);
    assert.equal(b.outcomes[1].count + b.outcomes[3].count, 0);
    assert.ok(b.totalVariationDistance < 0.06);
    assert.equal(b.outcomes.reduce((sum, row) => sum+row.count, 0), 4096);
    near(b.referenceTraceError, 0);
  });
});

test("real OQuPy: unitary limit, Ohmic pure dephasing, trace, positivity and full-memory convergence", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "oqupy-dynamics", async run => {
    const a = await run({ alpha: 0, tunneling: 0.7, bias: 0, initialState: "ground", duration: 0.5, steps: 8, memorySteps: 8 }, "unitary");
    a.times.forEach((time, i) => near(a.bloch[i][2], Math.cos(0.7*time), 1e-6));
    const grid = await run({ tunneling: 0, bias: -0.8, alpha: 0, cutoff: 3.5, temperature: 0, duration: 0.1, steps: 11, memorySteps: 8, initialState: "plus" }, "fractional-grid");
    assert.equal(grid.times.length, 12);
    near(grid.times.at(-1), 0.1, 1e-12);
    grid.times.forEach((time, i) => {
      near(grid.bloch[i][0], Math.cos(-0.8*time), 1e-6);
      near(grid.bloch[i][1], Math.sin(-0.8*time), 1e-6);
    });
    for (const steps of [8, 12]) {
      const b = await run({ tunneling: 0, bias: 0.4, alpha: 0.1, cutoff: 2, temperature: 0, initialState: "plus", duration: 0.5, steps, memorySteps: steps }, `dephasing-${steps}`);
      b.times.forEach((time, i) => {
        const amplitude = (1+4*time*time)**(-0.1);
        near(b.bloch[i][0], amplitude*Math.cos(0.4*time), 5e-4);
        near(b.bloch[i][1], amplitude*Math.sin(0.4*time), 5e-4);
      });
      assert.ok(b.maxTraceError < 1e-6);
      assert.ok(b.minimumEigenvalue > -1e-6);
      near(b.memoryTime, 0.5);
    }
  });
});

test("real Deltakit: both logical bases, rectangular code, fixed-shot noise and generated circuit", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "deltakit-qec", async run => {
    for (const basis of ["X", "Z"]) {
      const a = await run({ width: 3, height: 5, basis, rounds: 2, noiseProbability: 0, shots: 256 }, `ideal-${basis}`);
      assert.equal(a.logicalFailures, 0);
      near(a.detectionEventFraction, 0);
      assert.ok(a.wilson95[1] > 0);
      assert.ok(a.numQubits > 15 && a.numDetectors > 0);
      assert.match(a.circuit, /DETECTOR/);
    }
    const input = { noiseProbability: 0.03, shots: 2048, rounds: 3 };
    const b = await run(input, "noisy");
    const c = await run(input, "repeat");
    assert.equal(b.circuitSha256, c.circuitSha256);
    assert.equal(b.logicalFailures, c.logicalFailures);
    assert.ok(b.detectionEventFraction > 0);
    assert.ok(b.logicalFailures > 0 && b.logicalFailures < b.shots);
    assert.equal(b.logicalErrorRate, b.logicalFailures/b.shots);
    assert.ok(b.wilson95[0] <= b.logicalErrorRate && b.wilson95[1] >= b.logicalErrorRate);
    const rectangularInput = { width: 5, height: 3, basis: "Z", noiseProbability: 0.02, shots: 4096, rounds: 3, seed: 718 };
    const d = await run(rectangularInput, "rectangular-noisy");
    const e = await run(rectangularInput, "rectangular-repeat");
    assert.equal(d.circuitSha256, e.circuitSha256);
    assert.equal(d.logicalFailures, e.logicalFailures);
  });
});
