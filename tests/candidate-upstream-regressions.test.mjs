import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
const run=promisify(execFile);
const enabled=process.env.OPENQUANTUM_REAL_CANDIDATE_TOOLS==="1";
for (const [id,script,count] of [["compact-optimization","compiler_regressions.py",10],["qec-memory-experiment","qec_burst_regression.py",null]]) {
  test(`real upstream regression corpus: ${script}`,{skip:!enabled,timeout:180000},async()=>{
    const root=process.cwd();
    const {stdout}=await run(path.join(root,".openquantum/python-envs",id,"bin/python"),[path.join(root,"benchmarks/candidate-libraries",script)],{cwd:root,timeout:165000,maxBuffer:4*1024*1024});
    const output=JSON.parse(stdout);assert.equal(output.passed,output.denominator);
    if(count!==null)assert.equal(output.denominator,count);
    await mkdir(path.join(root,".openquantum/candidate-tools-evidence"),{recursive:true});
    await writeFile(path.join(root,".openquantum/candidate-tools-evidence",`${script}.json`),JSON.stringify(output,null,2));
  });
}
