import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CANDIDATE_TOOLS } from "./fixtures/candidate-tools.mjs";

const enabled = process.env.OPENQUANTUM_REAL_CANDIDATE_TOOLS === "1";
const evidence = path.join(process.cwd(), ".openquantum/candidate-tools-evidence");
const near = (x, y, tolerance = 1e-7) => assert.ok(Math.abs(x-y) <= tolerance, `${x} differs from ${y}; tolerance=${tolerance}`);
async function withTool(t, id, action) {
  const c = CANDIDATE_TOOLS.find(item => item.id === id);
  const client = new Client({ name: "candidate-science-verification", version: "1" }, { capabilities: {} });
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


test("real QCut: phase-sensitive Bell, reverse CX, explicit cuts and actual cost", {skip:!enabled,timeout:300000}, async t => {
  await withTool(t,"qcut-knitting",async run=>{
    const input=CANDIDATE_TOOLS[0].input;
    const bell=await run(input,"phase-bell");
    bell.estimates.forEach(v=>near(v,1,0.06));
    near(bell.gamma,3); near(bell.theoreticalSamplingOverhead,9);
    assert.equal(bell.executionCost.actualShots,bell.executionCost.completedCircuits*input.shots);
    for(const strategy of ["automatic","explicit"]){
      const a=await run({numQubits:2,gates:[{gate:"X",targets:[1]},{gate:"CX",targets:[1,0]}],observables:["IZ","ZI","IY"],strategy,execution:{threads:2},...(strategy==="explicit"?{gateCuts:[1]}:{}),shots:8192},`reverse-${strategy}`);
      near(a.estimates[0],-1,0.08); near(a.estimates[1],-1,0.08); near(a.estimates[2],0,0.08);
      assert.deepEqual(a.exactExpectations,[-1,-1,0]);
    }
    const skipped=await run({...input,referenceMode:"skip",shots:128},"skip-reference");
    assert.equal(skipped.exactExpectations,null); assert.equal(skipped.reference.status,"not_run");
  });
});
test("real Compact: full-unitary reference, physical-cost distinction and skipped evidence", {skip:!enabled,timeout:300000},async t=>{
  await withTool(t,"compact-optimization",async run=>{
    const a=await run(CANDIDATE_TOOLS[1].input,"phase-gadget");
    assert.equal(a.independentEquivalent,true); assert.ok(a.maxUnitaryDeviation<1e-8);
    assert.doesNotMatch(a.optimizedOpenQasm,/\bcp\(/); assert.match(a.optimizedOpenQasm,/u3\(/);
    assert.equal(a.original.twoQubitGates,2); assert.equal(a.optimized.twoQubitGates,1);
    assert.equal(a.original.cxInCommonBasis,2); assert.equal(a.optimized.cxInCommonBasis,2);
    const reverse={numQubits:3,gates:[{gate:"CX",targets:[2,0]},{gate:"RY",targets:[1],angle:0.37},{gate:"CX",targets:[2,0]}]};
    const b=await run(reverse,"reverse-wire"); assert.equal(b.independentEquivalent,true); assert.equal(b.optimized.twoQubitGates,0);
    const c=await run({...reverse,referenceMode:"skip"},"skip-reference"); assert.equal(c.independentEquivalent,null); assert.equal(c.reference.status,"not_run"); assert.equal(c.upstreamVerification.status,"not_run");
    const d=await run({numQubits:1,gates:[],referenceMode:"required"},"identity"); assert.equal(d.independentEquivalent,true);
  });
});
test("real OpenQARP: complex states, Pauli order, identity offset and honest nonconvergence", {skip:!enabled,timeout:300000},async t=>{
  await withTool(t,"openqarp-excited-states",async run=>{
    const a=await run(CANDIDATE_TOOLS[2].input,"complex-Y");
    near(a.energies[0],-1,1e-6); near(a.energies[1],1,1e-6);
    assert.ok(a.maxEnergyConsistencyError<1e-10); assert.ok(a.overlaps[0][1]<1e-6);
    const input={numQubits:2,terms:[{pauli:"ZI",coefficient:1},{pauli:"IZ",coefficient:2},{pauli:"II",coefficient:3}],states:2,layers:2,maxIterations:250};
    const b=await run(input,"asymmetric-with-offset");
    assert.deepEqual(b.exactEnergies,[0,2]); near(b.energies[0],0,1e-5); near(b.energies[1],2,1e-5);
    assert.ok(b.maxEnergyConsistencyError<1e-10); assert.ok(b.residualVariances.every(x=>x<1e-7));
    const c=await run({...input,maxIterations:1},"budget-exhausted");
    assert.ok(c.optimizer.some(x=>!x.success)); assert.ok(c.residualVariances.some(x=>x>1e-4));
    const d=await run({...CANDIDATE_TOOLS[2].input,referenceMode:"skip"},"skip-spectrum");
    assert.equal(d.exactEnergies,null); assert.equal(d.reference.status,"not_run"); assert.ok(d.maxEnergyConsistencyError<1e-10);
  });
});
test("real cqlib: adapted SDK kernel, analytic reference, training jitter and explicit held-out rows", {skip:!enabled,timeout:300000},async t=>{
  await withTool(t,"cqlib-kernel",async run=>{
    const input=CANDIDATE_TOOLS[3].input;
    const a=await run(input,"held-out-angle");
    assert.deepEqual(a.predictions,[0,1]); assert.deepEqual(a.predictions,a.analyticPredictions);
    near(a.testAccuracy,1); assert.ok(a.maxAnalyticKernelError<1e-12); assert.ok(a.minimumGramEigenvalue>=-1e-12);
    near(a.trainingDiagonalJitter,1e-8,1e-15); a.trainFidelityKernel.forEach((row,i)=>near(row[i],1,1e-12));
    const b=await run({...input,testX:[[0.9,-0.2]],testY:[]},"changed-test-only");
    assert.deepEqual(b.trainFidelityKernel,a.trainFidelityKernel); assert.equal(b.testAccuracy,null);
    const c=await run({trainX:[[0,-0.2,0.4],[0,-0.2,0.4],[1,0.4,-0.3]],trainY:[0,0,1],testX:[[0.5,-0.1,0.2]]},"signed-angle-duplicates");
    assert.ok(c.maxAnalyticKernelError<1e-12); near(c.trainFidelityKernel[0][1],1,1e-12);
  });
});
