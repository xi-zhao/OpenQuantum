import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SCALABLE_BRIDGES } from "./fixtures/scalable-bridges.mjs";
const enabled = process.env.OPENQUANTUM_REAL_SCALABLE_BRIDGES === "1";
const evidence = path.join(process.cwd(), process.env.OPENQUANTUM_SCIENCE_EVIDENCE_DIR ?? ".openquantum/scalable-bridge-evidence-2026-09-14");
const near = (x,y,tolerance=1e-8) => assert.ok(Math.abs(x-y) <= tolerance, `${x} vs ${y}, tolerance ${tolerance}`);
async function oracle(id, mode) {
  const { stdout } = await promisify(execFile)(path.resolve(`.openquantum/python-envs/${id}/bin/python`), ["tests/python/scalable_bridge_oracles.py", mode], { env: { ...process.env, OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1", MKL_NUM_THREADS: "1" }, timeout: 60000 });
  return JSON.parse(stdout);
}
for (const entry of SCALABLE_BRIDGES) {
  test(`real expanded ${entry.id}: beyond old scale, reference status and independent observations`, { skip: !enabled, timeout: 300000 }, async t => {
    const client = new Client({ name: "scalable-bridge-science-test", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve(`.agents/skills/${entry.id}/mcp/server.mjs`)] }));
    await mkdir(evidence, { recursive: true });
    async function call(input, label, failure) {
      const response = await client.callTool({ name: entry.tool, arguments: input }, undefined, { timeout: 195000 });
      if (failure) { assert.equal(response.isError,true); assert.match(JSON.stringify(response), failure); return; }
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const output = response.structuredContent;
      assert.equal(output.scientificValidation, "not_evaluated");
      await writeFile(path.join(evidence, `${entry.id}-${label}.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), ...output }, null, 2));
      return output.result;
    }
    const result = await call(entry.input, "expanded");
    if (entry.id !== "sqd-chemistry") {
      assert.equal(result.reference.status, "not_run");
      entry.referenceFields.forEach(key => assert.equal(result[key], null));
    }
    if (entry.id === "tenpy-ground-state") {
      near(result.energy, -4.8); result.siteSz.forEach(x => near(x,0.5));
      assert.equal(typeof result.convergence.criteriaMet, "boolean");
      assert.ok(Number.isFinite(result.convergence.lastEnergyChange));
      const coupled = await call({ numSites: 12, maxBondDimension: 32, maxSweeps: 12 }, "coupled");
      assert.ok(coupled.energy < -5 && coupled.energy > -9);
      near(coupled.normError,0,1e-8);
    } else if (entry.id === "tjm-dynamics") {
      result.times.forEach((time,i) => result.siteZ.forEach(site => near(site[i],Math.cos(1.4*time),1e-6)));
      assert.equal(result.siteZ.length,8);
      const damped = await call({ ...entry.input, dampingRate: 0.8, field: 1.5, duration: 0.8, steps: 8, trajectories: 32 }, "damped");
      assert.ok(damped.standardErrors.flat().some(x => x>0.001));
    } else if (entry.id === "flow-vqe") {
      near(result.normError,0,1e-10); near(result.bestEnergy,result.recomputedEnergy,1e-6);
      assert.ok(result.recomputedEnergy >= -1.5-1e-10);
      assert.equal(result.bestParameters.length,24); assert.equal(result.evaluationsPerMethod,8);
      const verification = await oracle(entry.id,"flow");
      assert.equal(verification.pauliWordsChecked,80);
      await writeFile(path.join(evidence,"flow-matrix-free-oracle.json"),JSON.stringify(verification,null,2));
      const y = await call({ numQubits: 5, terms: [{ pauli: "YYIII", coefficient: 0.7 }, { pauli: "IIIIZ", coefficient: -0.3 }], epochs: 2, batchSize: 4, referenceMode: "required" },"y-pauli");
      near(y.exactGroundEnergy,-1); assert.ok(y.error>=-1e-10);
    } else if (entry.id === "sqd-chemistry") {
      const expected = await oracle(entry.id,"sqd");
      near(result.fciEnergyHartree,expected.frozenCoreEnergyHartree);
      near(result.coreEnergyOffsetHartree,expected.coreEnergyOffsetHartree);
      assert.deepEqual(result.activeOrbitalIndices,expected.activeOrbitalIndices);
      assert.equal(result.frozenCoreOrbitals,1); assert.equal(result.totalShots,64);
      result.occupancies.forEach(spin => near(spin.reduce((a,b)=>a+b,0),1));
      await writeFile(path.join(evidence,"sqd-frozen-core-oracle.json"),JSON.stringify(expected,null,2));
      const h4 = await call({ molecule: { atoms: [0,0.8,1.6,2.4].map(z => ({ element: "H", positionAngstrom: [0,0,z] })) }, iterations: 2 },"h4");
      assert.equal(h4.spatialOrbitals,4); assert.deepEqual(h4.electrons,[2,2]); assert.ok(h4.errorHartree>=-1e-8);
      const larger = await call({ basis: "cc-pvdz", referenceMode: "skip", iterations: 1 },"h2-larger-basis");
      assert.equal(larger.spatialOrbitals,10); assert.equal(larger.reference.status,"not_run");
      const largeActive = await call({ molecule: { atoms: [0,0.8,1.6,2.4].map(z => ({ element: "H", positionAngstrom: [0,0,z] })) }, basis: "cc-pvdz", maxSubspaceDimension: 8, counts: { ["0".repeat(18)+"11"+"0".repeat(18)+"11"]: 64 }, iterations: 1 },"h4-large-active");
      assert.equal(largeActive.spatialOrbitals,20); assert.equal(largeActive.determinantDimension,36100);
      assert.equal(largeActive.reference.status,"not_run"); assert.equal(largeActive.fciEnergyHartree,null);
      largeActive.occupancies.forEach(spin => near(spin.reduce((a,b)=>a+b,0),2));
      await call({ molecule: entry.input.molecule, counts: { "0101": 64 } },"bad-width",/require 12 bits/);
    } else {
      assert.equal(result.outcomesCoverage,"observed_only");
      assert.deepEqual(result.outcomes.map(x=>x.bitstring),["0".repeat(80),"1".repeat(80)]);
      assert.equal(result.outcomes.reduce((sum,row)=>sum+row.count,0),256);
      assert.ok(Math.abs(result.outcomes[0].probability-0.5)<0.15);
      const asymmetric = await call({ numQubits: 80, gates: [{ gate: "X", targets: [0] }, { gate: "X", targets: [78] }], shots: 128 },"wide-bit-order");
      assert.equal(asymmetric.outcomes[0].bitstring,"1"+"0".repeat(77)+"10");
      await call({ maxActiveWidth: 0 },"active-width-rejection",/active width/);
    }
    const small = entry.id === "flow-vqe" ? { terms: [{ pauli: "ZI", coefficient: -1 }], epochs: 1, batchSize: 4 } : entry.id === "tjm-dynamics" ? { numQubits: 2, steps: 2, trajectories: 8 } : {};
    const skipped = await call({ ...small, referenceMode: "skip" },"explicit-skip");
    assert.equal(skipped.reference.status,"not_run");
    entry.referenceFields.forEach(key=>assert.equal(skipped[key],null));
  });
}
